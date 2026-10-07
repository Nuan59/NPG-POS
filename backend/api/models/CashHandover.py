# CashHandover.py
# วางไฟล์นี้ใน: backend/api/models/CashHandover.py
# ⚠️ เพิ่มบรรทัดนี้ใน backend/api/models/__init__.py ด้วย:
#     from .CashHandover import CashHandover, CashHandoverItem, CashHandoverConfig
# ตารางสร้างผ่าน /dev/create-cash-handover-tables/ (raw SQL ไม่ผ่าน migration)
from django.db import models


class CashHandoverConfig(models.Model):
    """
    วันเวลาที่เริ่มใช้ระบบส่งเงิน - รายการเงินสดที่เกิดก่อนเวลานี้จะไม่ขึ้นค้างส่ง
    (ตั้งให้อัตโนมัติตอนเรียก /dev/create-cash-handover-tables/ ครั้งแรก)
    """
    start_at = models.DateTimeField()

    class Meta:
        db_table = 'cash_handover_config'


class CashHandover(models.Model):
    """ใบส่งเงิน 1 ใบ = พนักงานกดส่งเงินสด 1 ครั้ง (รวมได้หลายรายการ)"""
    STATUS_CHOICES = [
        ('pending', 'รอ adm รับ'),
        ('received', 'รับแล้ว'),
        ('mismatch', 'รับแล้ว ยอดไม่ตรง'),
    ]

    created_by_username = models.CharField(max_length=255)
    created_by_name = models.CharField(max_length=255, blank=True, default='')
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    note = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    received_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    received_by = models.CharField(max_length=255, blank=True, default='')
    received_at = models.DateTimeField(null=True, blank=True)
    received_note = models.TextField(blank=True, default='')
    # รายรับที่ลงหน้า รายรับ-รายจ่าย ให้อัตโนมัติตอนรับเงิน
    cashflow_entry_id = models.BigIntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cash_handover'
        ordering = ['-created_at']


class CashHandoverItem(models.Model):
    """
    รายการเงินสดในใบส่งเงิน - ชี้กลับไปที่รายการต้นทาง (source + source_id)
    1 รายการต้นทางอยู่ได้ในใบส่งเงินใบเดียวเท่านั้น (unique) กันส่งซ้ำ
    """
    SOURCE_CHOICES = [
        ('sale', 'ขาย'),
        ('service', 'งานบริการ'),
        ('npg_payment', 'ค่างวด NPG'),
        ('npg_fee', 'ค่าธรรมเนียม NPG'),
    ]

    handover = models.ForeignKey(CashHandover, on_delete=models.CASCADE, related_name='items')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    source_id = models.BigIntegerField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=500, blank=True, default='')
    record_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'cash_handover_item'
        unique_together = [('source', 'source_id')]