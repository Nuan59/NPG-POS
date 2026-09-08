from django.db import models


class CashflowEntry(models.Model):
    """รายการรายรับ-รายจ่ายรายวัน แยก เงินสด / โอน (1 แถว = 1 รายการ)"""

    SECTION_CHOICES = [
        ("cash", "เงินสด"),
        ("transfer", "โอน"),
    ]

    date = models.DateField(db_index=True)
    section = models.CharField(max_length=10, choices=SECTION_CHOICES)
    seq = models.PositiveIntegerField(default=0)

    description = models.CharField(max_length=255, blank=True, default="")

    income = models.DecimalField(max_digits=12, decimal_places=2, default=0)          # รายรับ
    sent = models.DecimalField(max_digits=12, decimal_places=2, default=0)            # ส่งเงิน
    expense = models.DecimalField(max_digits=12, decimal_places=2, default=0)         # รายจ่าย
    change = models.DecimalField(max_digits=12, decimal_places=2, default=0)          # ทอนเงิน
    deposit_return = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # คืนมัดจำ
    # ✅ เปิดบิล - เอาเงินเข้าลิ้นชัก (เพิ่มยอดคงเหลือเหมือน income) แต่ "ไม่ใช่รายรับ/รายได้จริง"
    # แยกคอลัมน์ต่างหาก ไม่ให้ปนกับ income เพื่อไม่ให้รายงานรายได้เพี้ยน
    cash_in = models.DecimalField(max_digits=12, decimal_places=2, default=0)         # เปิดบิล

    created_by = models.CharField(max_length=255, blank=True, default="")  # ชื่อพนักงานที่บันทึกรายการนี้

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "cashflow_entry"
        ordering = ["date", "section", "seq"]
        indexes = [models.Index(fields=["date", "section"], name="cashflow_date_section_idx")]
        
    def __str__(self):
        return f"{self.date} [{self.section}] {self.description}"


class CashflowDayMeta(models.Model):
    """ยอดยกมาที่พนักงานแก้ไขเอง (override) + ผู้เช็คเงินท้ายวัน"""

    date = models.DateField(unique=True, db_index=True)
    cash_opening_override = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    transfer_opening_override = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    checker_name = models.CharField(max_length=255, blank=True, default="")  # ผู้เช็คเงิน
    checker_date = models.DateField(null=True, blank=True)

    # ✅ บันทึกการนับเงินสดปลายวัน - แค่บันทึกไว้เป็นประวัติ ไม่มีผลกับยอดคำนวณในระบบเลย
    # (ยอดจริงคำนวณจากรายรับ-รายจ่ายเสมอ นี่แค่เก็บว่า "วันนี้นับได้เท่าไหร่ ต่างจากระบบเท่าไหร่")
    counted_cash_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="ยอดเงินสดที่นับได้จริง")
    counted_by = models.CharField(max_length=255, blank=True, default="", verbose_name="ผู้นับเงิน")
    counted_at = models.DateTimeField(null=True, blank=True, verbose_name="เวลาที่นับเงิน")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "cashflow_day_meta"

    def __str__(self):
        return f"CashflowDayMeta({self.date})"