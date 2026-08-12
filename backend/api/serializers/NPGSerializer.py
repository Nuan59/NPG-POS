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

    # ✅ รอบชำระที่แท้จริงจาก Order.npg_period (แม่นกว่า period_type เดิมที่อาจบันทึกผิดในอดีต)
    order_npg_period = serializers.CharField(source='order.npg_period', read_only=True, default=None)

    # ประวัติการชำระ
    payments = NPGPaymentSerializer(many=True, read_only=True)

    # ✅ คำนวณยอดคงเหลือ/ยอดชำระแล้ว/งวดที่ชำระ "สดใหม่" ทุกครั้งจากประวัติการชำระจริง
    # แทนที่จะเชื่อค่าที่บันทึกไว้ในคอลัมน์ (ซึ่งอาจผิดได้ถ้าตอนสร้างบัญชีคำนวณผิด เช่นบั๊ก period_type เดิม)
    # สูตร: ยอดคงเหลือ = (ค่างวด x จำนวนงวดทั้งหมด) - ผลรวมเงินที่จ่ายจริงตามประวัติ
    remaining_balance = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    paid_count = serializers.SerializerMethodField()

    def _full_total(self, obj):
        """ยอดหนี้เต็มจำนวนที่ถูกต้อง = ค่างวด (ปัดเศษแล้ว) x จำนวนงวดทั้งหมด"""
        return float(obj.installment_amount) * obj.installment_count

    def _total_paid_real(self, obj):
        return sum(float(p.amount_paid) for p in obj.payments.all())

    def get_remaining_balance(self, obj):
        remaining = self._full_total(obj) - self._total_paid_real(obj)
        return round(max(remaining, 0), 2)

    def get_total_paid(self, obj):
        return round(self._total_paid_real(obj), 2)

    def get_paid_count(self, obj):
        return obj.payments.count()
    
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
            'order_npg_period',  # ✅ ค่าจริงจาก Order (ใช้แทน period_type เมื่อมีค่า)
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