from rest_framework import viewsets
from api.serializers import BikeSerializer
from api.serializers.BikeSerializer import BikeSourceSerializer
from api.models import Bike, Storage, BikeSource
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import serializers, status
from datetime import date
from rest_framework.permissions import IsAuthenticated


STOCK_CATEGORIES = ('new', 'pre_owned')


def _is_adm(request):
    return str(getattr(request.user, 'role', '') or '').lower() == 'adm'


def _check_source(category, source_id, required=True):
    """คืน Response error ถ้าที่มาไม่ถูกต้อง / None ถ้าใช้ได้"""
    if source_id in (None, '', 'null'):
        if required and category in STOCK_CATEGORIES:
            return Response({'source': ['กรุณาเลือกที่มาของรถ']}, status=status.HTTP_400_BAD_REQUEST)
        return None
    try:
        ok = BikeSource.objects.filter(pk=int(source_id)).exists()
    except (TypeError, ValueError):
        ok = False
    if not ok:
        return Response({'source': ['ไม่พบที่มานี้ในระบบ']}, status=status.HTTP_400_BAD_REQUEST)
    return None


class BikeSourceViewSet(viewsets.ViewSet):
    """
    ที่มาของรถ (ร้าน / ซัพพลายเออร์ที่รับรถมา)
      GET   /bike-sources/        ทุกคน (พนักงานได้แค่โค้ด / adm ได้ชื่อเต็มด้วย)
      POST  /bike-sources/        { code, name? }  ทุกคนเพิ่มได้ - โค้ดตัวพิมพ์ใหญ่ ห้ามซ้ำ (ชื่อเต็มเฉพาะ adm ใส่ได้)
      PATCH /bike-sources/<id>/   { code?, name? }  เฉพาะ adm (เติมชื่อให้โค้ดที่พนักงานเพิ่มไว้)
      DELETE /bike-sources/<id>/  เฉพาะ adm - ลบได้เฉพาะที่มาที่ยังไม่มีรถใช้อยู่
    ✅ จัดการที่เมนู คลัง → แท็บ "ที่มารถ" (หน้าเพิ่มสินค้าเลือกจาก dropdown อย่างเดียว)
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        from django.db.models import Count, Q
        qs = BikeSource.objects.annotate(
            n=Count('bikes'),
            n_stock=Count('bikes', filter=Q(bikes__sold=False)),
        ).order_by('code')
        data = BikeSourceSerializer(qs, many=True, context={'request': request}).data
        for row, src in zip(data, qs):
            row['bike_count'] = src.n            # รถทั้งหมดที่ใช้ที่มานี้
            row['in_stock'] = src.n_stock        # ยังไม่ขาย
            row['sold_count'] = src.n - src.n_stock  # ขายแล้ว
        return Response(data)

    def destroy(self, request, pk=None):
        if not _is_adm(request):
            return Response({'error': 'เฉพาะ adm เท่านั้น'}, status=status.HTTP_403_FORBIDDEN)
        src = get_object_or_404(BikeSource, pk=pk)
        n = Bike.objects.filter(source=src).count()
        if n:
            return Response({'error': f'ลบไม่ได้ มีรถใช้ที่มา {src.code} อยู่ {n} คัน'}, status=status.HTTP_400_BAD_REQUEST)
        src.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @staticmethod
    def _clean_code(raw):
        code = ''.join(str(raw or '').split()).upper()  # ตัดช่องว่างทั้งหมด + ตัวพิมพ์ใหญ่
        if not code:
            return None, 'กรุณากรอกโค้ด'
        if len(code) > 20:
            return None, 'โค้ดยาวได้ไม่เกิน 20 ตัวอักษร'
        return code, None

    def create(self, request):
        code, err = self._clean_code(request.data.get('code'))
        if err:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
        # ✅ พนักงานใส่แค่โค้ด (ชื่อเต็มไม่บันทึก) / adm ใส่ชื่อได้ หรือเติมทีหลังด้วย PATCH
        name = str(request.data.get('name') or '').strip() if _is_adm(request) else ''
        if BikeSource.objects.filter(code__iexact=code).exists():
            return Response({'error': f'โค้ด {code} มีอยู่แล้ว'}, status=status.HTTP_400_BAD_REQUEST)
        src = BikeSource.objects.create(
            code=code, name=name[:200],
            created_by=getattr(request.user, 'name', '') or getattr(request.user, 'username', '') or '',
        )
        return Response(BikeSourceSerializer(src, context={'request': request}).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        if not _is_adm(request):
            return Response({'error': 'เฉพาะ adm เท่านั้น'}, status=status.HTTP_403_FORBIDDEN)
        src = get_object_or_404(BikeSource, pk=pk)
        if 'code' in request.data:
            code, err = self._clean_code(request.data.get('code'))
            if err:
                return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
            if BikeSource.objects.filter(code__iexact=code).exclude(pk=src.pk).exists():
                return Response({'error': f'โค้ด {code} มีอยู่แล้ว'}, status=status.HTTP_400_BAD_REQUEST)
            src.code = code
        if 'name' in request.data:
            src.name = str(request.data.get('name') or '').strip()[:200]
        src.save()
        return Response(BikeSourceSerializer(src, context={'request': request}).data)


class BikeViewSet(viewsets.ModelViewSet):
    """Listing all registered bikes in stock"""
    serializer_class = BikeSerializer
    permission_classes = [IsAuthenticated, ]

    def get_queryset(self):
        queryset = Bike.objects.select_related('source', 'storage_place').order_by('-id')

        storage_id = self.request.query_params.get('storage')
        category = self.request.query_params.get('category')

        if storage_id is not None:
            try:
                filterStorage = Storage.objects.get(pk=storage_id)
                queryset = queryset.filter(storage_place=filterStorage).filter(sold=False)
            except Storage.DoesNotExist:
                return queryset.none()

        if category:
            queryset = queryset.filter(category=category)

        return queryset

    def retrieve(self, request, *args, **kwargs):
        """
        ดูสินค้าชิ้นเดียว - ถ้าขายแล้ว แนบข้อมูลการขายเบื้องต้น (sale_info) มาด้วย
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data

        if instance.sold:
            # ✅ bike.order_set มาจาก Order.bikes = ManyToManyField(Bike) ที่ไม่ได้ตั้ง related_name
            order = (
                instance.order_set
                .select_related('customer', 'seller')
                .order_by('-id')
                .first()
            )
            if order:
                data['sale_info'] = {
                    'order_id': order.id,
                    'customer_name': order.customer.name if order.customer else None,
                    'customer_phone': order.customer.phone if order.customer else None,
                    'sale_date': order.sale_date,
                    'salesperson': order.seller.name if order.seller else None,
                    'payment_method': order.payment_method,
                    'total': order.total,
                }

        return Response(data)

    def create(self, request, *args, **kwargs):
        """Override create to handle duplicate chassi gracefully"""
        chassi = request.data.get('chassi') or request.data.get('chassis', '')
        if chassi and Bike.objects.filter(chassi=chassi).exists():
            return Response(
                {'error': f'Bike with chassi "{chassi}" already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # ✅ รถในสต็อก (ใหม่ / มือสอง) ต้องระบุที่มา - รถลูกค้าที่มาใช้บริการไม่ต้อง
        err = _check_source(request.data.get('category') or 'new', request.data.get('source'), required=True)
        if err:
            return err
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        # ✅ แก้ไขรถ: ถ้าส่งที่มามา ต้องเป็นที่มาที่มีอยู่จริง (รถในสต็อกห้ามล้างที่มาเป็นค่าว่าง)
        if 'source' in request.data:
            instance = self.get_object()
            err = _check_source(request.data.get('category') or instance.category, request.data.get('source'), required=True)
            if err:
                return err
        return super().update(request, *args, **kwargs)

    @action(methods=['POST'], detail=False)
    def import_inventory(self, request):
        bikesImport = request.data.get('bikes', [])
        storageId = request.data.get('storage')

        if not storageId:
            return Response(
                {'error': 'storage field is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        storage = get_object_or_404(Storage, pk=storageId)
        errors = []
        created = []
        # ✅ ที่มา: ไฟล์ใส่เป็นโค้ด (ไม่สนตัวพิมพ์เล็ก/ใหญ่) → แปลงเป็นที่มาในระบบ
        sources = {s.code.upper(): s for s in BikeSource.objects.all()}

        for bike in bikesImport:
            chassi_value = bike.get('chassi') or bike.get('chassis', '')
            source_code = str(bike.get('source_code') or '').strip().upper()
            source = sources.get(source_code)
            if not source:
                errors.append(
                    f'Chassi "{chassi_value}": ' + (f'ไม่พบที่มา "{source_code}" ในระบบ' if source_code else 'ไม่ได้ระบุที่มา') + ' — skipped.'
                )
                continue

            # ✅ ตรวจ duplicate chassi ก่อน insert
            if Bike.objects.filter(chassi=chassi_value).exists():
                errors.append(f'Chassi "{chassi_value}" already exists — skipped.')
                continue

            try:
                newInstance = Bike.objects.create(
                    model_name=bike['model_name'],
                    model_code=bike['model_code'],
                    engine=bike['engine'],
                    chassi=chassi_value,
                    registration_plate=bike.get('registration_plate', ''),
                    old_registration_plate=bike.get('old_registration_plate', '') or None,
                    color=bike.get('color', ''),
                    notes=bike.get('notes', ''),
                    category=bike.get('category', 'new'),
                    sale_price=bike.get('sale_price'),
                    wholesale_price=bike.get('wholesale_price', '') or None,
                    brand=bike.get('brand', 'Honda'),
                    storage_place=storage,
                    source=source,
                    received_date=bike.get('received_date') or date.today(),
                )
                created.append(newInstance.id)
            except Exception as e:
                errors.append(f'Chassi "{chassi_value}": {str(e)}')

        return Response({
            'message': f'{len(created)} bike(s) imported successfully.',
            'created_ids': created,
            'errors': errors,
        }, status=status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS)