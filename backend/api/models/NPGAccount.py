from django.db import models
from django.utils import timezone
from datetime import timedelta


class NPGAccount(models.Model):
    """
    บัญชีไฟแนนซ์ NPG สำหรับติดตามการชำระเงิน
    """
    STATUS_CHOICES = [
        ('active', 'กำลังชำระ'),
        ('completed', 'ชำระครบ'),
        ('closed', 'ปิดบัญชี'),
        ('overdue', 'เกินกำหนด'),
    ]
    
    PERIOD_CHOICES = [
        ('รายวัน', 'รายวัน'),
        ('รายสัปดาห์', 'รายสัปดาห์'),
        ('รายเดือน', 'รายเดือน'),
        ('รายปี', 'รายปี'),
    ]

    # ✅ รอบตัดงวด -> 1 งวดเท่ากับกี่เดือน (ดอกเบี้ยเป็น % ต่อเดือนเสมอ, 1 เดือน = 30 วัน)
    # ⚠️ ต้องตรงกับ NPG_PERIOD_MONTHS ใน Financecalculations.ts ฝั่ง frontend
    PERIOD_MONTHS = {
        'รายวัน': 1 / 30,
        'รายสัปดาห์': 7 / 30,
        'รายเดือน': 1,
        'รายปี': 12,
    }

    # ✅ รอบตัดงวด -> ครบกำหนดงวดถัดไปอีกกี่วัน
    PERIOD_DAYS = {
        'รายวัน': 1,
        'รายสัปดาห์': 7,
        'รายเดือน': 30,
        'รายปี': 365,
    }

    @classmethod
    def months_per_period(cls, period):
        return cls.PERIOD_MONTHS.get(period, 1)

    @classmethod
    def days_per_period(cls, period):
        return cls.PERIOD_DAYS.get(period, 30)

    # ✅ แยกประเภทบัญชี - "finance" = ผ่อนไฟแนนซ์ทั้งคันตามปกติ, "down_payment" = ผ่อนเฉพาะเงินดาวน์
    # (ลูกค้าจ่ายสด/ไฟแนนซ์เจ้าอื่นตามปกติ แต่ขอผ่อนเงินดาวน์เองกับร้าน)
    ACCOUNT_TYPE_CHOICES = [
        ('finance', 'ไฟแนนซ์'),
        ('down_payment', 'ผ่อนดาวน์'),
    ]

    order = models.OneToOneField(
        'Order',
        on_delete=models.CASCADE,
        related_name='npg_account',
        verbose_name='ออเดอร์'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name='สถานะ'
    )

    account_type = models.CharField(
        max_length=20,
        choices=ACCOUNT_TYPE_CHOICES,
        default='finance',
        verbose_name='ประเภทบัญชี'
    )
    
    finance_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='ยอดจัด'
    )
    
    interest_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name='ดอกเบี้ย (%)'
    )
    
    installment_count = models.IntegerField(
        verbose_name='จำนวนงวดทั้งหมด'
    )
    
    installment_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='ค่างวด'
    )
    
    period_type = models.CharField(
        max_length=20,
        choices=PERIOD_CHOICES,
        default='รายเดือน',
        verbose_name='ประเภท'
    )
    
    paid_count = models.IntegerField(
        default=0,
        verbose_name='งวดที่ชำระแล้ว'
    )
    
    total_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name='ยอดชำระแล้ว'
    )
    
    remaining_balance = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='หนี้คงเหลือ'
    )
    
    start_date = models.DateField(
        verbose_name='วันที่เริ่มจัด'
    )
    
    next_payment_date = models.DateField(
        verbose_name='วันชำระถัดไป'
    )
    
    last_payment_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='วันชำระล่าสุด'
    )
    
    close_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='วันปิดบัญชี'
    )
    
    close_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='ยอดปิดบัญชี'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'npg_accounts'
        verbose_name = 'บัญชี NPG'
        verbose_name_plural = 'บัญชี NPG'
        ordering = ['-created_at']

    def __str__(self):
        customer_name = self.order.customer.name if self.order and self.order.customer else "ไม่ระบุ"
        return f"NPG-{self.id} - {customer_name}"

    def calculate_remaining_balance(self):
        """คำนวณหนี้คงเหลือ"""
        # จำนวนเดือนของสัญญา = จำนวนงวด x (1 งวดกี่เดือน) - รายเดือน/รายปี ได้ค่าเท่าเดิม
        total_months = self.installment_count * self.months_per_period(self.period_type)
        total_with_interest = float(self.finance_amount) + (
            float(self.finance_amount) * (float(self.interest_rate) / 100) * total_months
        )
        
        return total_with_interest - float(self.total_paid)

    def update_next_payment_date(self):
        """อัพเดทวันชำระถัดไป"""
        # ✅ รายวัน +1 / รายสัปดาห์ +7 / รายเดือน +30 / รายปี +365
        days_to_add = self.days_per_period(self.period_type)
        base_date = self.last_payment_date or self.start_date
        self.next_payment_date = base_date + timedelta(days=days_to_add)
        
        self.save()

    def check_overdue(self):
        """ตรวจสอบว่าเกินกำหนดชำระหรือไม่"""
        if self.status == 'active' and self.next_payment_date < timezone.now().date():
            self.status = 'overdue'
            self.save()

    def calculate_close_amount(self):
        """
        คำนวณยอดปิดบัญชี (ลดดอกเบี้ยตามจำนวนเดือนที่เหลือ)
        """
        # ✅ กันหารด้วย 0 - ถ้า installment_count เป็น 0 (ข้อมูลตั้งค่าผิด/บัญชีทดสอบ) หรือ
        # ไม่มีงวดเหลือให้ปิดแล้ว ให้ปิดด้วยยอดหนี้คงเหลือตรงๆ ไม่มีส่วนลด แทนที่จะ error 500
        if not self.installment_count or self.installment_count <= 0:
            remaining_balance = float(self.remaining_balance)
            return {
                'remaining_installments': 0,
                'remaining_months': 0,
                'principal_per_installment': 0,
                'remaining_principal': 0,
                'interest_per_month': 0,
                'remaining_interest': 0,
                'discount': 0,
                'close_amount': round(remaining_balance, 2),
            }

        remaining_installments = self.installment_count - self.paid_count
        
        # ✅ แปลงงวดที่เหลือเป็นจำนวนเดือน (รายวัน/รายสัปดาห์ได้เป็นเศษเดือน)
        remaining_months = remaining_installments * self.months_per_period(self.period_type)
        
        principal_per_installment = float(self.finance_amount) / self.installment_count
        remaining_principal = principal_per_installment * remaining_installments
        
        interest_per_month_raw = float(self.finance_amount) * (float(self.interest_rate) / 100)
        interest_per_month = round(interest_per_month_raw)
        
        remaining_interest = float(self.remaining_balance) - remaining_principal
        
        discount = (interest_per_month * remaining_months) / 2
        
        close_amount = float(self.remaining_balance) - discount
        
        return {
            'remaining_installments': remaining_installments,
            'remaining_months': round(remaining_months, 2),
            'principal_per_installment': round(principal_per_installment, 2),
            'remaining_principal': round(remaining_principal, 2),
            'interest_per_month': round(interest_per_month, 2),
            'remaining_interest': round(remaining_interest, 2),
            'discount': round(discount, 2),
            'close_amount': round(close_amount, 2)
        }