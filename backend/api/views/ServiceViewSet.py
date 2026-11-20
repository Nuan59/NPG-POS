# ServiceViewSet.py
# วางไฟล์นี้ใน: backend/api/views/ServiceViewSet.py
"""
API งานบริการ (ซ่อม / ต่อภาษี+พรบ / อื่นๆ) - แยกขาดจาก /order/ (งานขาย)
  GET    /service/?bike=<id>        ประวัติของรถคันนั้น
  GET    /service/?customer=<id>    รายการของลูกค้าคนนั้น
  GET    /service/<id>/             รายละเอียด
  POST   /service/                  บันทึกรายการใหม่
  DELETE /service/<id>/             ลบ (ไม่แตะรถ/สต็อกใดๆ) + ยกเลิกรายรับอัตโนมัติ (ส่งเงินไปแล้วลบไม่ได้)
  ✅ บันทึกแล้วลง "รายรับ" ในหน้า รายรับ-รายจ่าย ให้อัตโนมัติ (เงินสด / โอน แยกตามรูปแบบการชำระ)
"""
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import Customer, Bike
from api.models.ServiceRecord import ServiceRecord
from api import activity, parts
from api.views.CashflowView import split_payment, sync_auto_income, remove_auto_income, handover_block


class ServiceRecordSerializer(serializers.ModelSerializer):
    customer_id = serializers.IntegerField(source='customer.id', read_only=True, default=None)
    customer = serializers.CharField(source='customer.name', read_only=True, default='')
    customer_phone = serializers.CharField(source='customer.phone', read_only=True, default='')
    customer_address = serializers.SerializerMethodField()
    bike = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRecord
        fields = [
            'id', 'service_date',
            'customer_id', 'customer', 'customer_phone', 'customer_address',
            'bike',
            'transaction_type', 'transaction_type_detail', 'mileage',
            'items', 'total',
            'payment_type', 'transfer_bank', 'check_number', 'cash_amount',
            'notes', 'created_by', 'created_at',
        ]

    def get_customer_address(self, obj):
        c = obj.customer
        if not c:
            return ''
        parts = [getattr(c, a, None) for a in ['address', 'subdistrict', 'district', 'province', 'postal_code']]
        return ' '.join(str(p) for p in parts if p)

    def get_bike(self, obj):
        b = obj.bike
        if not b:
            return None
        return {
            'id': b.id,
            'brand': getattr(b, 'brand', ''),
            'model_name': b.model_name,
            'model_code': b.model_code,
            'chassi': b.chassi,
            'registration_plate': getattr(b, 'registration_plate', ''),
            'color': getattr(b, 'color', ''),
            'category': getattr(b, 'category', ''),
        }


class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceRecordSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = ServiceRecord.objects.select_related('customer', 'bike').all()
        bike = self.request.query_params.get('bike')
        customer = self.request.query_params.get('customer')
        if bike:
            qs = qs.filter(bike_id=bike)
        if customer:
            qs = qs.filter(customer_id=customer)
        return qs.order_by('-service_date', '-id')

    def create(self, request, *args, **kwargs):
        data = request.data
        parts.ensure_tables()

        transaction_type = data.get('transaction_type', '')
        if transaction_type not in dict(ServiceRecord.TRANSACTION_TYPE_CHOICES):
            return Response({'error': 'ประเภทงานไม่ถูกต้อง'}, status=status.HTTP_400_BAD_REQUEST)
        # ✅ ขายอะไหล่หน้าร้าน: ลูกค้า / รถ ไม่บังคับ (ลูกค้าเดินเข้ามาซื้อ)
        is_part_sale = transaction_type == 'ขายอะไหล่'

        customer = Customer.objects.filter(pk=data.get('customer')).first() if data.get('customer') else None
        if not customer and not is_part_sale:
            return Response({'error': 'กรุณาเลือกลูกค้า'}, status=status.HTTP_400_BAD_REQUEST)

        bike = Bike.objects.filter(pk=data.get('bike')).first() if data.get('bike') else None
        if not bike and not is_part_sale:
            return Response({'error': 'กรุณาเลือกรถ'}, status=status.HTTP_400_BAD_REQUEST)

        detail = (data.get('transaction_type_detail') or '').strip()
        if transaction_type == 'อื่นๆ' and not detail:
            return Response({'error': 'กรุณาระบุรายละเอียดประเภทงาน'}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ ยอดรวมคำนวณจากรายการจริงฝั่ง backend เสมอ (ไม่เชื่อ total จาก frontend)
        items = []
        part_items = []  # ✅ อะไหล่จากสต็อก → ตัดสต็อกตอนบันทึก
        for item in data.get('items') or []:
            desc = str(item.get('description', '')).strip()
            try:
                amount = float(item.get('amount', 0))
            except (TypeError, ValueError):
                amount = 0
            part_id = item.get('part_id')
            if part_id:
                try:
                    qty = float(item.get('qty') or 1)
                except (TypeError, ValueError):
                    qty = 0
                if qty <= 0:
                    return Response({'error': f'จำนวนของ {desc or "อะไหล่"} ต้องมากกว่า 0'}, status=status.HTTP_400_BAD_REQUEST)
                if amount < 0:
                    return Response({'error': 'ราคาอะไหล่ต้องไม่ติดลบ'}, status=status.HTTP_400_BAD_REQUEST)
                line = {'description': desc or 'อะไหล่', 'amount': amount, 'part_id': int(part_id), 'qty': qty}
                items.append(line)
                part_items.append(line)
            elif desc and amount > 0:
                items.append({'description': desc, 'amount': amount})
        if not items or sum(i['amount'] for i in items) <= 0:
            return Response({'error': 'กรุณาเพิ่มอย่างน้อย 1 รายการ พร้อมระบุราคา'}, status=status.HTTP_400_BAD_REQUEST)

        mileage_raw = data.get('mileage')
        try:
            mileage = int(mileage_raw) if mileage_raw not in (None, '', 'null') else None
        except (TypeError, ValueError):
            mileage = None

        payment_type = data.get('payment_type', '') or ''
        total = sum(i['amount'] for i in items)

        # ✅ แบ่งจ่าย - ต้องระบุยอดเงินสด มากกว่า 0 และน้อยกว่ายอดรวม
        cash_amount = None
        if payment_type == 'แบ่งจ่าย':
            try:
                cash_amount = float(data.get('cash_amount'))
            except (TypeError, ValueError):
                cash_amount = None
            if cash_amount is None or cash_amount <= 0 or cash_amount >= total:
                return Response({'error': 'แบ่งจ่าย: ยอดเงินสดต้องมากกว่า 0 และน้อยกว่ายอดรวม'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                record = self._create_record(request, data, customer, bike, transaction_type, detail, mileage, items,
                                             total, payment_type, cash_amount)
                if part_items:
                    parts.consume(part_items, 'sale' if is_part_sale else 'service', 'service', record.id,
                                  getattr(request.user, 'name', '') or getattr(request.user, 'username', '') or '')
        except parts.StockError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ รายรับอัตโนมัติ
        label = detail if transaction_type == 'อื่นๆ' and detail else transaction_type
        cash, transfer = split_payment(total, payment_type, cash_amount)
        who = customer.name if customer else 'ลูกค้าหน้าร้าน'
        sync_auto_income(
            'service', record.id, cash, transfer,
            f"รับเงิน · {label} S-{record.id:08d} · {who}",
            getattr(request.user, 'name', '') or getattr(request.user, 'username', '') or '',
        )
        activity.note(request, f"{label} S-{record.id:08d} · {who} · ยอด {total:,.0f} ฿"
                               + (" · อะไหล่: " + ", ".join(f"{i['description']} x{i['qty']:g}" for i in part_items) if part_items else ""))

        return Response(
            {'success': True, 'data': record.id, 'record': ServiceRecordSerializer(record).data},
            status=status.HTTP_201_CREATED,
        )

    def _create_record(self, request, data, customer, bike, transaction_type, detail, mileage, items, total,
                       payment_type, cash_amount):
        return ServiceRecord.objects.create(
            service_date=timezone.now().date(),
            customer=customer,
            bike=bike,  # ✅ ผูกเป็นประวัติอย่างเดียว ไม่แตะ bike.sold
            transaction_type=transaction_type,
            transaction_type_detail=detail if transaction_type == 'อื่นๆ' else '',
            mileage=mileage,
            items=items,
            total=total,
            payment_type=payment_type,
            transfer_bank=(data.get('transfer_bank') or '') if payment_type in ('เงินโอน', 'แบ่งจ่าย') else '',
            cash_amount=cash_amount,
            check_number=(data.get('check_number') or '') if payment_type == 'เช็ค' else '',
            notes=data.get('notes', '') or '',
            created_by=getattr(request.user, 'username', '') or '',
        )

    def destroy(self, request, *args, **kwargs):
        record_id = self.get_object().id
        # ✅ ส่งเงินไปแล้ว ห้ามลบ (ต้องให้ adm ยกเลิกการส่งก่อน)
        blocked = handover_block('service', record_id)
        if blocked:
            return Response({'error': blocked, 'message': blocked}, status=status.HTTP_400_BAD_REQUEST)
        response = super().destroy(request, *args, **kwargs)
        # ✅ อะไหล่ที่ใช้ในรายการนี้ คืนเข้าสต็อก
        parts.ensure_tables()
        parts.restore('service', record_id, getattr(request.user, 'name', '') or getattr(request.user, 'username', '') or '')
        # รายรับอัตโนมัติ: ของวันนี้ลบทิ้ง / ของวันก่อนลงแถว "ยกเลิก" วันนี้แทน
        remove_auto_income('service', record_id, getattr(request.user, 'name', '') or getattr(request.user, 'username', '') or '')
        return response