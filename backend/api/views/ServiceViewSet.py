# ServiceViewSet.py
# วางไฟล์นี้ใน: backend/api/views/ServiceViewSet.py
"""
API งานบริการ (ซ่อม / ต่อภาษี+พรบ / อื่นๆ) - แยกขาดจาก /order/ (งานขาย)
  GET    /service/?bike=<id>        ประวัติของรถคันนั้น
  GET    /service/?customer=<id>    รายการของลูกค้าคนนั้น
  GET    /service/<id>/             รายละเอียด
  POST   /service/                  บันทึกรายการใหม่
  DELETE /service/<id>/             ลบ (ไม่แตะรถ/สต็อกใดๆ)
"""
from django.utils import timezone
from rest_framework import serializers, viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import Customer, Bike
from api.models.ServiceRecord import ServiceRecord


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
            'payment_type', 'transfer_bank', 'check_number',
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

        customer = Customer.objects.filter(pk=data.get('customer')).first()
        if not customer:
            return Response({'error': 'กรุณาเลือกลูกค้า'}, status=status.HTTP_400_BAD_REQUEST)

        bike = Bike.objects.filter(pk=data.get('bike')).first()
        if not bike:
            return Response({'error': 'กรุณาเลือกรถ'}, status=status.HTTP_400_BAD_REQUEST)

        transaction_type = data.get('transaction_type', '')
        if transaction_type not in dict(ServiceRecord.TRANSACTION_TYPE_CHOICES):
            return Response({'error': 'ประเภทงานไม่ถูกต้อง'}, status=status.HTTP_400_BAD_REQUEST)

        detail = (data.get('transaction_type_detail') or '').strip()
        if transaction_type == 'อื่นๆ' and not detail:
            return Response({'error': 'กรุณาระบุรายละเอียดประเภทงาน'}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ ยอดรวมคำนวณจากรายการจริงฝั่ง backend เสมอ (ไม่เชื่อ total จาก frontend)
        items = []
        for item in data.get('items') or []:
            desc = str(item.get('description', '')).strip()
            try:
                amount = float(item.get('amount', 0))
            except (TypeError, ValueError):
                amount = 0
            if desc and amount > 0:
                items.append({'description': desc, 'amount': amount})
        if not items:
            return Response({'error': 'กรุณาเพิ่มอย่างน้อย 1 รายการ พร้อมระบุราคา'}, status=status.HTTP_400_BAD_REQUEST)

        mileage_raw = data.get('mileage')
        try:
            mileage = int(mileage_raw) if mileage_raw not in (None, '', 'null') else None
        except (TypeError, ValueError):
            mileage = None

        payment_type = data.get('payment_type', '') or ''
        record = ServiceRecord.objects.create(
            service_date=timezone.now().date(),
            customer=customer,
            bike=bike,  # ✅ ผูกเป็นประวัติอย่างเดียว ไม่แตะ bike.sold
            transaction_type=transaction_type,
            transaction_type_detail=detail if transaction_type == 'อื่นๆ' else '',
            mileage=mileage,
            items=items,
            total=sum(i['amount'] for i in items),
            payment_type=payment_type,
            transfer_bank=(data.get('transfer_bank') or '') if payment_type == 'เงินโอน' else '',
            check_number=(data.get('check_number') or '') if payment_type == 'เช็ค' else '',
            notes=data.get('notes', '') or '',
            created_by=getattr(request.user, 'username', '') or '',
        )

        return Response(
            {'success': True, 'data': record.id, 'record': ServiceRecordSerializer(record).data},
            status=status.HTTP_201_CREATED,
        )