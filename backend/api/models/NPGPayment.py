from django.db import models
from django.utils import timezone


class NPGPayment(models.Model):
    """
    ประวัติการชำระเงิน NPG
    """
    account = models.ForeignKey(
        'NPGAccount',
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name='บัญชี NPG'
    )
    
    payment_date = models.DateField(
        default=timezone.now,
        verbose_name='วันที่ชำระ'
    )
    
    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='จำนวนเงินที่ชำระ'
    )
    
    installment_number = models.IntegerField(
        verbose_name='งวดที่'
    )
    
    remaining_balance_after = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='หนี้คงเหลือหลังชำระ'
    )
    
    note = models.TextField(
        blank=True,
        null=True,
        verbose_name='หมายเหตุ'
    )
    
    created_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='npg_payments',
        verbose_name='ผู้บันทึก'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'npg_payments'
        verbose_name = 'ประวัติการชำระ NPG'
        verbose_name_plural = 'ประวัติการชำระ NPG'
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        customer_name = self.account.order.customer.name if self.account and self.account.order and self.account.order.customer else "ไม่ระบุ"
        return f"Payment-{self.id} - {customer_name} - งวดที่ {self.installment_number}"

    def save(self, *args, **kwargs):
        """Override save เพื่ออัพเดทข้อมูลบัญชีอัตโนมัติ"""
        super().save(*args, **kwargs)
        
        # อัพเดทข้อมูลบัญชี
        account = self.account
        account.paid_count = self.installment_number
        account.total_paid = float(account.total_paid) + float(self.amount_paid)
        account.remaining_balance = self.remaining_balance_after
        account.last_payment_date = self.payment_date
        
        # ตรวจสอบว่าชำระครบหรือยัง
        if account.paid_count >= account.installment_count or account.remaining_balance <= 0:
            account.status = 'completed'
        
        account.save()