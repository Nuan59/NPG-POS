"""
✅ สต็อกอะไหล่
- Part          = อะไหล่ 1 รายการ (ยอดคงเหลือ qty เก็บไว้ตรงนี้ อัปเดตพร้อมการเคลื่อนไหวทุกครั้ง)
- PartMovement  = ทุกครั้งที่ของเข้า/ออก (รับเข้า / ขาย / ใช้ในงานซ่อม / คืน / ปรับยอด) - ย้อนดูได้ว่าหายไปไหน
ตารางสร้างเองตอนใช้งานครั้งแรก (api/parts.py ensure_tables) - managed=False ไม่ผ่าน migration
"""
from django.db import models


class Part(models.Model):
    code = models.CharField(max_length=50, blank=True, default='', verbose_name='รหัส')
    name = models.CharField(max_length=200, verbose_name='ชื่ออะไหล่')
    fits = models.CharField(max_length=255, blank=True, default='', verbose_name='ใช้กับรุ่น')
    unit = models.CharField(max_length=20, blank=True, default='ชิ้น', verbose_name='หน่วย')
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='ราคาทุน (เฉลี่ย)')
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='ราคาขาย')
    wholesale_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name='ราคาส่ง')
    qty = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='คงเหลือ')
    min_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='เตือนเมื่อเหลือไม่เกิน')
    location = models.CharField(max_length=100, blank=True, default='', verbose_name='ที่เก็บ')
    notes = models.TextField(blank=True, default='')
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'part'
        ordering = ['name']

    def __str__(self):
        return f"{self.code} {self.name}".strip()


class PartMovement(models.Model):
    KIND_LABEL = {
        'in': 'รับเข้า',
        'sale': 'ขายหน้าร้าน',
        'service': 'ใช้ในงานซ่อม',
        'return': 'คืนเข้าสต็อก',
        'adjust': 'ปรับยอด',
    }

    part = models.ForeignKey(Part, on_delete=models.DO_NOTHING, db_constraint=False, related_name='movements')
    kind = models.CharField(max_length=20)
    qty = models.DecimalField(max_digits=12, decimal_places=2)          # + เข้า / - ออก
    qty_after = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    ref_type = models.CharField(max_length=20, blank=True, default='')  # service
    ref_id = models.BigIntegerField(null=True, blank=True)
    supplier = models.CharField(max_length=200, blank=True, default='')
    bill_no = models.CharField(max_length=100, blank=True, default='')
    note = models.CharField(max_length=255, blank=True, default='')
    created_by = models.CharField(max_length=150, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'part_movement'
        ordering = ['-created_at', '-id']
