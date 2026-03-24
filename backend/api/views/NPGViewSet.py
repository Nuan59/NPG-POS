from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import timedelta

from api.models import NPGAccount, NPGPayment
from api.serializers.NPGSerializer import (
    NPGAccountSerializer,
    NPGPaymentSerializer,
    NPGAccountSummarySerializer
)


class NPGAccountViewSet(viewsets.ModelViewSet):
    """ViewSet สำหรับจัดการบัญชี NPG"""
    serializer_class = NPGAccountSerializer
    
    def get_permissions(self):
        """
        GET, HEAD, OPTIONS = AllowAny
        POST, PUT, PATCH, DELETE = IsAuthenticated
        """
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
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Filter by period_type
        period_type = self.request.query_params.get('period_type')
        if period_type:
            queryset = queryset.filter(period_type=period_type)
        
        # Search by customer name or bike model
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
        """
        สรุปข้อมูล NPG ทั้งหมด
        GET /api/npg/accounts/summary/
        """
        queryset = self.get_queryset()
        
        summary_data = {
            'total_accounts': queryset.count(),
            'active_accounts': queryset.filter(status='active').count(),
            'completed_accounts': queryset.filter(status='completed').count(),
            'closed_accounts': queryset.filter(status='closed').count(),
            'overdue_accounts': queryset.filter(status='overdue').count(),
            'total_finance_amount': queryset.aggregate(
                total=Sum('finance_amount')
            )['total'] or 0,
            'total_paid': queryset.aggregate(
                total=Sum('total_paid')
            )['total'] or 0,
            'total_remaining': queryset.aggregate(
                total=Sum('remaining_balance')
            )['total'] or 0,
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
            "note": "ชำระงวดที่ 3"
        }
        """
        account = self.get_object()
        
        # Validate
        if account.status == 'completed':
            return Response({
                'error': 'บัญชีนี้ชำระครบแล้ว'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if account.status == 'closed':
            return Response({
                'error': 'บัญชีนี้ถูกปิดแล้ว'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        amount_paid = float(request.data.get('amount_paid', 0))
        note = request.data.get('note', '')
        
        if amount_paid <= 0:
            return Response({
                'error': 'จำนวนเงินต้องมากกว่า 0'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if amount_paid > float(account.remaining_balance):
            return Response({
                'error': f'จำนวนเงินเกินกว่าหนี้คงเหลือ ({account.remaining_balance} บาท)'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # คำนวณหนี้คงเหลือหลังชำระ
        remaining_after = float(account.remaining_balance) - amount_paid
        
        # สร้างประวัติการชำระ
        payment = NPGPayment.objects.create(
            account=account,
            payment_date=timezone.now().date(),
            amount_paid=amount_paid,
            installment_number=account.paid_count + 1,
            remaining_balance_after=remaining_after,
            note=note,
            created_by=request.user
        )
        
        # อัพเดทวันชำระถัดไป
        account.update_next_payment_date()
        
        # ส่งข้อมูลกลับ
        serializer = self.get_serializer(account)
        return Response({
            'message': 'บันทึกการชำระเงินสำเร็จ',
            'payment_id': payment.id,
            'account': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def close_account(self, request, pk=None):
        """
        ปิดบัญชี (ส่วนลดดอกเบี้ย 50%)
        POST /api/npg/accounts/{id}/close_account/
        Body: {
            "close_amount": 25000  # optional, ถ้าไม่ส่งจะคำนวณให้
        }
        """
        account = self.get_object()
        
        # Validate
        if account.status == 'completed':
            return Response({
                'error': 'บัญชีนี้ชำระครบแล้ว'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if account.status == 'closed':
            return Response({
                'error': 'บัญชีนี้ถูกปิดแล้ว'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # คำนวณยอดปิดบัญชี
        close_calculation = account.calculate_close_amount()
        close_amount = request.data.get('close_amount')
        
        if close_amount is None:
            close_amount = close_calculation['close_amount']
        else:
            close_amount = float(close_amount)
        
        # บันทึกการปิดบัญชี
        payment = NPGPayment.objects.create(
            account=account,
            payment_date=timezone.now().date(),
            amount_paid=close_amount,
            installment_number=account.paid_count + 1,
            remaining_balance_after=0,
            note=f"ปิดบัญชี - ส่วนลด {close_calculation['discount']} บาท",
            created_by=request.user
        )
        
        # อัพเดทบัญชี
        account.status = 'closed'
        account.close_date = timezone.now().date()
        account.close_amount = close_amount
        account.remaining_balance = 0
        account.save()
        
        # ส่งข้อมูลกลับ
        serializer = self.get_serializer(account)
        return Response({
            'message': 'ปิดบัญชีสำเร็จ',
            'payment_id': payment.id,
            'close_calculation': close_calculation,
            'account': serializer.data
        })


class NPGPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet สำหรับดูประวัติการชำระเงิน (Read-only)"""
    serializer_class = NPGPaymentSerializer
    
    def get_permissions(self):
        """AllowAny สำหรับ Read-only"""
        return [AllowAny()]
    
    def get_queryset(self):
        queryset = NPGPayment.objects.select_related(
            'account',
            'account__order',
            'account__order__customer',
            'created_by'
        ).all()
        
        # Filter by account
        account_id = self.request.query_params.get('account')
        if account_id:
            queryset = queryset.filter(account_id=account_id)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(
                payment_date__range=[start_date, end_date]
            )
        
        return queryset.order_by('-payment_date', '-created_at')