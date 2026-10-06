from rest_framework import serializers
from api.models import NPGAccount, NPGPayment, Order, Customer
from api.serializers import OrderSerializer
from api.models.NPGPayment import NPGFee

# ✅ เกินกำหนดเกินกี่วันถึงนับเป็น "หนี้เสีย"
BAD_DEBT_DAYS = 90


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
            'late_fee',
            'note',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NPGFeeSerializer(serializers.ModelSerializer):
    """Serializer สำหรับค่าธรรมเนียมอื่นๆ"""
    class Meta:
        model = NPGFee
        fields = [
            'id', 'account', 'fee_date', 'description', 'amount',
            'payment_method', 'note', 'created_by', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at']


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

    # ✅ วิธีชำระเงินหลักของออเดอร์ (Cathay, ทรัพย์สยาม, เงินสด ฯลฯ) - ใช้แยกแสดงผลบัญชีผ่อนดาวน์
    # ที่เกิดจากไฟแนนซ์เจ้าอื่น (ไม่ใช่ NPG) ให้เห็นว่าตัวรถผ่อนกับใคร
    order_payment_method = serializers.CharField(source='order.payment_method', read_only=True, default=None)

    # ประวัติการชำระ
    payments = NPGPaymentSerializer(many=True, read_only=True)

    # ✅ ค่าธรรมเนียมอื่นๆ
    fees = NPGFeeSerializer(many=True, read_only=True)

    # ✅ ตัวเลขสรุปสัญญา (คำนวณสดจากประวัติจริงทุกครั้ง)
    metrics = serializers.SerializerMethodField()

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
    # ✅ ค่าปรับถ้าจ่ายวันนี้ - โชว์ล่วงหน้าให้พนักงานรู้ก่อนกดบันทึกจริง (จ่ายภายใน 3 วันหลังครบกำหนด
    # ไม่ปรับ เกินนั้นปรับวันละ 50 บาท นับรวมทุกวันตั้งแต่วันครบกำหนดถึงวันนี้)
    estimated_late_fee = serializers.SerializerMethodField()
    
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
            'account_type',
            'finance_amount',
            'interest_rate',
            'installment_count',
            'installment_amount',
            'period_type',
            'order_npg_period',  # ✅ ค่าจริงจาก Order (ใช้แทน period_type เมื่อมีค่า)
            'order_payment_method',  # ✅ วิธีชำระเงินหลักของออเดอร์
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
            'estimated_late_fee',
            'fees',
            'metrics',
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

    def get_estimated_late_fee(self, obj):
        """
        ค่าปรับถ้าจ่ายวันนี้ - จ่ายภายใน 3 วันหลังครบกำหนดไม่ปรับ เกินนั้นปรับวันละ 50 บาท
        นับทุกวันตั้งแต่วันครบกำหนดถึงวันนี้ (ใช้โชว์ล่วงหน้าเฉยๆ ค่าจริงคำนวณตอนบันทึกชำระอีกที)
        """
        from django.utils import timezone
        if obj.status in ['completed', 'closed']:
            return 0
        if not obj.next_payment_date:
            return 0

        days_late = (timezone.now().date() - obj.next_payment_date).days
        if days_late <= 3:
            return 0
        return days_late * 50


    def get_metrics(self, obj):
        """
        ตัวเลขสรุปของสัญญานี้
        - credit                 สินเชื่อ (ยอดจัด / เงินต้น)
        - expected_total         ยอดชำระคาดการณ์ = ค่างวด x จำนวนงวด (เงินต้น + ดอกเบี้ยทั้งสัญญา)
        - paid                   ชำระแล้ว (ค่างวดที่รับจริง ไม่รวมค่าปรับ/ค่าธรรมเนียม)
        - principal_paid         เงินต้นชำระแล้ว - แบ่งตามสัดส่วนเงินต้น/ดอกเบี้ยในทุกงวด
                                 (บัญชีปิดก่อนกำหนด = ได้เงินต้นคืนครบ)
        - interest_received      ดอกเบี้ยรับ = ชำระแล้ว - เงินต้นชำระแล้ว
        - outstanding            ยอดคงค้าง = ยอดชำระคาดการณ์ - ชำระแล้ว (ปิด/ชำระครบ = 0)
        - late_fees / other_fees / fees_received  ค่าปรับล่าช้า + ค่าธรรมเนียมอื่น
        - realized_profit        กำไรรับจริง = ดอกเบี้ยรับ + ค่าธรรมเนียมรับแล้ว
        - days_overdue           จำนวนวันที่เกินกำหนด
        - bad_debt               หนี้เสียคาดการณ์ = ยอดคงค้างถ้าเกินกำหนดเกิน BAD_DEBT_DAYS วัน
        - contract_status        normal / overdue / bad_debt / closed
        """
        from django.utils import timezone

        credit = float(obj.finance_amount or 0)
        expected_total = float(obj.installment_amount or 0) * (obj.installment_count or 0)
        payments = list(obj.payments.all())
        paid = sum(float(p.amount_paid) for p in payments)
        late_fees = sum(float(p.late_fee or 0) for p in payments)
        other_fees = sum(float(f.amount) for f in obj.fees.all())

        is_finished = obj.status in ('closed', 'completed')

        if obj.status == 'closed':
            principal_paid = credit
        else:
            ratio = (credit / expected_total) if expected_total > 0 else 1
            principal_paid = min(paid * ratio, credit)
        interest_received = max(paid - principal_paid, 0)

        outstanding = 0 if is_finished else max(expected_total - paid, 0)

        days_overdue = 0
        if not is_finished and obj.next_payment_date:
            days_overdue = max((timezone.now().date() - obj.next_payment_date).days, 0)

        if is_finished:
            contract_status = 'closed'
        elif days_overdue > BAD_DEBT_DAYS:
            contract_status = 'bad_debt'
        elif days_overdue > 0:
            contract_status = 'overdue'
        else:
            contract_status = 'normal'

        fees_received = late_fees + other_fees

        return {
            'credit': round(credit, 2),
            'expected_total': round(expected_total, 2),
            'paid': round(paid, 2),
            'principal_paid': round(principal_paid, 2),
            'interest_received': round(interest_received, 2),
            'outstanding': round(outstanding, 2),
            'late_fees': round(late_fees, 2),
            'other_fees': round(other_fees, 2),
            'fees_received': round(fees_received, 2),
            'realized_profit': round(interest_received + fees_received, 2),
            'days_overdue': days_overdue,
            'bad_debt': round(outstanding, 2) if contract_status == 'bad_debt' else 0,
            'contract_status': contract_status,
        }


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