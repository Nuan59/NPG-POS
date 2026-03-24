from rest_framework import serializers
from api.models import NPGAccount, NPGPayment, Order, Customer
from api.serializers import OrderSerializer


class NPGPaymentSerializer(serializers.ModelSerializer):
    """Serializer สำหรับประวัติการชำระเงิน"""
    created_by_name = serializers.CharField(
        source='created_by.username',
        read_only=True
    )
    
    class Meta:
        model = NPGPayment
        fields = [
            'id',
            'account',
            'payment_date',
            'amount_paid',
            'installment_number',
            'remaining_balance_after',
            'note',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NPGAccountSerializer(serializers.ModelSerializer):
    """Serializer สำหรับบัญชี NPG"""
    
    # ข้อมูลออเดอร์
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    order_date = serializers.DateField(source='order.sale_date', read_only=True)
    
    # ข้อมูลลูกค้า
    customer_id = serializers.IntegerField(source='order.customer.id', read_only=True)
    customer_name = serializers.CharField(source='order.customer.name', read_only=True)
    customer_phone = serializers.CharField(source='order.customer.phone', read_only=True)
    customer_address = serializers.CharField(source='order.customer.address', read_only=True)
    
    # ข้อมูลรถ
    bike_info = serializers.SerializerMethodField()
    
    # ประวัติการชำระ
    payments = NPGPaymentSerializer(many=True, read_only=True)
    
    # ข้อมูลที่คำนวณ
    progress_percentage = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    days_until_payment = serializers.SerializerMethodField()
    
    class Meta:
        model = NPGAccount
        fields = [
            'id',
            'order',
            'order_id',
            'order_date',
            'customer_id',
            'customer_name',
            'customer_phone',
            'customer_address',
            'bike_info',
            'status',
            'finance_amount',
            'interest_rate',
            'installment_count',
            'installment_amount',
            'period_type',
            'paid_count',
            'total_paid',
            'remaining_balance',
            'start_date',
            'next_payment_date',
            'last_payment_date',
            'close_date',
            'close_amount',
            'payments',
            'progress_percentage',
            'is_overdue',
            'days_until_payment',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_bike_info(self, obj):
        """ดึงข้อมูลรถจากออเดอร์"""
        if obj.order and obj.order.bikes.exists():
            bike = obj.order.bikes.first()
            return {
                'id': bike.id,
                'brand': bike.brand,
                'model_name': bike.model_name,
                'model_code': bike.model_code,
            }
        return None
    
    def get_progress_percentage(self, obj):
        """คำนวณ % ความคืบหน้าการชำระ"""
        if obj.installment_count > 0:
            return round((obj.paid_count / obj.installment_count) * 100, 2)
        return 0
    
    def get_is_overdue(self, obj):
        """ตรวจสอบว่าเกินกำหนดหรือไม่"""
        from django.utils import timezone
        return obj.status == 'active' and obj.next_payment_date < timezone.now().date()
    
    def get_days_until_payment(self, obj):
        """คำนวณจำนวนวันจนถึงวันชำระถัดไป"""
        from django.utils import timezone
        if obj.status in ['completed', 'closed']:
            return None
        
        delta = obj.next_payment_date - timezone.now().date()
        return delta.days


class NPGAccountSummarySerializer(serializers.Serializer):
    """Serializer สำหรับสรุปข้อมูล NPG"""
    total_accounts = serializers.IntegerField()
    active_accounts = serializers.IntegerField()
    completed_accounts = serializers.IntegerField()
    closed_accounts = serializers.IntegerField()
    overdue_accounts = serializers.IntegerField()
    total_finance_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_remaining = serializers.DecimalField(max_digits=10, decimal_places=2)