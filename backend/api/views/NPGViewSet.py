from decimal import Decimal

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Sum, Q
from django.utils import timezone

from api.models import NPGAccount, NPGPayment
from api.views.CashflowView import split_payment, sync_auto_income, remove_auto_income, handover_block
from api.models.NPGPayment import NPGFee
from api import activity, receipts
from api.serializers.NPGSerializer import (
    NPGAccountSerializer,
    NPGPaymentSerializer,
    NPGFeeSerializer,
    NPGAccountSummarySerializer
)


def _is_admin(request):
    role = str(getattr(request.user, "role", "") or "").lower()
    return role in ("adm", "admin", "administrator")


def _payment_method_label(payment):
    if payment.payment_method == "เงินโอน":
        bank = f" ({payment.transfer_bank})" if payment.transfer_bank else ""
        return f"เงินโอน{bank}"
    if payment.payment_method == "เช็ค":
        num = f" เลขที่ {payment.check_number}" if payment.check_number else ""
        return f"เช็ค{num}"
    if payment.payment_method == "เงินสด":
        return "เงินสด"
    if payment.payment_method == "แบ่งจ่าย":
        total = float(payment.amount_paid or 0) + float(payment.late_fee or 0)
        cash = float(payment.cash_amount or 0)
        bank = f" {payment.transfer_bank}" if payment.transfer_bank else ""
        return f"เงินสด {cash:,.0f} / โอน{bank} {max(total - cash, 0):,.0f}"
    return payment.payment_method or "-"


def _calculate_late_fee(due_date, payment_date):
    """
    ค่าปรับจ่ายล่าช้า - จ่ายภายใน 3 วันหลังครบกำหนดไม่ปรับ
    เกิน 3 วัน ปรับวันละ 50 บาท นับทุกวันตั้งแต่วันครบกำหนดจนถึงวันที่จ่ายจริง (รวมวันที่จ่ายด้วย)
    เช่น นัดวันที่ 10 จ่ายวันที่ 14 = ล่าช้า 4 วัน (เกิน 3 วัน) = 4 x 50 = 200 บาท
    """
    if not due_date or not payment_date:
        return 0, 0

    days_late = (payment_date - due_date).days
    if days_late <= 3:
        return 0, max(days_late, 0)

    return days_late * 50, days_late


def _parse_late_fee(raw):
    """ค่าปรับที่พนักงานกรอกเอง: None = ไม่ได้ส่งมา (ใช้ค่าที่ระบบคำนวณ) / ตัวเลข >= 0 / 'invalid' = ผิดรูปแบบ"""
    if raw is None or raw == "":
        return None
    try:
        v = float(raw)
    except (TypeError, ValueError):
        return "invalid"
    if v < 0:
        return "invalid"
    return round(v, 2)


def _build_receipt(payment, account, items, total):
    """
    สร้างข้อมูลใบเสร็จรับเงินชั่วคราว สำหรับส่งกลับให้ frontend ไปเรนเดอร์เป็น PDF
    เลขที่ใบเสร็จอิง id ของ NPGPayment (เรียงตามลำดับการสร้างจริงเสมอ ไม่ซ้ำ) รูปแบบ MO-00001
    """
    customer = getattr(account.order, "customer", None)

    address_parts = []
    if customer:
        for attr in ["address", "subdistrict", "district", "province", "postal_code"]:
            val = getattr(customer, attr, None)
            if val:
                address_parts.append(str(val))

    bike = account.order.bikes.first() if account.order and account.order.bikes.exists() else None

    th_date = payment.payment_date.strftime("%d/%m/") + str(payment.payment_date.year + 543)

    return {
        "receiptNumber": f"MO-{payment.id:05d}",
        "date": th_date,
        "customerName": customer.name if customer else "",
        "customerPhone": getattr(customer, "phone", "") if customer else "",
        "customerAddress": " ".join(address_parts),
        "chassisNumber": bike.chassi if bike else "",
        "paymentMethodLabel": _payment_method_label(payment),
        "items": items,
        "total": total,
    }


def _customer_name(account):
    order = account.order if account else None
    return order.customer.name if order and order.customer else '-'


def _b(x):
    x = float(x or 0)
    return f"{x:,.0f}" if x == int(x) else f"{x:,.2f}"


def _user_name(request):
    return getattr(request.user, 'name', '') or getattr(request.user, 'username', '') or ''


def _post_payment_income(payment, account, label=None, only_if_exists=False, entry_date=None):
    """✅ รายรับอัตโนมัติของค่างวด NPG (รวมค่าปรับที่เก็บพร้อมงวด)"""
    total = float(payment.amount_paid or 0) + float(payment.late_fee or 0)
    cash, transfer = split_payment(total, payment.payment_method, payment.cash_amount)
    label = label or f"ค่างวด NPG #{account.id} งวดที่ {payment.installment_number}"
    user = payment.created_by
    name = (getattr(user, 'name', '') or getattr(user, 'username', '')) if user else ''
    sync_auto_income('npg_payment', payment.id, cash, transfer, f"รับเงิน · {label} · {_customer_name(account)}", name,
                     entry_date=entry_date, only_if_exists=only_if_exists)


CLOSE_METHODS = ("เงินสด", "เงินโอน", "เช็ค", "แบ่งจ่าย")


def _is_close_payment(p):
    return (p.note or "").startswith("ปิดบัญชี")


def _recalc_account(account):
    """
    คำนวณ total_paid / remaining_balance / paid_count / status ใหม่ทั้งหมด
    จากผลรวมของทุก payment จริงในตอนนี้ (ไม่ใช่การบวกสะสมทีละครั้ง)
    เรียกทุกครั้งหลังสร้าง/แก้ไข/ลบ payment เพื่อให้ยอดถูกต้องเสมอ แม้จะแก้ไขรายการเก่า
    """
    payments = list(account.payments.order_by("payment_date", "created_at", "id"))

    # ยอดหนี้ทั้งหมดตั้งต้น = ค่างวด (ที่ปัดเศษแล้วจาก frontend ตอนสร้างออเดอร์) x จำนวนงวด
    # ใช้ตัวนี้แทนสูตรดอกเบี้ยดิบ เพื่อให้จ่ายครบทุกงวดแล้วเหลือ 0 พอดี ไม่มีเศษค้าง
    original_total = float(account.installment_amount) * account.installment_count

    running = original_total
    total_paid = 0.0
    for idx, p in enumerate(payments):
        running -= float(p.amount_paid)
        total_paid += float(p.amount_paid)
        # อัปเดตแค่ฟิลด์ remaining_balance_after / installment_number โดยไม่ผ่าน save() ปกติ
        # (ไม่มี side effect อื่นแล้วเพราะเอา save() override ออกจาก model แล้ว)
        p.remaining_balance_after = max(running, 0)
        p.installment_number = idx + 1

    if payments:
        NPGPayment.objects.bulk_update(payments, ["remaining_balance_after", "installment_number"])

    account.total_paid = total_paid
    account.paid_count = len(payments)
    account.remaining_balance = max(running, 0)
    account.last_payment_date = payments[-1].payment_date if payments else None

    close_payment = next((p for p in reversed(payments) if _is_close_payment(p)), None)
    if close_payment:
        # ✅ ปิดบัญชีแล้ว: ยอดปิดบัญชี (หลังหักส่วนลด) = จ่ายครบ → หนี้ 0 สถานะ "ปิดบัญชี" เสมอ แม้ adm แก้รายการ
        account.remaining_balance = 0
        account.status = "closed"
        account.close_amount = close_payment.amount_paid
        account.close_date = close_payment.payment_date
    elif account.status == "closed":
        # ลบรายการปิดบัญชีออก → เปิดบัญชีกลับมาผ่อนต่อ
        account.status = "completed" if account.remaining_balance <= 0 else "active"
        account.close_amount = None
        account.close_date = None
    elif account.paid_count >= account.installment_count or account.remaining_balance <= 0:
        account.status = "completed"
    elif account.status == "completed":
        # แก้ไขรายการจนยอดไม่ครบแล้ว ต้องเปิดบัญชีกลับมาเป็น active
        account.status = "active"

    account.save()


class NPGAccountViewSet(viewsets.ModelViewSet):
    """ViewSet สำหรับจัดการบัญชี NPG"""
    serializer_class = NPGAccountSerializer
    
    # ✅ ต้องล็อกอินทุก action (เดิมเปิด list/retrieve ให้ทุกคนดูได้ - ข้อมูลลูกค้า/ยอดหนี้หลุดออกนอกร้านได้)
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = NPGAccount.objects.select_related(
            'order',
            'order__customer'
        ).prefetch_related(
            'order__bikes',
            'payments',
            'fees'
        ).all()
        
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        period_type = self.request.query_params.get('period_type')
        if period_type:
            queryset = queryset.filter(period_type=period_type)
        
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(order__customer__name__icontains=search) |
                Q(order__bikes__model_name__icontains=search) |
                Q(order__bikes__brand__icontains=search)
            ).distinct()
        
        return queryset.order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        queryset = self.get_queryset()
        
        summary_data = {
            'total_accounts': queryset.count(),
            'active_accounts': queryset.filter(status='active').count(),
            'completed_accounts': queryset.filter(status='completed').count(),
            'closed_accounts': queryset.filter(status='closed').count(),
            'overdue_accounts': queryset.filter(status='overdue').count(),
            'total_finance_amount': queryset.aggregate(total=Sum('finance_amount'))['total'] or 0,
            'total_paid': queryset.aggregate(total=Sum('total_paid'))['total'] or 0,
            'total_remaining': queryset.aggregate(total=Sum('remaining_balance'))['total'] or 0,
        }
        
        serializer = NPGAccountSummarySerializer(summary_data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        """
        บันทึกการชำระเงิน
        POST /api/npg/accounts/{id}/record_payment/
        Body: {
            "amount_paid": 1580,
            "note": "ชำระงวดที่ 3",
            "payment_method": "เงินสด" | "เงินโอน" | "เช็ค",
            "transfer_bank": "KBank" | "BBL",   # กรณีเงินโอน
            "check_number": "12345"             # กรณีเช็ค
        }
        """
        account = self.get_object()
        
        if account.status == 'completed':
            return Response({'error': 'บัญชีนี้ชำระครบแล้ว'}, status=status.HTTP_400_BAD_REQUEST)
        if account.status == 'closed':
            return Response({'error': 'บัญชีนี้ถูกปิดแล้ว'}, status=status.HTTP_400_BAD_REQUEST)
        
        amount_paid = float(request.data.get('amount_paid', 0))
        note = request.data.get('note', '')
        payment_method = request.data.get('payment_method', '')
        transfer_bank = request.data.get('transfer_bank', '')
        check_number = request.data.get('check_number', '')
        cash_amount_raw = request.data.get('cash_amount')
        
        if amount_paid <= 0:
            return Response({'error': 'จำนวนเงินต้องมากกว่า 0'}, status=status.HTTP_400_BAD_REQUEST)
        
        if amount_paid > float(account.remaining_balance):
            return Response({
                'error': f'จำนวนเงินเกินกว่าหนี้คงเหลือ ({account.remaining_balance} บาท)'
            }, status=status.HTTP_400_BAD_REQUEST)

        # เก็บวันครบกำหนดเดิมไว้ก่อน เพราะ update_next_payment_date() ด้านล่างจะเปลี่ยนค่านี้ทับ
        due_date = account.next_payment_date
        payment_date = timezone.now().date()
        late_fee, days_late = _calculate_late_fee(due_date, payment_date)
        # ✅ ค่าปรับที่รับจริง - พนักงานแก้/ยกเว้นได้ (เช่น ลูกค้าจ่ายแค่ค่างวด ไม่ได้จ่ายค่าปรับ = 0)
        #    ไม่ส่งมา = ใช้ค่าที่ระบบคำนวณ (เหมือนเดิม)
        custom_fee = _parse_late_fee(request.data.get('late_fee'))
        if custom_fee == "invalid":
            return Response({'error': 'ค่าปรับไม่ถูกต้อง'}, status=status.HTTP_400_BAD_REQUEST)
        if custom_fee is not None:
            late_fee = custom_fee

        # ✅ แบ่งจ่าย - ยอดเงินสดต้องมากกว่า 0 และน้อยกว่ายอดที่รับทั้งหมด (ค่างวด + ค่าปรับ)
        cash_amount = None
        if payment_method == 'แบ่งจ่าย':
            try:
                cash_amount = float(cash_amount_raw)
            except (TypeError, ValueError):
                cash_amount = None
            if cash_amount is None or cash_amount <= 0 or cash_amount >= amount_paid + late_fee:
                return Response(
                    {'error': f'แบ่งจ่าย: ยอดเงินสดต้องมากกว่า 0 และน้อยกว่ายอดรวม {amount_paid + late_fee:,.0f} บาท'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        payment = NPGPayment.objects.create(
            account=account,
            payment_date=payment_date,
            amount_paid=amount_paid,
            installment_number=account.paid_count + 1,  # จะถูกคำนวณใหม่ให้ถูกต้องใน _recalc_account อยู่ดี
            remaining_balance_after=0,  # จะถูกคำนวณใหม่ให้ถูกต้องใน _recalc_account อยู่ดี
            payment_method=payment_method,
            transfer_bank=transfer_bank,
            check_number=check_number,
            late_fee=late_fee,
            cash_amount=cash_amount,
            note=note,
            created_by=request.user
        )

        _recalc_account(account)
        account.refresh_from_db()
        account.update_next_payment_date()
        payment.refresh_from_db()
        _post_payment_income(payment, account)
        receipts.record('npg_payment', payment)
        activity.note(request, (
            f"NPG #{account.id} {_customer_name(account)} งวดที่ {payment.installment_number}: "
            f"ค่างวด {_b(amount_paid)} ฿ + ค่าปรับ {_b(late_fee)} ฿"
            + (f" (ระบบคิด {_b(_calculate_late_fee(due_date, payment_date)[0])} ฿)" if custom_fee is not None else "")
            + f" · {payment_method or '-'}"
        ))

        bike = account.order.bikes.first() if account.order and account.order.bikes.exists() else None
        bike_desc = f" ({bike.model_name})" if bike else ""
        receipt_items = [{
            "description": f"ชำระค่างวดที่ {payment.installment_number}/{account.installment_count}{bike_desc}",
            "amount": amount_paid,
        }]
        receipt_total = amount_paid
        if late_fee:
            receipt_items.append({
                "description": f"ค่าปรับจ่ายล่าช้า ({days_late} วัน)" if days_late > 3 else "ค่าปรับจ่ายล่าช้า",
                "amount": late_fee,
            })
            receipt_total += late_fee

        receipt = _build_receipt(
            payment=payment,
            account=account,
            items=receipt_items,
            total=receipt_total,
        )

        serializer = self.get_serializer(account)
        return Response({
            'message': 'บันทึกการชำระเงินสำเร็จ',
            'payment_id': payment.id,
            'late_fee': late_fee,
            'days_late': days_late,
            'account': serializer.data,
            'receipt': receipt,
        })
    
    @action(detail=True, methods=['post'])
    def close_account(self, request, pk=None):
        """
        ปิดบัญชี (ส่วนลดดอกเบี้ยตามเดือนที่เหลือ)
        POST /api/npg/accounts/{id}/close_account/
        """
        account = self.get_object()
        
        if account.status == 'completed':
            return Response({'error': 'บัญชีนี้ชำระครบแล้ว'}, status=status.HTTP_400_BAD_REQUEST)
        if account.status == 'closed':
            return Response({'error': 'บัญชีนี้ถูกปิดแล้ว'}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ คำนวณ paid_count / remaining_balance ใหม่จากประวัติการชำระจริงก่อนเสมอ
        # กันกรณีคอลัมน์ paid_count ในฐานข้อมูลค้างไม่ตรงกับจำนวนงวดที่จ่ายจริง
        # (เคยเจอเคสจ่ายจริง 18 งวด แต่คอลัมน์ค้างที่ 12 ทำให้คำนวณส่วนลดดอกเบี้ยผิดเพี้ยนไปเท่าตัว)
        _recalc_account(account)
        account.refresh_from_db()

        close_calculation = account.calculate_close_amount()
        try:
            close_amount = request.data.get('close_amount')
            close_amount = round(float(close_amount), 2) if close_amount not in (None, '') else close_calculation['close_amount']
        except (TypeError, ValueError):
            return Response({'error': 'ยอดปิดบัญชีไม่ถูกต้อง'}, status=status.HTTP_400_BAD_REQUEST)
        remaining = float(account.remaining_balance)
        if close_amount <= 0 or close_amount > remaining + 0.5:
            return Response({'error': f'ยอดปิดบัญชีต้องมากกว่า 0 และไม่เกินหนี้คงเหลือ {_b(remaining)} บาท'},
                            status=status.HTTP_400_BAD_REQUEST)

        # ✅ ต้องเลือกวิธีชำระ - เดิมไม่ได้ส่งมา → ยอดปิดบัญชีไม่ลงรายรับ-รายจ่าย และใบเสร็จขึ้นวิธีชำระ "-"
        payment_method = (request.data.get('payment_method') or '').strip()
        if payment_method not in CLOSE_METHODS:
            return Response({'error': 'กรุณาเลือกวิธีชำระ (เงินสด / เงินโอน / เช็ค / แบ่งจ่าย)'},
                            status=status.HTTP_400_BAD_REQUEST)
        transfer_bank = request.data.get('transfer_bank', '') or ''
        check_number = request.data.get('check_number', '') or ''
        cash_amount = None
        if payment_method == 'แบ่งจ่าย':
            try:
                cash_amount = round(float(request.data.get('cash_amount')), 2)
            except (TypeError, ValueError):
                return Response({'error': 'แบ่งจ่าย: กรุณาใส่ยอดเงินสด'}, status=status.HTTP_400_BAD_REQUEST)
            if cash_amount <= 0 or cash_amount >= close_amount:
                return Response({'error': 'แบ่งจ่าย: ยอดเงินสดต้องมากกว่า 0 และน้อยกว่ายอดปิดบัญชี'},
                                status=status.HTTP_400_BAD_REQUEST)
        # ส่วนลดจริง = หนี้คงเหลือ - ยอดที่รับจริง (ตรงกับที่ลูกค้าจ่าย)
        close_calculation['discount'] = round(max(remaining - close_amount, 0), 2)
        
        payment = NPGPayment.objects.create(
            account=account,
            payment_date=timezone.now().date(),
            amount_paid=close_amount,
            installment_number=account.paid_count + 1,
            remaining_balance_after=0,
            payment_method=payment_method,
            transfer_bank=transfer_bank,
            check_number=check_number,
            cash_amount=cash_amount,
            note=f"ปิดบัญชี - ส่วนลด {_b(close_calculation['discount'])} บาท",
            created_by=request.user
        )
        
        _post_payment_income(payment, account, label=f"ปิดบัญชี NPG #{account.id}")
        receipts.record('npg_payment', payment)
        activity.note(request, f"ปิดบัญชี NPG #{account.id} {_customer_name(account)}: รับ {_b(close_amount)} ฿ "
                               f"(ส่วนลด {_b(close_calculation['discount'])} ฿) · {payment_method or '-'}")

        account.status = 'closed'
        account.close_date = timezone.now().date()
        account.close_amount = close_amount
        account.total_paid = float(account.total_paid) + close_amount
        account.remaining_balance = 0
        account.paid_count = account.paid_count + 1
        account.save()

        bike = account.order.bikes.first() if account.order and account.order.bikes.exists() else None
        bike_desc = f" ({bike.model_name})" if bike else ""
        receipt = _build_receipt(
            payment=payment,
            account=account,
            items=[{
                "description": f"ปิดบัญชี{bike_desc} (ส่วนลดดอกเบี้ย {close_calculation['discount']:,.2f} บาท)",
                "amount": close_amount,
            }],
            total=close_amount,
        )
        
        serializer = self.get_serializer(account)
        return Response({
            'message': 'ปิดบัญชีสำเร็จ',
            'payment_id': payment.id,
            'close_calculation': close_calculation,
            'account': serializer.data,
            'receipt': receipt,
        })


    @action(detail=True, methods=['post'])
    def add_fee(self, request, pk=None):
        """
        บันทึกค่าธรรมเนียมอื่นๆ (ไม่กระทบยอดหนี้คงเหลือ)
        POST /npg/accounts/{id}/add_fee/
        Body: { "description": "ค่าทวงถาม", "amount": 200, "payment_method": "เงินสด", "note": "" }
        """
        account = self.get_object()

        description = (request.data.get('description') or '').strip()
        if not description:
            return Response({'error': 'กรุณาระบุรายการค่าธรรมเนียม'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = float(request.data.get('amount', 0))
        except (TypeError, ValueError):
            return Response({'error': 'จำนวนเงินไม่ถูกต้อง'}, status=status.HTTP_400_BAD_REQUEST)
        if amount <= 0:
            return Response({'error': 'จำนวนเงินต้องมากกว่า 0'}, status=status.HTTP_400_BAD_REQUEST)

        fee = NPGFee.objects.create(
            account=account,
            fee_date=timezone.now().date(),
            description=description,
            amount=amount,
            payment_method=request.data.get('payment_method', '') or '',
            note=request.data.get('note', '') or '',
            created_by=getattr(request.user, 'username', '') or '',
        )
        # ✅ รายรับอัตโนมัติ (ค่าธรรมเนียมไม่มีแบ่งจ่าย)
        cash, transfer = split_payment(amount, fee.payment_method)
        sync_auto_income(
            'npg_fee', fee.id, cash, transfer,
            f"รับเงิน · ค่าธรรมเนียม NPG #{account.id}: {description} · {_customer_name(account)}",
            getattr(request.user, 'name', '') or getattr(request.user, 'username', '') or '',
        )

        receipts.record('npg_fee', fee)  # ✅ ใบเสร็จชั่วคราว MF-xxxxx
        activity.note(request, f"NPG #{account.id} {_customer_name(account)}: {description} {_b(amount)} ฿ · {fee.payment_method or '-'}")
        return Response({
            'message': 'บันทึกค่าธรรมเนียมสำเร็จ',
            'fee': NPGFeeSerializer(fee).data,
            'fee_id': fee.id,
        })

    @action(detail=True, methods=['get'], url_path=r'fee_receipt/(?P<fee_id>[0-9]+)')
    def fee_receipt(self, request, pk=None, fee_id=None):
        """
        ใบเสร็จรับเงินชั่วคราวของค่าธรรมเนียม (เลขที่ MF-00001)
        GET /npg/accounts/{id}/fee_receipt/{fee_id}/
        """
        account = self.get_object()
        fee = NPGFee.objects.filter(id=fee_id, account=account).first()
        if not fee:
            return Response({'error': 'ไม่พบรายการค่าธรรมเนียม'}, status=status.HTTP_404_NOT_FOUND)
        customer = getattr(account.order, "customer", None)
        address = " ".join(str(getattr(customer, a)) for a in ["address", "subdistrict", "district", "province", "postal_code"]
                           if customer and getattr(customer, a, None))
        bike = account.order.bikes.first() if account.order and account.order.bikes.exists() else None
        method = fee.payment_method or "-"
        return Response({
            "receiptNumber": f"MF-{fee.id:05d}",
            "date": fee.fee_date.strftime("%d/%m/") + str(fee.fee_date.year + 543),
            "customerName": customer.name if customer else "",
            "customerPhone": getattr(customer, "phone", "") if customer else "",
            "customerAddress": address,
            "chassisNumber": bike.chassi if bike else "",
            "paymentMethodLabel": method,
            "items": [{"description": fee.description, "amount": float(fee.amount)}],
            "total": float(fee.amount),
        })

    @action(detail=True, methods=['delete'], url_path=r'delete_fee/(?P<fee_id>[0-9]+)')
    def delete_fee(self, request, pk=None, fee_id=None):
        """
        ลบค่าธรรมเนียม (เฉพาะ adm)
        DELETE /npg/accounts/{id}/delete_fee/{fee_id}/
        """
        if not _is_admin(request):
            return Response({'error': 'เฉพาะผู้ดูแลระบบเท่านั้นที่ลบค่าธรรมเนียมได้'}, status=status.HTTP_403_FORBIDDEN)

        account = self.get_object()
        blocked = handover_block('npg_fee', int(fee_id))
        if blocked:
            return Response({'error': blocked}, status=status.HTTP_400_BAD_REQUEST)
        fee_obj = NPGFee.objects.filter(id=fee_id, account=account).first()
        if fee_obj:
            activity.note(request, f"NPG #{account.id} {_customer_name(account)}: ลบ {fee_obj.description} {_b(fee_obj.amount)} ฿")
        deleted, _ = NPGFee.objects.filter(id=fee_id, account=account).delete()
        if not deleted:
            return Response({'error': 'ไม่พบรายการค่าธรรมเนียม'}, status=status.HTTP_404_NOT_FOUND)
        remove_auto_income('npg_fee', int(fee_id), _user_name(request))
        receipts.cancel('npg_fee', int(fee_id), _user_name(request))

        return Response({'message': 'ลบค่าธรรมเนียมสำเร็จ'})


class NPGPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet สำหรับดูประวัติการชำระเงิน + แก้ไขรายการ (adm เท่านั้น) + ดูใบเสร็จ"""
    serializer_class = NPGPaymentSerializer
    
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = NPGPayment.objects.select_related(
            'account',
            'account__order',
            'account__order__customer',
            'created_by'
        ).all()
        
        account_id = self.request.query_params.get('account')
        if account_id:
            queryset = queryset.filter(account_id=account_id)
        
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(payment_date__range=[start_date, end_date])
        
        return queryset.order_by('-payment_date', '-created_at')

    @action(detail=True, methods=['get'])
    def receipt(self, request, pk=None):
        """
        ข้อมูลใบเสร็จรับเงินชั่วคราวของการชำระเงินรายการนี้
        GET /npg/payments/{id}/receipt/
        """
        payment = self.get_object()
        account = payment.account

        bike = account.order.bikes.first() if account.order and account.order.bikes.exists() else None
        bike_desc = f" ({bike.model_name})" if bike else ""

        if (payment.note or "").startswith("ปิดบัญชี"):
            description = f"ปิดบัญชี{bike_desc}"
        else:
            description = f"ชำระค่างวดที่ {payment.installment_number}/{account.installment_count}{bike_desc}"

        items = [{"description": description, "amount": float(payment.amount_paid)}]
        total = float(payment.amount_paid)
        if float(payment.late_fee or 0) > 0:
            items.append({"description": "ค่าปรับจ่ายล่าช้า", "amount": float(payment.late_fee)})
            total += float(payment.late_fee)

        receipt = _build_receipt(payment=payment, account=account, items=items, total=total)
        return Response(receipt)

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def edit(self, request, pk=None):
        """
        แก้ไขรายการชำระเงินที่บันทึกไปแล้ว (เฉพาะ role adm เท่านั้น)
        PATCH /npg/payments/{id}/edit/
        Body: { amount_paid?, late_fee?, note?, payment_method?, transfer_bank?, check_number?, payment_date? }
        """
        if not _is_admin(request):
            return Response({'error': 'เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขรายการชำระเงินได้'}, status=status.HTTP_403_FORBIDDEN)

        payment = self.get_object()
        account = payment.account
        had_no_method = not (payment.payment_method or '').strip()
        before = {
            'ยอด': _b(payment.amount_paid), 'ค่าปรับ': _b(payment.late_fee), 'วิธีชำระ': payment.payment_method or '-',
            'วันที่': str(payment.payment_date), 'หมายเหตุ': payment.note or '',
        }

        # ✅ adm แก้ได้เสมอ แม้รายการจะส่งเงินไปแล้ว - ยอดที่ส่ง / แถว "ส่งเงิน" ถูกปรับตามยอดใหม่ให้เอง (ด้านล่าง)
        if 'amount_paid' in request.data:
            try:
                new_amount = float(request.data.get('amount_paid'))
            except (TypeError, ValueError):
                return Response({'error': 'จำนวนเงินไม่ถูกต้อง'}, status=status.HTTP_400_BAD_REQUEST)
            if new_amount <= 0:
                return Response({'error': 'จำนวนเงินต้องมากกว่า 0'}, status=status.HTTP_400_BAD_REQUEST)
            payment.amount_paid = new_amount

        if 'late_fee' in request.data:
            new_fee = _parse_late_fee(request.data.get('late_fee'))
            if new_fee == "invalid":
                return Response({'error': 'ค่าปรับไม่ถูกต้อง'}, status=status.HTTP_400_BAD_REQUEST)
            payment.late_fee = new_fee or 0

        if 'note' in request.data:
            payment.note = request.data.get('note') or ''
        if 'payment_method' in request.data:
            payment.payment_method = request.data.get('payment_method') or ''
        if 'transfer_bank' in request.data:
            payment.transfer_bank = request.data.get('transfer_bank') or ''
        if 'check_number' in request.data:
            payment.check_number = request.data.get('check_number') or ''
        if 'payment_date' in request.data and request.data.get('payment_date'):
            payment.payment_date = request.data.get('payment_date')

        payment.edited_by = request.user
        payment.save()

        # คำนวณยอดบัญชีใหม่ทั้งหมดจากทุก payment จริง (กันยอดเพี้ยนจากการแก้ไข)
        _recalc_account(account)
        account.refresh_from_db()
        # ✅ รายรับอัตโนมัติแก้ตาม (ยอด / วิธีชำระ)
        payment.refresh_from_db()
        is_close = _is_close_payment(payment)
        # only_if_exists: ค่างวดที่รับก่อนมีระบบนี้ (พนักงานพิมพ์รายรับเอง) ไม่ลงใหม่ซ้ำ
        # ✅ ยกเว้นรายการที่ไม่เคยมีวิธีชำระ (เช่น ปิดบัญชีแบบเก่า) → adm ใส่วิธีชำระแล้วลงรายรับให้ ณ วันที่รับเงินจริง
        fill_missing = is_close and had_no_method and (payment.payment_method or '').strip() in CLOSE_METHODS
        _post_payment_income(payment, account, label=f"ปิดบัญชี NPG #{account.id}" if is_close else None,
                             only_if_exists=not fill_missing,
                             entry_date=payment.payment_date if fill_missing else None)
        receipts.record('npg_payment', payment)  # ✅ ยอดในทะเบียนใบเสร็จแก้ตาม
        # ✅ รายการที่ส่งเงินไปแล้ว: ยอดใหม่น้อยลง (เช่น เอาค่าปรับที่ไม่ได้รับออก) → ยอดส่งเงินลดตาม ลิ้นชักไม่เพี้ยน
        try:
            from api.views.CashHandoverViewSet import fit_handover_to_source
            fit_handover_to_source('npg_payment', payment.id)
        except Exception:
            import traceback
            traceback.print_exc()

        after = {
            'ยอด': _b(payment.amount_paid), 'ค่าปรับ': _b(payment.late_fee), 'วิธีชำระ': payment.payment_method or '-',
            'วันที่': str(payment.payment_date), 'หมายเหตุ': payment.note or '',
        }
        changes = [f"{k} {before[k] or '-'} → {after[k] or '-'}" for k in before if str(before[k]) != str(after[k])]
        activity.note(request, f"NPG #{account.id} {_customer_name(account)} งวดที่ {payment.installment_number}: "
                               + (", ".join(changes) if changes else "ไม่มีการเปลี่ยนแปลง"))

        return Response({
            'message': 'แก้ไขรายการชำระเงินสำเร็จ',
            'payment': NPGPaymentSerializer(payment).data,
            'account': NPGAccountSerializer(account).data,
        })

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated])
    def delete_payment(self, request, pk=None):
        """
        ลบรายการชำระเงินที่บันทึกไปแล้ว (เฉพาะ role adm เท่านั้น)
        DELETE /npg/payments/{id}/delete_payment/
        """
        if not _is_admin(request):
            return Response({'error': 'เฉพาะผู้ดูแลระบบเท่านั้นที่ลบรายการชำระเงินได้'}, status=status.HTTP_403_FORBIDDEN)

        payment = self.get_object()
        account = payment.account
        payment_id = payment.id
        blocked = handover_block('npg_payment', payment_id)
        if blocked:
            return Response({'error': blocked}, status=status.HTTP_400_BAD_REQUEST)
        activity.note(request, f"NPG #{account.id} {_customer_name(account)}: ลบงวดที่ {payment.installment_number} "
                               f"ยอด {_b(payment.amount_paid)} ฿ ค่าปรับ {_b(payment.late_fee)} ฿ ({payment.payment_date})")
        payment.delete()
        remove_auto_income('npg_payment', payment_id, _user_name(request))
        receipts.cancel('npg_payment', payment_id, _user_name(request))

        # คำนวณยอดบัญชีใหม่ทั้งหมดจากทุก payment ที่เหลืออยู่จริง
        _recalc_account(account)
        account.refresh_from_db()

        return Response({
            'message': 'ลบรายการชำระเงินสำเร็จ',
            'account': NPGAccountSerializer(account).data,
        })