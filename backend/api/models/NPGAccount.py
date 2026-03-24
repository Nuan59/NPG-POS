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
        ('รายเดือน', 'รายเดือน'),
        ('รายปี', 'รายปี'),
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
        if self.period_type == 'รายเดือน':
            total_with_interest = float(self.finance_amount) + (
                float(self.finance_amount) * (float(self.interest_rate) / 100) * self.installment_count
            )
        else:  # รายปี
            total_with_interest = float(self.finance_amount) + (
                float(self.finance_amount) * (float(self.interest_rate) / 100) * self.installment_count * 12
            )
        
        return total_with_interest - float(self.total_paid)

    def update_next_payment_date(self):
        """อัพเดทวันชำระถัดไป"""
        if self.last_payment_date:
            days_to_add = 30 if self.period_type == 'รายเดือน' else 365
            self.next_payment_date = self.last_payment_date + timedelta(days=days_to_add)
        else:
            days_to_add = 30 if self.period_type == 'รายเดือน' else 365
            self.next_payment_date = self.start_date + timedelta(days=days_to_add)
        
        self.save()

    def check_overdue(self):
        """ตรวจสอบว่าเกินกำหนดชำระหรือไม่"""
        if self.status == 'active' and self.next_payment_date < timezone.now().date():
            self.status = 'overdue'
            self.save()

    def calculate_close_amount(self):
        """
        คำนวณยอดปิดบัญชี (ลดดอกเบี้ยตามจำนวนเดือนที่เหลือ)
        
        Returns:
            dict: {
                'remaining_installments': จำนวนงวดที่เหลือ,
                'remaining_months': จำนวนเดือนที่เหลือ,
                'principal_per_installment': ต้นเงินต่องวด,
                'remaining_principal': ต้นเงินที่เหลือ,
                'interest_per_month': ดอกเบี้ยต่อเดือน,
                'remaining_interest': ดอกเบี้ยที่เหลือ,
                'discount': ส่วนลด (ดอกเบี้ยตามเดือนที่เหลือ),
                'close_amount': ยอดปิดบัญชี
            }
        """
        remaining_installments = self.installment_count - self.paid_count
        
        # คำนวณจำนวนเดือนที่เหลือ
        if self.period_type == 'รายปี':
            remaining_months = remaining_installments * 12
        else:
            remaining_months = remaining_installments
        
        # คำนวณต้นเงินต่องวด
        principal_per_installment = float(self.finance_amount) / self.installment_count
        remaining_principal = principal_per_installment * remaining_installments
        
        # คำนวณดอกเบี้ยต่อเดือน (ปัดเศษ: < 0.5 ปัดลง, >= 0.5 ปัดขึ้น)
        interest_per_month_raw = float(self.finance_amount) * (float(self.interest_rate) / 100)
        interest_per_month = round(interest_per_month_raw)
        
        # ดอกเบี้ยที่เหลือ = หนี้คงเหลือ - ต้นเงินที่เหลือ
        remaining_interest = float(self.remaining_balance) - remaining_principal
        
        # ส่วนลด = ดอกเบี้ยต่อเดือน × จำนวนเดือนที่เหลือ
        discount = interest_per_month * remaining_months
        
        # ยอดปิดบัญชี = หนี้คงเหลือ - ส่วนลด
        close_amount = float(self.remaining_balance) - discount
        
        return {
            'remaining_installments': remaining_installments,
            'remaining_months': remaining_months,
            'principal_per_installment': round(principal_per_installment, 2),
            'remaining_principal': round(remaining_principal, 2),
            'interest_per_month': round(interest_per_month, 2),
            'remaining_interest': round(remaining_interest, 2),
            'discount': round(discount, 2),
            'close_amount': round(close_amount, 2)
        }