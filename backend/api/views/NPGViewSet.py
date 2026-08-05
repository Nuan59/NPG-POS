from decimal import Decimal

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Sum, Q
from django.utils import timezone

from api.models import NPGAccount, NPGPayment
from api.serializers.NPGSerializer import (
    NPGAccountSerializer,
    NPGPaymentSerializer,
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
    return payment.payment_method or "-"


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

    if account.paid_count >= account.installment_count or account.remaining_balance <= 0:
        account.status = "completed"
    elif account.status == "completed":
        # แก้ไขรายการจนยอดไม่ครบแล้ว ต้องเปิดบัญชีกลับมาเป็น active
        account.status = "active"

    account.save()


class NPGAccountViewSet(viewsets.ModelViewSet):
    """ViewSet สำหรับจัดการบัญชี NPG"""
    serializer_class = NPGAccountSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'summary']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        queryset = NPGAccount.objects.select_related(
            'order',
            'order__customer'
        ).prefetch_related(
            'order__bikes',
            'payments'
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
        
        if amount_paid <= 0:
            return Response({'error': 'จำนวนเงินต้องมากกว่า 0'}, status=status.HTTP_400_BAD_REQUEST)
        
        if amount_paid > float(account.remaining_balance):
            return Response({
                'error': f'จำนวนเงินเกินกว่าหนี้คงเหลือ ({account.remaining_balance} บาท)'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        payment = NPGPayment.objects.create(
            account=account,
            payment_date=timezone.now().date(),
            amount_paid=amount_paid,
            installment_number=account.paid_count + 1,  # จะถูกคำนวณใหม่ให้ถูกต้องใน _recalc_account อยู่ดี
            remaining_balance_after=0,  # จะถูกคำนวณใหม่ให้ถูกต้องใน _recalc_account อยู่ดี
            payment_method=payment_method,
            transfer_bank=transfer_bank,
            check_number=check_number,
            note=note,
            created_by=request.user
        )

        _recalc_account(account)
        account.refresh_from_db()
        account.update_next_payment_date()

        bike = account.order.bikes.first() if account.order and account.order.bikes.exists() else None
        bike_desc = f" ({bike.model_name})" if bike else ""
        receipt = _build_receipt(
            payment=payment,
            account=account,
            items=[{
                "description": f"ชำระค่างวดที่ {payment.installment_number}/{account.installment_count}{bike_desc}",
                "amount": amount_paid,
            }],
            total=amount_paid,
        )

        serializer = self.get_serializer(account)
        return Response({
            'message': 'บันทึกการชำระเงินสำเร็จ',
            'payment_id': payment.id,
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
        
        close_calculation = account.calculate_close_amount()
        close_amount = request.data.get('close_amount')
        close_amount = float(close_amount) if close_amount is not None else close_calculation['close_amount']

        payment_method = request.data.get('payment_method', '')
        transfer_bank = request.data.get('transfer_bank', '')
        check_number = request.data.get('check_number', '')
        
        payment = NPGPayment.objects.create(
            account=account,
            payment_date=timezone.now().date(),
            amount_paid=close_amount,
            installment_number=account.paid_count + 1,
            remaining_balance_after=0,
            payment_method=payment_method,
            transfer_bank=transfer_bank,
            check_number=check_number,
            note=f"ปิดบัญชี - ส่วนลด {close_calculation['discount']} บาท",
            created_by=request.user
        )
        
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


class NPGPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet สำหรับดูประวัติการชำระเงิน + แก้ไขรายการ (adm เท่านั้น) + ดูใบเสร็จ"""
    serializer_class = NPGPaymentSerializer
    
    def get_permissions(self):
        return [AllowAny()]
    
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

        receipt = _build_receipt(
            payment=payment,
            account=account,
            items=[{"description": description, "amount": float(payment.amount_paid)}],
            total=float(payment.amount_paid),
        )
        return Response(receipt)

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def edit(self, request, pk=None):
        """
        แก้ไขรายการชำระเงินที่บันทึกไปแล้ว (เฉพาะ role adm เท่านั้น)
        PATCH /npg/payments/{id}/edit/
        Body: { amount_paid?, note?, payment_method?, transfer_bank?, check_number?, payment_date? }
        """
        if not _is_admin(request):
            return Response({'error': 'เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขรายการชำระเงินได้'}, status=status.HTTP_403_FORBIDDEN)

        payment = self.get_object()
        account = payment.account

        if 'amount_paid' in request.data:
            try:
                new_amount = float(request.data.get('amount_paid'))
            except (TypeError, ValueError):
                return Response({'error': 'จำนวนเงินไม่ถูกต้อง'}, status=status.HTTP_400_BAD_REQUEST)
            if new_amount <= 0:
                return Response({'error': 'จำนวนเงินต้องมากกว่า 0'}, status=status.HTTP_400_BAD_REQUEST)
            payment.amount_paid = new_amount

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

        return Response({
            'message': 'แก้ไขรายการชำระเงินสำเร็จ',
            'payment': NPGPaymentSerializer(payment).data,
            'account': NPGAccountSerializer(account).data,
        })