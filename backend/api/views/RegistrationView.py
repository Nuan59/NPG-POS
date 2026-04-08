from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from api.models import Order
from api.models.Registration import RegistrationLog  # ✅ import RegistrationLog


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def registration_list(request):
    """รายการทะเบียนทั้งหมด พร้อม filter ตามสถานะ"""
    status_filter = request.query_params.get('status', None)

    orders = Order.objects.select_related('customer', 'seller').prefetch_related('bikes').filter(
        sale_date__isnull=False
    ).order_by('-created_at')

    now = timezone.now()
    result = []

    for order in orders:
        days_passed = None
        is_overdue = False
        if order.created_at:
            days_passed = (now - order.created_at).days
            is_overdue = days_passed > 45

        doc_status = order.doc_status or 'pending'

        if status_filter == 'overdue':
            if not (is_overdue and doc_status != 'completed'):
                continue
        elif status_filter and status_filter != 'all':
            if doc_status != status_filter:
                continue

        bikes = order.bikes.all()
        bike_info = []
        for bike in bikes:
            bike_info.append({
                'id': bike.id,
                'model_name': bike.model_name,
                'model_code': bike.model_code or '',
                'chassis': bike.chassis,
                'engine': bike.engine,
                'registration_plate': bike.registration_plate,
                'color': bike.color,
            })

        result.append({
            'id': order.id,
            'sale_date': order.sale_date,
            'created_at': order.created_at,
            'days_passed': days_passed,
            'is_overdue': is_overdue,
            'doc_status': doc_status,
            'notes': order.notes,
            'customer_name': order.customer.name if order.customer else '-',
            'customer_phone': order.customer.phone if order.customer else '-',
            'seller_name': order.seller.name if order.seller else '-',
            'bikes': bike_info,
            'payment_method': order.payment_method,
        })

    return Response({'data': result})


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_status(request, pk):
    """✅ อัพเดทสถานะทะเบียน + บันทึกประวัติใน DB"""
    try:
        order = Order.objects.get(pk=pk)
    except Order.DoesNotExist:
        return Response({'error': 'ไม่พบ Order'}, status=404)

    new_status = request.data.get('doc_status')
    valid_statuses = ['pending', 'received', 'fixing', 'completed']

    if new_status not in valid_statuses:
        return Response({'error': 'สถานะไม่ถูกต้อง'}, status=400)

    old_status = order.doc_status or 'pending'

    # ✅ บันทึกประวัติเฉพาะเมื่อสถานะเปลี่ยน
    if old_status != new_status:
        RegistrationLog.objects.create(
            order=order,
            from_status=old_status,
            to_status=new_status,
            changed_by=request.user,
        )

    order.doc_status = new_status

    if 'notes' in request.data:
        order.notes = request.data.get('notes', '')

    order.save()

    return Response({
        'success': True,
        'id': order.id,
        'doc_status': order.doc_status,
        'notes': order.notes,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def status_history(request, pk):
    """✅ ดึงประวัติการเปลี่ยนสถานะจาก DB"""
    try:
        order = Order.objects.get(pk=pk)
    except Order.DoesNotExist:
        return Response({'error': 'ไม่พบ Order'}, status=404)

    logs = RegistrationLog.objects.filter(order=order).select_related('changed_by').order_by('-changed_at')

    data = []
    for log in logs:
        data.append({
            'from_status': log.from_status,
            'to_status':   log.to_status,
            'changed_by':  log.changed_by.name if log.changed_by else '-',
            'changed_at':  log.changed_at.isoformat(),
        })

    return Response({
        'order_id':       order.id,
        'current_status': order.doc_status,
        'logs':           data,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def activity_feed(request):
    """
    ✅ ดึง Activity Feed - ประวัติการเปลี่ยนสถานะล่าสุด 20 รายการ
    พร้อมข้อมูลที่ตรงกับ Frontend
    """
    limit = int(request.query_params.get('limit', 20))
    
    # ดึง logs ล่าสุด พร้อม prefetch bikes
    logs = RegistrationLog.objects.select_related(
        'order', 
        'order__customer', 
        'changed_by'
    ).prefetch_related('order__bikes').order_by('-changed_at')[:limit]

    data = []
    for log in logs:
        order = log.order
        bikes = order.bikes.all()
        
        # ✅ เอาข้อมูลรถคันแรก (ถ้ามี) - ส่งในรูปแบบที่ Frontend ต้องการ
        bike_model = ''
        bike_color = ''
        if bikes.exists():
            bike = bikes.first()
            bike_model = bike.model_name or ''
            bike_color = bike.color or ''

        data.append({
            'log_id': log.id,  # ✅ เปลี่ยนจาก 'id' เป็น 'log_id'
            'order_id': order.id,
            'customer_name': order.customer.name if order.customer else '-',
            'bike_model': bike_model,  # ✅ ตรงกับ Frontend
            'bike_color': bike_color,  # ✅ ตรงกับ Frontend
            'from_status': log.from_status,
            'to_status': log.to_status,
            'changed_by': log.changed_by.name if log.changed_by else '-',
            'changed_at': log.changed_at.isoformat(),
        })

    return Response({'data': data})