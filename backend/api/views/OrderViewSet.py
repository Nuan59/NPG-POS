import traceback

from rest_framework import viewsets
from rest_framework.decorators import action
from api.serializers import OrderSerializer, CustomerSerializer
from api.models import Order, Customer, Bike, AdditionalFee, Gift, OrderGift, NPGAccount
from api.util import convert_number
from api import activity
from django.utils.timezone import datetime
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from datetime import datetime, timedelta, date
from rest_framework.permissions import AllowAny
from django.db import connection


# ================== เช็คลิสต์หลังขาย ==================
# ✅ รายการเช็คหลังขาย (ใช้ทุกการขาย สด/ผ่อน) - เพิ่ม/ลด/เรียงใหม่ได้ที่นี่ที่เดียว หน้าเว็บดึงไปแสดงเอง
# optional = มีปุ่ม "ไม่มี" (นับว่าเช็คแล้ว)
# ⚠️ ห้ามเปลี่ยน key ของข้อที่มีอยู่แล้ว (ติ๊กเก่าผูกกับ key) - เปลี่ยนแค่ label ได้
SALE_CHECKLIST_ITEMS = [
    {'key': 'id_card', 'label': 'สำเนาบัตรประชาชน'},
    {'key': 'reg_set', 'label': 'ชุดจดทะเบียน'},
    {'key': 'reg_book', 'label': 'สมุดคุม พรบ. และทะเบียน'},
    {'key': 'insurance', 'label': 'พรบ.', 'optional': True},
    {'key': 'pdi', 'label': 'PDI'},
    {'key': 'mile_sticker', 'label': 'สติ๊กเกอร์ติดไมล์รถ'},
    {'key': 'photo_4', 'label': 'ถ่ายรูปรถทั้ง 4 ด้าน + ลอกลายรถ'},
    {'key': 'photo_pickup', 'label': 'ถ่ายรูปรับรถ'},
]
CHECKLIST_KEYS = {i['key'] for i in SALE_CHECKLIST_ITEMS}
# แถวพิเศษในตารางเดียวกัน = กด "จบรายการ" แล้ว (เก็บชื่อคนกด + เวลา)
CHECKLIST_FINISHED_KEY = '_finished'
CHECKLIST_NOTE_PREFIX = 'เช็คลิสต์ขาด:'


def _is_adm(user):
    return str(getattr(user, 'role', '') or '').lower() in ('adm', 'admin', 'administrator')


def _user_label(user):
    return getattr(user, 'name', '') or getattr(user, 'username', '') or ''


def _checklist_rows(order_id):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT item_key, value, checked_by, checked_at FROM sale_checklist WHERE order_id = %s",
            [order_id],
        )
        return [
            {'item_key': r[0], 'value': r[1], 'checked_by': r[2], 'checked_at': r[3].isoformat() if r[3] else None}
            for r in cursor.fetchall()
        ]


def _checklist_payload(order):
    rows = _checklist_rows(order.id)
    finished = next((r for r in rows if r['item_key'] == CHECKLIST_FINISHED_KEY), None)
    marks = [r for r in rows if r['item_key'] in CHECKLIST_KEYS]
    done = {m['item_key'] for m in marks}
    return {
        'items': SALE_CHECKLIST_ITEMS,
        'marks': marks,
        'missing': [i['label'] for i in SALE_CHECKLIST_ITEMS if i['key'] not in done],
        'finished': finished,
        'sale_status': order.sale_status,
    }


def _sync_checklist_note(order, missing):
    """เขียน/อัปเดต/ลบ บรรทัด "เช็คลิสต์ขาด: ..." ในหมายเหตุของออเดอร์ (บรรทัดอื่นไม่แตะ)"""
    lines = [l for l in (order.notes or '').split('\n') if not l.startswith(CHECKLIST_NOTE_PREFIX)]
    if missing:
        lines.append(f"{CHECKLIST_NOTE_PREFIX} {', '.join(missing)}")
    new_notes = '\n'.join(lines).strip('\n')
    if new_notes != (order.notes or ''):
        order.notes = new_notes
        order.save(update_fields=['notes'])

def _post_sale_income(order, only_if_exists=False):
    """
    รายรับอัตโนมัติของการขาย - ยอดที่ลูกค้าจ่ายวันทำรายการ (ตัวเดียวกับที่ขึ้นค้างส่ง)
    ✅ ลงตอน "ทำรายการ" (ตอนรับเงินจริง) / จบรายการ-แก้ไขรายการ → แก้ยอดตามเฉพาะที่เคยลงไว้ (only_if_exists)
       รายการที่ทำก่อนมีระบบนี้ (พนักงานพิมพ์รายรับเอง) จะไม่ถูกลงซ้ำ
    """
    from api.views.CashHandoverViewSet import _sale_due_today
    from api.views.CashflowView import split_payment, sync_auto_income
    if (order.transaction_type or 'ขาย') != 'ขาย':
        return  # เหมือนระบบส่งเงิน - นับเฉพาะงานขาย
    due = _sale_due_today(order)
    cash, transfer = split_payment(due, order.payment_type, order.cash_amount)
    bike = order.bikes.first()
    desc = f"รับเงิน · ขาย O-{order.id:08d} · {order.customer.name if order.customer else '-'}"
    if bike:
        desc += f" · {bike.model_name}"
    seller = (getattr(order.seller, 'name', '') or getattr(order.seller, 'username', '')) if order.seller else ''
    sync_auto_income('sale', order.id, cash, transfer, desc, seller, only_if_exists=only_if_exists)


def create_down_payment_account(order, overrides=None):
    """
    ✅ สร้างบัญชีผ่อนดาวน์ของออเดอร์ (ใช้ตอนจบรายการ + ปุ่มสร้างย้อนหลังของ adm)
    ข้อมูลมาจาก checkout_extra ที่บันทึกไว้ตอนทำรายการ / overrides = ค่าที่ adm กรอกทับ
    คืน (account, None) ถ้าสำเร็จ / (None, "เหตุผล") ถ้าสร้างไม่ได้ - ไม่ throw
    """
    extra = dict(order.checkout_extra or {})
    extra.update({k: v for k, v in (overrides or {}).items() if v not in (None, '')})

    if (order.finance_provider or '') == 'NPG':
        return None, 'ไฟแนนซ์ NPG ผ่อนดาวน์แยกไม่ได้ (1 รายการขายมีบัญชี NPG ได้บัญชีเดียว)'
    existing = NPGAccount.objects.filter(order=order).first()
    if existing:
        return None, f'รายการขายนี้มีบัญชี NPG #{existing.id} อยู่แล้ว'

    try:
        balance = float(extra.get('down_payment_remaining_balance') or 0)
        count = int(float(extra.get('down_payment_installment_count') or 0))
        rate = float(extra.get('down_payment_interest_rate') or 0)
        per = float(extra.get('down_payment_per_remaining_installment') or 0)
    except (TypeError, ValueError):
        return None, 'ข้อมูลผ่อนดาวน์ไม่ใช่ตัวเลข'

    missing = []
    if count <= 0:
        missing.append('จำนวนงวด')
    if balance <= 0:
        missing.append('ยอดคงเหลือหลังงวดแรก')
    if per <= 0:
        missing.append('ค่างวด')
    if missing:
        return None, 'สร้างบัญชีผ่อนดาวน์ไม่ได้ ข้อมูลไม่ครบ: ' + ', '.join(missing)

    next_str = extra.get('down_payment_next_payment_date') or ''
    try:
        next_date = datetime.strptime(str(next_str)[:10], '%Y-%m-%d').date() if next_str else datetime.today().date() + timedelta(days=30)
    except ValueError:
        return None, f'วันครบกำหนดงวดถัดไปไม่ถูกต้อง ({next_str})'

    try:
        with transaction.atomic():
            acc = NPGAccount.objects.create(
                order=order,
                status='active',
                account_type='down_payment',
                finance_amount=balance,
                interest_rate=rate,
                installment_count=count,
                installment_amount=per,
                period_type='รายเดือน',
                paid_count=0,
                total_paid=0,
                remaining_balance=per * count,
                start_date=datetime.today().date(),
                next_payment_date=next_date,
            )
    except Exception as e:
        traceback.print_exc()
        return None, f'สร้างบัญชีผ่อนดาวน์ไม่สำเร็จ: {e}'

    # เก็บค่าที่ใช้จริงไว้กับออเดอร์ (เผื่อ adm กรอกทับ) - ระบบส่งเงินใช้ยอดนี้หักเงินดาวน์วันนี้
    if overrides:
        extra['down_payment_installment'] = True
        order.checkout_extra = extra
        order.save(update_fields=['checkout_extra'])
    print(f"✅ สร้างบัญชีผ่อนดาวน์ #{acc.id} สำหรับ Order #{order.id}")
    return acc, None


def _finalize_sale(order):
    """
    ✅ ตัดขายจริง (เรียกตอนกด "จบรายการ") - ต้องเรียกภายใน transaction.atomic()
    - รถออกจากสต็อก (sold=True) / ตัดสต็อกของแถม
    - สร้างบัญชี NPG (ไฟแนนซ์ NPG) หรือบัญชีผ่อนดาวน์ (ไฟแนนซ์เจ้าอื่น)
    - sale_status = completed → นับเป็นยอดขาย / รายงาน / เงินสดค้างส่ง / งานทะเบียน
    คืนข้อความ error (str) ถ้าตัดขายไม่ได้ / None ถ้าสำเร็จ
    """
    if order.sale_status == 'completed':
        return None

    bikes = list(Bike.objects.select_for_update().filter(pk__in=order.bikes.values_list('id', flat=True)))
    for b in bikes:
        if b.sold:
            return f'{b.model_name} ถูกขายไปแล้ว (ตัดขายซ้ำไม่ได้)'
    for b in bikes:
        b.sold = True
        b.save(update_fields=['sold'])

    for og in order.gifts.select_related('item').all():
        if og.item:
            og.item.stock -= og.quantity or 0
            og.item.save()

    extra = order.checkout_extra or {}
    finance_provider = order.finance_provider or ''
    finance_amount = float(order.finance_amount or 0)
    interest_rate = float(order.interest_rate or 0)
    installment_count = int(order.installment_count or 0)
    installment_amount = float(order.installment_amount or 0)
    npg_period = order.npg_period or 'รายเดือน'
    down_payment_installment = extra.get('down_payment_installment', False)
    # ✅ ปัญหาที่ไม่ทำให้การตัดขายพัง แต่ต้องบอกพนักงาน (เช่น สร้างบัญชีผ่อนดาวน์ไม่สำเร็จ) - เดิมเงียบหาย
    warnings = []
    order._finalize_warnings = warnings

    # สร้าง NPG Account ถ้าเป็นไฟแนนซ์ NPG
    if finance_provider == 'NPG' and finance_amount > 0:
        try:
            # ✅ จำนวนเดือนของสัญญา = จำนวนงวด x (1 งวดกี่เดือน)
            # รายวัน = 1/30, รายสัปดาห์ = 7/30, รายเดือน = 1, รายปี = 12
            total_months = installment_count * NPGAccount.months_per_period(npg_period)
            total_with_interest_raw = finance_amount + (
                finance_amount * (interest_rate / 100) * total_months
            )

            # ✅ ใช้ installment_amount (ที่ frontend ปัดเศษเป็นจำนวนเต็มแล้ว) x จำนวนงวด
            # แทนยอดดิบที่มีเศษทศนิยม เพื่อให้จ่ายครบทุกงวดแล้วเหลือ 0 พอดี ไม่มีเศษค้าง
            remaining_balance_final = installment_amount * installment_count

            # ✅ งวดแรกครบกำหนดตามรอบตัด - รายวัน +1 / รายสัปดาห์ +7 / รายเดือน +30 / รายปี +365 วัน
            first_due_days = NPGAccount.days_per_period(npg_period)

            # savepoint - ถ้าสร้างบัญชีพัง ไม่ให้ทั้ง transaction ของการตัดขายเสีย
            with transaction.atomic():
                NPGAccount.objects.create(
                    order=order,
                    status='active',
                    account_type='finance',
                    finance_amount=finance_amount,
                    interest_rate=interest_rate,
                    installment_count=installment_count,
                    installment_amount=installment_amount,
                    period_type=npg_period,  # ✅ ใช้ค่าจริงจาก frontend แทนการ hardcode
                    paid_count=0,
                    total_paid=0,
                    remaining_balance=remaining_balance_final,
                    start_date=datetime.today().date(),
                    next_payment_date=datetime.today().date() + timedelta(days=first_due_days),
                )
            print(f"✅ สร้าง NPG Account สำหรับ Order #{order.id} (period={npg_period}, remaining={remaining_balance_final}, raw={total_with_interest_raw})")
        except Exception as e:
            print(f"❌ ไม่สามารถสร้าง NPG Account: {str(e)}")
            warnings.append(f"สร้างบัญชี NPG ไม่สำเร็จ: {e}")

    # ✅ สร้างบัญชีผ่อนดาวน์ (account_type='down_payment') - เฉพาะกรณีไฟแนนซ์รถกับเจ้าอื่น
    # ที่ไม่ใช่ NPG เท่านั้น เพราะ NPGAccount ผูกกับ Order แบบ OneToOneField (1 order = 1 บัญชี)
    # ⚠️ ห้ามลบเงื่อนไข finance_provider != 'NPG' ออก ไม่งั้นจะพังเหมือนที่เคยเกิดมาก่อน
    if down_payment_installment and finance_provider != 'NPG':
        _acc, msg = create_down_payment_account(order)
        if msg:
            warnings.append(msg)

    order.sale_status = 'completed'
    order.save(update_fields=['sale_status'])
    return None


class OrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet สำหรับจัดการ Order (คำสั่งซื้อ)
    
    ฟิลด์การชำระเงิน:
    - payment_method: ประเภทการซื้อ (เดิม: การชำระเงิน)
    - payment_type: รูปแบบการชำระ (เดิม: ชำระด้วย)
    """
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """ดึงรายการ Order พร้อม filter"""
        # ✅ เฉพาะงานขาย - งานซ่อม/ต่อภาษี/อื่นๆ ย้ายไปอยู่ที่ /service/ (ServiceViewSet) แล้ว
        queryset = Order.objects.filter(transaction_type='ขาย').order_by('-id')
        
        customer = self.request.query_params.get('customer')
        startDate = self.request.query_params.get('startDate')
        endDate = self.request.query_params.get('endDate')
        bike = self.request.query_params.get('bike')
        
        if customer is not None:
            filtercustomer = get_object_or_404(Customer, pk=customer)
            queryset = queryset.filter(customer=filtercustomer)
        if startDate is not None and endDate is not None:
            queryset = queryset.filter(sale_date__range=[startDate, endDate])
        if bike is not None:
            queryset = queryset.filter(bikes__id=bike)
            
        return queryset
    

    def create(self, request):
        """
        สร้าง Order ใหม่
        
        ฟิลด์ที่รับจาก Frontend:
        - customer: ID ของลูกค้า
        - bikes: รายการรถที่ซื้อ
        - additional_fees: ค่าใช้จ่ายเพิ่มเติม
        - gifts: ของแถม
        - sale_price: ราคาสินค้า
        - deposit: มัดจำ
        - down_payment: เงินดาวน์
        - discount: ส่วนลด
        - finance_amount: ยอดจัด
        - interest_rate: ดอกเบี้ย
        - installment_count: จำนวนงวด
        - installment_amount: ค่างวด
        - finance_provider: บริษัทไฟแนนซ์
        - payment_method: ประเภทการซื้อ (UI: "ประเภทการซื้อ")
        - payment_type: รูปแบบการชำระ (UI: "รูปแบบการชำระ")
        - transfer_bank: ธนาคารโอน
        - check_number: เลขที่เช็ค
        - notes: หมายเหตุ
        - down_payment_installment: ผ่อนดาวน์หรือไม่ (true/false)
        - down_payment_first_installment: งวดแรกที่ชำระวันนี้
        - down_payment_remaining_balance: ยอดคงเหลือหลังงวดแรก
        - down_payment_installment_count: จำนวนงวดที่เหลือ
        - down_payment_interest_rate: ดอกเบี้ยผ่อนดาวน์ (%/เดือน)
        - down_payment_per_remaining_installment: ค่างวดถัดไป (งวดที่ 2 เป็นต้นไป)
        """
        try:
            customer = Customer.objects.filter(pk=request.data["customer"])[0]

            # รับข้อมูลจาก Frontend
            additional_fees_total = sum([float(fee.get('amount', 0)) for fee in request.data.get('additional_fees', [])])
            down_payment = float(request.data.get('down_payment', 0))
            discount = float(request.data.get('discount', 0))
            deposit = float(request.data.get('deposit', 0))
            sale_price = float(request.data.get('sale_price', 0))
            
            # คำนวณยอดรวม
            calculated_total = additional_fees_total + down_payment - discount - deposit

            # ข้อมูลไฟแนนซ์
            finance_amount = float(request.data.get('finance_amount', 0))
            interest_rate = float(request.data.get('interest_rate', 0))
            installment_count = int(request.data.get('installment_count', 0))
            installment_amount = float(request.data.get('installment_amount', 0))
            finance_provider = request.data.get('finance_provider', '')
            npg_period = request.data.get('npg_period') or 'รายเดือน'  # ✅ รายวัน/รายสัปดาห์/รายเดือน/รายปี จาก frontend

            # วิธีการชำระเงิน
            payment_method = request.data.get('payment_method', '')  # ประเภทการซื้อ
            payment_type = request.data.get('payment_type', '')  # รูปแบบการชำระ
            transfer_bank = request.data.get('transfer_bank', '')
            check_number = request.data.get('check_number', '')
            # ✅ แบ่งจ่าย - ยอดส่วนที่เป็นเงินสด (ที่เหลือคือเงินโอน)
            cash_amount_raw = request.data.get('cash_amount')
            cash_amount = float(cash_amount_raw) if payment_type == 'แบ่งจ่าย' and cash_amount_raw not in (None, '') else None

            # ✅ ผ่อนดาวน์
            down_payment_installment = request.data.get('down_payment_installment', False)

            # ✅ ประเภทธุรกรรม + เลขไมล์ (เดิม frontend ส่งมาแต่ backend ไม่เคยอ่าน/บันทึกเลย)
            transaction_type = request.data.get('transaction_type', 'ขาย')
            transaction_type_detail = request.data.get('transaction_type_detail', '')
            mileage_raw = request.data.get('mileage')
            mileage = int(mileage_raw) if mileage_raw not in (None, '', 'null') else None

            # ✅ กันขายรถคันเดียวซ้ำ: รถต้องยังไม่ขาย และไม่ได้อยู่ในรายการอื่นที่ "รอจบ"
            bikes_to_add = []
            for bike in request.data['bikes']:
                instance = Bike.objects.filter(pk=bike['id']).first()
                if not instance:
                    return Response({'status': 'error', 'message': 'ไม่พบรถคันนี้ในระบบ'}, status=400)
                if instance.sold:
                    return Response({'status': 'error', 'message': f'{instance.model_name} ขายไปแล้ว'}, status=400)
                pending = Order.objects.filter(sale_status='pending', bikes=instance).first()
                if pending:
                    return Response({
                        'status': 'error',
                        'message': f'{instance.model_name} อยู่ในรายการรอจบ #{pending.id} แล้ว (จบหรือลบรายการนั้นก่อน)',
                    }, status=400)
                bikes_to_add.append(instance)

            # ✅ ข้อมูลที่ต้องใช้ตอน "จบรายการ" (สร้างบัญชี NPG / ผ่อนดาวน์) - เก็บไว้กับออเดอร์
            checkout_extra = {
                'down_payment_installment': bool(down_payment_installment) and down_payment_installment not in ('false', 'False', '0'),
                'down_payment_remaining_balance': request.data.get('down_payment_remaining_balance', 0),
                'down_payment_installment_count': request.data.get('down_payment_installment_count', 0),
                'down_payment_interest_rate': request.data.get('down_payment_interest_rate', 0),
                'down_payment_per_remaining_installment': request.data.get('down_payment_per_remaining_installment', 0),
                'down_payment_next_payment_date': request.data.get('down_payment_next_payment_date', ''),
            }

            # สร้าง Order (สถานะ "รอจบ" - ยังไม่นับเป็นยอดขาย)
            with transaction.atomic():
                new_order = Order.objects.create(
                    sale_date=datetime.today(),
                    customer=customer,
                    seller=request.user,

                    total_price=calculated_total,
                    sale_price=sale_price,
                    deposit=deposit,
                    discount=discount,
                    down_payment=down_payment,
                    total=calculated_total,

                    # ข้อมูลไฟแนนซ์
                    finance_amount=finance_amount,
                    interest_rate=interest_rate,
                    installment_count=installment_count,
                    installment_amount=installment_amount,
                    finance_provider=finance_provider,
                    # ✅ เก็บรอบชำระเป็นของ Order เอง (ไม่ต้องพึ่ง NPGAccount อีกต่อไป)
                    npg_period=npg_period if finance_provider == 'NPG' else None,

                    # วิธีการชำระเงิน
                    payment_method=payment_method,  # ประเภทการซื้อ
                    payment_type=payment_type,  # รูปแบบการชำระ
                    transfer_bank=transfer_bank,
                    check_number=check_number,
                    cash_amount=cash_amount,
                    
                    notes=request.data.get('notes', ''),
                    registration_status='CPL',
                    has_checkout=True,

                    # ✅ ประเภทธุรกรรม + เลขไมล์
                    transaction_type=transaction_type,
                    transaction_type_detail=transaction_type_detail,
                    mileage=mileage,

                    # ✅ รอจบรายการ - ตัดขายจริงตอนกด "จบรายการ" ที่หน้าเอกสาร
                    sale_status='pending',
                    checkout_extra=checkout_extra,
                )

                # เพิ่มรถ - ✅ ยังไม่ตัดสต็อก (รถออกจากสต็อกตอนกด "จบรายการ")
                for instance in bikes_to_add:
                    new_order.bikes.add(instance)

                # เพิ่มค่าใช้จ่ายเพิ่มเติม
                for fee in request.data['additional_fees']:
                    instance = AdditionalFee.objects.create(
                        description=fee["description"],
                        amount=fee['amount']
                    )
                    new_order.additional_fees.add(instance)
                    instance.save()

                # เพิ่มของแถม
                for gift in request.data['gifts']:
                    gift_instance = Gift.objects.filter(pk=gift['id'])[0]
                    # ✅ ยังไม่ตัดสต็อกของแถม - ตัดตอนกด "จบรายการ"

                    order_gift = OrderGift.objects.create(
                        item=gift_instance,
                        quantity=gift["amount"]
                    )
                    new_order.gifts.add(order_gift)
                    order_gift.save()

                new_order.save()

            # ✅ ลงรายรับอัตโนมัติตั้งแต่ทำรายการ (ลูกค้าจ่ายเงินแล้ว) - พังก็ไม่กระทบการทำรายการ
            try:
                _post_sale_income(new_order)
            except Exception as e:
                print(f"⚠️ ลงรายรับอัตโนมัติไม่สำเร็จ Order #{new_order.id}: {e}")

            return Response({"success": True, "data": new_order.id})
        
        except Exception as e:
            print(f"❌ Error in create: {str(e)}")
            return Response({
                'status': 'error',
                'message': f'ไม่สามารถสร้างรายการขายได้: {str(e)}'
            }, status=500)


    def update(self, request, *args, **kwargs):
        """
        แก้ไข Order
        
        ฟิลด์ที่แก้ไขได้:
        - notes: หมายเหตุ
        - paymentMethod: ประเภทการซื้อ
        - discount: ส่วนลด
        - downPayment: เงินดาวน์
        - bikePrice: ราคารถ
        - additionalFees: ค่าใช้จ่ายเพิ่มเติม
        """
        try:
            order_to_edit = Order.objects.get(pk=kwargs['pk'])
            # ✅ ยอดรับวันนี้ก่อนแก้ - ถ้าเปลี่ยน รายรับอัตโนมัติแก้ตาม / ถ้าส่งเงินไปแล้วห้ามเปลี่ยนยอด
            from api.views.CashHandoverViewSet import _sale_due_today
            from api.views.CashflowView import handover_block
            due_before = _sale_due_today(order_to_edit)

            with transaction.atomic():

                new_total = 0
            
                # แก้ไขฟิลด์เดี่ยว
                order_to_edit.notes = request.data.get('notes', '')
                order_to_edit.payment_method = request.data.get('paymentMethod', '')  # ประเภทการซื้อ
                order_to_edit.discount = request.data.get('discount', 0)
                order_to_edit.down_payment = request.data.get('downPayment', 0)

                # แก้ไขวันที่ขาย
                sale_date = request.data.get('sale_date')
                if sale_date:
                    order_to_edit.sale_date = sale_date

                # แก้ไขวันหมดอายุทะเบียน
                registration_expiry_date = request.data.get('registration_expiry_date')
                if registration_expiry_date:
                    order_to_edit.registration_expiry_date = registration_expiry_date
                elif registration_expiry_date == '' or registration_expiry_date is None:
                    order_to_edit.registration_expiry_date = None

                # แก้ไขข้อมูลไฟแนนซ์
                order_to_edit.deposit = request.data.get('deposit', order_to_edit.deposit)
                order_to_edit.finance_amount = request.data.get('finance_amount', order_to_edit.finance_amount)
                order_to_edit.interest_rate = request.data.get('interest_rate', order_to_edit.interest_rate)
                order_to_edit.installment_count = request.data.get('installment_count', order_to_edit.installment_count)
                order_to_edit.installment_amount = request.data.get('installment_amount', order_to_edit.installment_amount)
                order_to_edit.finance_provider = request.data.get('finance_provider', order_to_edit.finance_provider)
                # ✅ แก้ไขรอบชำระ NPG (ถ้ามีส่งมา)
                if 'npgPeriod' in request.data:
                    order_to_edit.npg_period = request.data.get('npgPeriod') or None
                elif 'npg_period' in request.data:
                    order_to_edit.npg_period = request.data.get('npg_period') or None

                # แก้ไขราคารถ
                bike_to_edit = order_to_edit.bikes.all()[0]
                bike_to_edit.sale_price = request.data.get('bikePrice', bike_to_edit.sale_price)
                bike_to_edit.save()

                # แก้ไขค่าใช้จ่ายเพิ่มเติม
                for old_fee in order_to_edit.additional_fees.all():
                    order_to_edit.additional_fees.remove(old_fee)
                    old_fee.delete()

                for new_fee in request.data.get('additionalFees', []):
                    create_fee = AdditionalFee.objects.create(
                        description=new_fee['description'],
                        amount=new_fee['amount']
                    )
                    order_to_edit.additional_fees.add(create_fee)
                    new_total += float(create_fee.amount)
                    create_fee.save()

                # สูตร: ค่าใช้จ่าย + เงินดาวน์ - ส่วนลด
                new_total = new_total + float(order_to_edit.down_payment) - float(order_to_edit.discount)

                order_to_edit.total = new_total
                order_to_edit.total_price = new_total
                order_to_edit.save()

                order_to_edit.refresh_from_db()
                if _sale_due_today(order_to_edit) != due_before:
                    blocked = handover_block('sale', order_to_edit.id)
                    if blocked:
                        transaction.set_rollback(True)
                        return Response({'status': 'error', 'message': f'แก้ยอดเงินไม่ได้: {blocked}', 'error': blocked}, status=400)
                    _post_sale_income(order_to_edit, only_if_exists=True)

            return Response({'message': 'order edited!'}, status=200)
        
        except Order.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'ไม่พบรายการขายที่ต้องการแก้ไข'
            }, status=404)
        except Exception as e:
            print(f"❌ Error in update: {str(e)}")
            return Response({
                'status': 'error',
                'message': f'ไม่สามารถแก้ไขรายการขายได้: {str(e)}'
            }, status=500)


    def destroy(self, request, *args, **kwargs):
        """
        ลบ Order พร้อม 2 โหมด:
        - restore_stock=true: ยกเลิกการขาย (คืนสินค้าเข้าสต็อก)
        - restore_stock=false: ลบรายการขาย (ไม่คืนสินค้า)
        
        Parameters:
            restore_stock (query param): 'true' หรือ 'false' (default: 'false')
        """
        try:
            order_to_delete = Order.objects.get(pk=kwargs['pk'])
        except Order.DoesNotExist:
            return Response({
                'status': 'error', 
                'message': 'ไม่พบรายการขายที่ต้องการลบ'
            }, status=404)
        except Exception as e:
            return Response({
                'status': 'error', 
                'message': f'เกิดข้อผิดพลาด: {str(e)}'
            }, status=400)

        try:
            _b = order_to_delete.bikes.first()
            activity.note(request, f"รายการขาย #{order_to_delete.id} {order_to_delete.customer.name if order_to_delete.customer else '-'}"
                                   f"{' · ' + _b.model_name if _b else ''} · ยอด {float(order_to_delete.total or 0):,.0f} ฿"
                                   f" · คืนสต็อก: {request.query_params.get('restore_stock', 'false')}")
        except Exception:
            pass

        # ✅ ส่งเงินไปแล้ว ห้ามลบ (ไม่งั้นรายรับหาย แต่แถวส่งเงินยังอยู่ ลิ้นชักติดลบ)
        from api.views.CashflowView import handover_block, remove_auto_income
        blocked = handover_block('sale', order_to_delete.id)
        if blocked:
            return Response({'status': 'error', 'message': blocked, 'error': blocked}, status=400)

        # อ่าน parameter restore_stock (default = false)
        restore_stock_param = request.query_params.get('restore_stock', 'false')
        restore_stock = restore_stock_param.lower() == 'true'

        try:
            with transaction.atomic():
                # จัดการกับสินค้าตาม mode
                bikes_count = 0
                if restore_stock:
                    # โหมด: ยกเลิกการขาย (คืนสินค้าเข้าสต็อก)
                    for bike in order_to_delete.bikes.all():
                        bike.sold = False
                        bike.save()
                        bikes_count += 1
                    print(f"✅ คืนสินค้า {bikes_count} คันกลับเข้าสต็อก")
                else:
                    # โหมด: ลบรายการขาย (ไม่คืนสินค้า)
                    bikes_count = order_to_delete.bikes.count()
                    print(f"⚠️ ลบรายการโดยไม่คืนสินค้า ({bikes_count} คันยังคง sold=True)")

                # ลบค่าใช้จ่ายเพิ่มเติม
                for fee in order_to_delete.additional_fees.all():
                    fee.delete()
                
                # ลบของแถม (ไม่คืนสต็อก)
                for gift in order_to_delete.gifts.all():
                    gift.delete()
                
                # ✅ รายรับอัตโนมัติ: ของวันนี้ลบทิ้ง / ของวันก่อนลงแถว "ยกเลิก" วันนี้แทน
                remove_auto_income('sale', order_to_delete.id, _user_label(request.user))

                # เก็บข้อมูลก่อนลบ
                order_id = order_to_delete.id
                customer_name = order_to_delete.customer.name if order_to_delete.customer else "ไม่ระบุ"
                
                # ลบออเดอร์
                order_to_delete.delete()
                
                # Response
                action_text = "ยกเลิกการขายและคืนสินค้า" if restore_stock else "ลบรายการขาย"
                stock_info = f"คืนสินค้า {bikes_count} คันเข้าสต็อก" if restore_stock else f"ไม่คืนสินค้า ({bikes_count} คัน)"
                
                return Response({
                    'status': 'success', 
                    'message': f'{action_text}สำเร็จ',
                    'details': {
                        'order_id': order_id,
                        'customer': customer_name,
                        'restored_stock': restore_stock,
                        'bikes_count': bikes_count,
                        'stock_info': stock_info
                    }
                }, status=200)
                
        except Exception as e:
            print(f"❌ Error in destroy: {str(e)}")
            return Response({
                'status': 'error', 
                'message': f'ไม่สามารถลบรายการขายได้: {str(e)}'
            }, status=500)


    @action(methods=['GET'], detail=False)
    def latest(self, request):
        """Return 4 last sales"""
        queryset = self.get_queryset().filter(sale_status='completed')[:4]  # ✅ ไม่นับรายการรอจบ
        serializer = OrderSerializer(queryset, many=True)
        return Response(serializer.data)


    # ✅ เพิ่ม endpoint ดึง Order ที่ทะเบียนกำลังหมดอายุ
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def registration_expiring(self, request):
        """
        ดึง Order ที่ทะเบียนกำลังหมดอายุ
        - ภายใน 3 เดือน (90 วัน) = warning
        - ภายใน 1 เดือน (30 วัน) = critical
        """
        today = date.today()
        
        # Order ที่มีวันหมดอายุทะเบียน และยังไม่หมดอายุ
        orders = Order.objects.filter(
            registration_expiry_date__isnull=False,
            registration_expiry_date__gte=today
        ).select_related('customer').prefetch_related('bikes')
        
        expiring_soon = []
        
        for order in orders:
            days_until_expiry = (order.registration_expiry_date - today).days
            
            # กรองเฉพาะที่อยู่ใน 90 วัน
            if 0 <= days_until_expiry <= 90:
                # ข้อมูลรถ
                bike = order.bikes.first() if order.bikes.exists() else None
                
                order_data = {
                    'id': order.id,
                    'customer': {
                        'id': order.customer.id if order.customer else None,
                        'name': order.customer.name if order.customer else None,
                        'phone': order.customer.phone if order.customer else None,
                    } if order.customer else None,
                    'bike': {
                        'id': bike.id,
                        'model_name': bike.model_name,
                        'model_code': bike.model_code,
                        'registration_plate': bike.registration_plate,
                    } if bike else None,
                    'registration_expiry_date': order.registration_expiry_date.isoformat(),
                    'days_until_expiry': days_until_expiry,
                    'urgency': 'critical' if days_until_expiry <= 30 else 'warning',
                }
                expiring_soon.append(order_data)
        
        # เรียงตามความเร่งด่วน (น้อยไปมาก)
        expiring_soon.sort(key=lambda x: x['days_until_expiry'])
        
        return Response(expiring_soon)

    @action(methods=['GET', 'POST', 'DELETE'], detail=True)
    def checklist(self, request, *args, **kwargs):
        """
        เช็คลิสต์หลังขาย
        GET    /order/{id}/checklist/                         -> {items, marks, missing, finished}
        POST   /order/{id}/checklist/ {item_key, value}       -> ติ๊ก (value = "done" | "na") ทุกคนติ๊กได้
        DELETE /order/{id}/checklist/?item_key=xxx            -> เอาติ๊กออก (adm เท่านั้น)
        ถ้ากดจบรายการไปแล้ว บรรทัด "เช็คลิสต์ขาด" ในหมายเหตุจะอัปเดตตามทุกครั้ง
        """
        order = self.get_object()

        if request.method == 'POST':
            item_key = request.data.get('item_key')
            value = request.data.get('value') or 'done'
            item = next((i for i in SALE_CHECKLIST_ITEMS if i['key'] == item_key), None)
            if not item:
                return Response({'error': 'ไม่พบรายการเช็คลิสต์นี้'}, status=400)
            if value not in ('done', 'na') or (value == 'na' and not item.get('optional')):
                return Response({'error': 'ค่าไม่ถูกต้อง'}, status=400)
            with connection.cursor() as cursor:
                # ติ๊กซ้ำ (กดพร้อมกัน 2 เครื่อง) ไม่ทับของคนแรก
                cursor.execute(
                    """
                    INSERT INTO sale_checklist (order_id, item_key, value, checked_by, checked_at)
                    VALUES (%s, %s, %s, %s, NOW())
                    ON CONFLICT (order_id, item_key) DO NOTHING
                    """,
                    [order.id, item_key, value, _user_label(request.user)],
                )

        elif request.method == 'DELETE':
            if not _is_adm(request.user):
                return Response({'error': 'เอาติ๊กออกได้เฉพาะ adm'}, status=403)
            item_key = request.query_params.get('item_key') or request.data.get('item_key')
            if item_key not in CHECKLIST_KEYS:
                return Response({'error': 'ไม่พบรายการเช็คลิสต์นี้'}, status=400)
            with connection.cursor() as cursor:
                cursor.execute(
                    "DELETE FROM sale_checklist WHERE order_id = %s AND item_key = %s",
                    [order.id, item_key],
                )

        payload = _checklist_payload(order)
        if request.method != 'GET' and payload['finished']:
            _sync_checklist_note(order, payload['missing'])
        return Response(payload)

    @action(methods=['POST'], detail=True)
    def checklist_finish(self, request, *args, **kwargs):
        """
        กด "จบรายการ" = ตัดขายจริง - จบได้แม้เช็คไม่ครบ แต่จะเขียนข้อที่ขาดลงหมายเหตุของออเดอร์
        POST /order/{id}/checklist_finish/
        """
        order = self.get_object()
        was_pending = order.sale_status == 'pending'
        with transaction.atomic():
            # ✅ ตัดขายจริงตรงนี้ (รถออกจากสต็อก / บัญชี NPG / นับยอดขาย)
            error = _finalize_sale(order)
            if error:
                transaction.set_rollback(True)
                return Response({'error': error}, status=400)
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO sale_checklist (order_id, item_key, value, checked_by, checked_at)
                    VALUES (%s, %s, 'done', %s, NOW())
                    ON CONFLICT (order_id, item_key) DO NOTHING
                    """,
                    [order.id, CHECKLIST_FINISHED_KEY, _user_label(request.user)],
                )
            # ✅ รายรับลงไปแล้วตั้งแต่ทำรายการ - ตรงนี้แค่เช็คยอดให้ตรงอีกรอบ (เฉพาะที่เคยลงอัตโนมัติไว้)
            if was_pending:
                try:
                    with transaction.atomic():
                        _post_sale_income(order, only_if_exists=True)
                except Exception as e:  # ไม่ให้การจบรายการพัง
                    print(f"⚠️ แก้ยอดรายรับอัตโนมัติไม่สำเร็จ Order #{order.id}: {e}")
        payload = _checklist_payload(order)
        _sync_checklist_note(order, payload['missing'])
        # ✅ ตัดขายสำเร็จ แต่มีปัญหาที่ต้องบอก (เช่น สร้างบัญชีผ่อนดาวน์ไม่ได้) → หน้าเว็บโชว์เตือน
        payload['warnings'] = list(getattr(order, '_finalize_warnings', []) or [])
        bike = order.bikes.first()
        activity.note(request, f"รายการขาย #{order.id} {order.customer.name if order.customer else '-'}"
                               f"{' · ' + bike.model_name if bike else ''} · ยอด {float(order.total or 0):,.0f} ฿"
                               + (f" · ⚠️ {'; '.join(payload['warnings'])}" if payload['warnings'] else ""))
        return Response(payload)

    @action(methods=['GET', 'POST'], detail=True, url_path='down_payment')
    def down_payment_account(self, request, *args, **kwargs):
        """
        ✅ สถานะบัญชีผ่อนดาวน์ของรายการขาย
        GET  /order/{id}/down_payment/   → ขอผ่อนดาวน์ไหม / มีบัญชีแล้วหรือยัง / ข้อมูลที่บันทึกไว้
        POST /order/{id}/down_payment/   (adm) สร้างบัญชีผ่อนดาวน์ย้อนหลัง - ใช้ข้อมูลเดิม หรือกรอกทับได้:
             { remaining_balance?, installment_count?, interest_rate?, per_installment?, next_payment_date? }
        """
        order = self.get_object()
        if request.method == 'POST':
            role = str(getattr(request.user, 'role', '') or '').lower()
            if role not in ('adm', 'admin', 'administrator'):
                return Response({'error': 'เฉพาะผู้ดูแลระบบ'}, status=403)
            if order.sale_status != 'completed':
                return Response({'error': 'รายการยังไม่จบ - กด "จบรายการ" ก่อน ระบบจะสร้างบัญชีผ่อนดาวน์ให้เอง'}, status=400)
            d = request.data
            overrides = {
                'down_payment_remaining_balance': d.get('remaining_balance'),
                'down_payment_installment_count': d.get('installment_count'),
                'down_payment_interest_rate': d.get('interest_rate'),
                'down_payment_per_remaining_installment': d.get('per_installment'),
                'down_payment_next_payment_date': d.get('next_payment_date'),
            }
            acc, msg = create_down_payment_account(order, overrides)
            if msg:
                return Response({'error': msg}, status=400)
            return Response({'message': 'สร้างบัญชีผ่อนดาวน์แล้ว', 'account_id': acc.id})

        extra = order.checkout_extra or {}
        acc = NPGAccount.objects.filter(order=order).first()
        return Response({
            'requested': bool(extra.get('down_payment_installment')),
            'sale_status': order.sale_status,
            'finance_provider': order.finance_provider or '',
            'account_id': acc.id if acc else None,
            'account_type': acc.account_type if acc else None,
            'data': {
                'remaining_balance': extra.get('down_payment_remaining_balance') or 0,
                'installment_count': extra.get('down_payment_installment_count') or 0,
                'interest_rate': extra.get('down_payment_interest_rate') or 0,
                'per_installment': extra.get('down_payment_per_remaining_installment') or 0,
                'next_payment_date': extra.get('down_payment_next_payment_date') or '',
            },
        })

    @action(methods=['GET'], detail=True)
    def receipt(self, request, *args, **kwargs):
        """Returns sale receipt data"""
        order = self.get_object()
        customer = order.customer

        serialized_order = OrderSerializer(order, many=False)
        serialized_customer = CustomerSerializer(customer, many=False)
        value_text = convert_number(order.total)

        return Response({
            'customer': serialized_customer.data, 
            'order': serialized_order.data, 
            'amount_text': value_text
        })