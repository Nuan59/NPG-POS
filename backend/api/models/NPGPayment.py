from django.db import models
from django.utils import timezone


class NPGPayment(models.Model):
    """
    ประวัติการชำระเงิน NPG
    """
    PAYMENT_METHOD_CHOICES = [
        ("เงินสด", "เงินสด"),
        ("เงินโอน", "เงินโอน"),
        ("เช็ค", "เช็ค"),
    ]

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

    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        blank=True,
        default="",
        verbose_name='วิธีการชำระ'
    )
    transfer_bank = models.CharField(max_length=20, blank=True, default="", verbose_name='ธนาคาร (กรณีโอน)')
    check_number = models.CharField(max_length=50, blank=True, default="", verbose_name='เลขที่เช็ค (กรณีเช็ค)')

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

    edited_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='npg_payments_edited',
        verbose_name='ผู้แก้ไขล่าสุด'
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

    # ⚠️ หมายเหตุ: ไม่มี save() override อัปเดตยอดบัญชีอัตโนมัติแล้ว
    # (เดิมมี override ที่บวก amount_paid เข้า account.total_paid ทุกครั้งที่ save()
    #  ซึ่งพอมีการ "แก้ไข" รายการที่เคยบันทึกแล้ว จะบวกซ้ำ ทำให้ยอดเพี้ยน)
    # ตอนนี้การอัปเดตยอดบัญชี (total_paid, remaining_balance, paid_count, status)
    # ทำผ่านฟังก์ชัน _recalc_account() ใน NPGViewSet.py แทน โดยคำนวณจาก
    # ผลรวมของทุก payment ใหม่ทั้งหมดทุกครั้ง (ไม่ใช่การบวกสะสม) จึงถูกต้องเสมอ
    # ไม่ว่าจะเป็นการสร้างใหม่ หรือแก้ไขรายการเก่า