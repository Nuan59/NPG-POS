# ExpenseRequest.py
# วางไฟล์นี้ใน: backend/api/models/ExpenseRequest.py
# ตารางสร้างผ่าน /dev/create-expense-request-table/ (raw SQL ไม่ผ่าน migration)
from django.db import models


class ExpenseRequest(models.Model):
    """
    รายการขอจ่ายเงิน - พนักงานแจ้งขอจ่าย → adm อนุมัติ → ลงรายจ่าย (เงินสด) ในหน้า รายรับ-รายจ่าย ให้อัตโนมัติ
    """
    STATUS_CHOICES = [
        ('pending', 'รออนุมัติ'),
        ('approved', 'อนุมัติแล้ว'),
        ('rejected', 'ไม่อนุมัติ'),
    ]

    created_by_username = models.CharField(max_length=255)
    created_by_name = models.CharField(max_length=255, blank=True, default='')
    category = models.CharField(max_length=50, blank=True, default='')
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    # รูปใบเสร็จ เก็บเป็น data URL (ย่อรูปจากฝั่งหน้าเว็บก่อนส่ง) - ไม่ต้องตั้งค่าที่เก็บไฟล์เพิ่ม
    receipt_image = models.TextField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    decided_by = models.CharField(max_length=255, blank=True, default='')
    decided_at = models.DateTimeField(null=True, blank=True)
    reject_reason = models.TextField(blank=True, default='')
    # รายจ่ายที่ลงหน้า รายรับ-รายจ่าย ตอนอนุมัติ
    cashflow_entry_id = models.BigIntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'expense_request'
        ordering = ['-created_at']