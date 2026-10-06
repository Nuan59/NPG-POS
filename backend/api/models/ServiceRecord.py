# ServiceRecord.py
# วางไฟล์นี้ใน: backend/api/models/ServiceRecord.py
# ⚠️ ต้องเพิ่มบรรทัดนี้ใน backend/api/models/__init__.py ด้วย:
#     from .ServiceRecord import ServiceRecord
from django.db import models


class ServiceRecord(models.Model):
    """
    รายการรับบริการ (ซ่อม / ต่อภาษี+พรบ / อื่นๆ) - แยกขาดจาก Order (งานขาย)
    ผูกกับรถเป็น "ประวัติ" อย่างเดียว ไม่แตะสถานะ sold / สต็อกของรถ
    ตารางสร้างผ่าน /dev/create-service-record-table/ (raw SQL ไม่ผ่าน migration)
    """
    TRANSACTION_TYPE_CHOICES = [
        ('ซ่อม', 'ซ่อม'),
        ('ต่อภาษี+พรบ', 'ต่อภาษี+พรบ'),
        ('อื่นๆ', 'อื่นๆ'),
    ]

    service_date = models.DateField(verbose_name='วันที่รับบริการ')
    customer = models.ForeignKey('Customer', on_delete=models.SET_NULL, null=True, related_name='service_records')
    # null ได้เฉพาะข้อมูลเก่าที่ย้ายมาจาก Order แล้วไม่มีรถผูก - รายการใหม่บังคับเลือกรถเสมอ (เช็คใน ViewSet)
    bike = models.ForeignKey('Bike', on_delete=models.SET_NULL, null=True, blank=True, related_name='service_records')

    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES, verbose_name='ประเภทงาน')
    transaction_type_detail = models.CharField(max_length=255, blank=True, default='', verbose_name='รายละเอียดประเภทงาน (อื่นๆ)')
    mileage = models.IntegerField(null=True, blank=True, verbose_name='เลขไมล์ (กม.)')

    # รายการย่อย [{ "description": "เปลี่ยนยาง", "amount": 1200 }, ...]
    items = models.JSONField(default=list, blank=True, verbose_name='รายการ')
    total = models.FloatField(default=0, verbose_name='ยอดรวม')

    payment_type = models.CharField(max_length=50, blank=True, default='', verbose_name='รูปแบบการชำระ')
    transfer_bank = models.CharField(max_length=50, blank=True, default='', verbose_name='ธนาคารโอน')
    check_number = models.CharField(max_length=100, blank=True, default='', verbose_name='เลขที่เช็ค')

    notes = models.TextField(blank=True, default='', verbose_name='หมายเหตุ')
    created_by = models.CharField(max_length=255, blank=True, default='', verbose_name='ผู้บันทึก')
    created_at = models.DateTimeField(auto_now_add=True)

    # id ของ Order เดิม (เฉพาะข้อมูลที่ย้ายมาจากตาราง Order) - กันย้ายซ้ำ
    legacy_order_id = models.IntegerField(null=True, blank=True, unique=True)

    class Meta:
        db_table = 'service_record'
        ordering = ['-service_date', '-id']
        verbose_name = 'รายการรับบริการ'
        verbose_name_plural = 'รายการรับบริการ'

    def __str__(self):
        return f"S-{self.id} {self.transaction_type} - {self.customer.name if self.customer else '-'}"