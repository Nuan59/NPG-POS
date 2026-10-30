# TaskPost.py
# วางไฟล์นี้ใน: backend/api/models/TaskPost.py
from django.db import models


class TaskPost(models.Model):
    """
    โพสต์ประกาศ/มอบหมายงาน - ใครก็โพสต์ได้ (admin เห็นทุกโพสต์เสมอ)
    - post_type = "general"  -> ประกาศทั่วไป ทุกคนเห็นเหมือนกัน ไม่มีสถานะ แต่ตั้งกำหนดเวลาเดียวได้ (due_date)
    - post_type = "assigned" -> มอบหมายเฉพาะคน แต่ละคนมีสถานะ+กำหนดเวลา+เป้าหมายความคืบหน้าของตัวเอง (ดู TaskAssignment)
    """
    POST_TYPE_CHOICES = [
        ("general", "ประกาศทั่วไป"),
        ("assigned", "มอบหมายงาน"),
    ]

    content = models.TextField(verbose_name="เนื้อหา")
    post_type = models.CharField(max_length=20, choices=POST_TYPE_CHOICES, default="general")
    created_by = models.CharField(max_length=255, blank=True, default="")  # ชื่อที่โชว์ (คนโพสต์)
    created_by_username = models.CharField(max_length=255, blank=True, default="")  # username จริง (เช็คสิทธิ์)

    # ✅ กำหนดเวลาของ "ประกาศทั่วไป" เอง (ไม่ได้ใช้กับ "มอบหมายงาน" - นั่นใช้ due_date ใน TaskAssignment แยกรายคนแทน)
    due_date = models.DateTimeField(null=True, blank=True, verbose_name="กำหนดเวลา")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "task_post"
        ordering = ["-created_at"]

    def __str__(self):
        return f"TaskPost-{self.id} ({self.post_type})"


class TaskAssignment(models.Model):
    """
    สถานะ+กำหนดเวลา+ความคืบหน้าของพนักงานแต่ละคนที่ถูกมอบหมายในโพสต์เดียวกัน - แยกกันคนละแถว
    เพื่อให้แต่ละคนมีสถานะ/กำหนดเวลา/เป้าหมายของตัวเองโดยไม่กระทบคนอื่นในโพสต์เดียวกัน
    """
    STATUS_CHOICES = [
        ("pending", "ยังไม่ทำ"),
        ("in_progress", "กำลังทำ"),
        ("issue", "ติดปัญหา"),
        ("done", "ทำแล้ว"),
    ]

    post = models.ForeignKey(TaskPost, on_delete=models.CASCADE, related_name="assignments")
    employee = models.ForeignKey("User", on_delete=models.CASCADE, related_name="task_assignments")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    note = models.TextField(blank=True, default="", verbose_name="หมายเหตุ")
    # ✅ กำหนดเวลา - ตั้งแยกได้คนละกำหนดต่อคน (ไม่บังคับ) ใช้เตือนตอนเกินกำหนดในหน้า TaskBoard
    due_date = models.DateTimeField(null=True, blank=True, verbose_name="กำหนดเวลา")
    completed_at = models.DateTimeField(null=True, blank=True)

    # ✅ เป้าหมายความคืบหน้า - ไม่บังคับ แล้วแต่งาน (เช่น ลอกลาย 200 คัน)
    # target_quantity ว่าง = งานนี้ไม่ใช้ระบบติดตามความคืบหน้าแบบจำนวน
    target_quantity = models.IntegerField(null=True, blank=True, verbose_name="เป้าหมายจำนวน")
    target_unit = models.CharField(max_length=50, blank=True, default="", verbose_name="หน่วยนับ")
    current_progress = models.IntegerField(default=0, verbose_name="ความคืบหน้าปัจจุบัน")

    class Meta:
        db_table = "task_assignment"
        unique_together = ("post", "employee")

    def __str__(self):
        return f"Assignment-{self.id} - {self.employee_id} - {self.status}"


class TaskProgressLog(models.Model):
    """
    ประวัติการอัปเดตความคืบหน้ารายวันของแต่ละ assignment - บวกสะสมเข้า current_progress
    คนทำงานกรอก "วันนี้ทำได้เพิ่มเท่าไหร่" (amount) ระบบบวกสะสมให้อัตโนมัติ เก็บไว้ดูย้อนหลังได้ว่าวันไหนทำได้เท่าไหร่
    """
    assignment = models.ForeignKey(TaskAssignment, on_delete=models.CASCADE, related_name="progress_logs")
    amount = models.IntegerField(verbose_name="จำนวนที่เพิ่ม")
    note = models.TextField(blank=True, default="", verbose_name="หมายเหตุ")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "task_progress_log"
        ordering = ["-created_at"]

    def __str__(self):
        return f"ProgressLog-{self.id} - assignment {self.assignment_id} - +{self.amount}"


class TaskCheckin(models.Model):
    """
    ✅ เช็คอินงานประจำวัน - พนักงานต้องอัปเดตงานค้างของตัวเองครบก่อนใช้ POS (วันละครั้ง)
    1 แถว = พนักงาน 1 คน เช็คอินแล้วใน 1 วัน (วันที่ตามเวลาไทย)
    ตารางสร้างผ่าน /dev/create-task-checkin-tables/
    """
    user = models.ForeignKey("User", on_delete=models.CASCADE, related_name="task_checkins")
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "task_checkin"
        unique_together = ("user", "date")


class TaskAssignmentTouch(models.Model):
    """
    ✅ เวลาที่พนักงานอัปเดตงานนี้ล่าสุด (เปลี่ยนสถานะ / เพิ่มความคืบหน้า / เช็คอิน)
    แยกตารางไว้ ไม่เพิ่มคอลัมน์ใน task_assignment - หน้างานเดิมไม่กระทบแม้ยังไม่ได้สร้างตาราง
    """
    assignment = models.OneToOneField(TaskAssignment, on_delete=models.CASCADE, primary_key=True, related_name="touch")
    last_update_at = models.DateTimeField()

    class Meta:
        db_table = "task_assignment_touch"


class DailyNote(models.Model):
    """
    ✅ Note ปิดร้านประจำวัน - พนักงานคนละ 1 note ต่อวัน (adm เท่านั้นที่ดูได้)
    checklist = { key: true/false } / today = วันนี้เกิดอะไรขึ้น (บังคับ) / issue = ปัญหา / tomorrow = ฝากงานพรุ่งนี้
    ตารางสร้างผ่าน /dev/create-daily-note-table/
    """
    user = models.ForeignKey("User", on_delete=models.CASCADE, related_name="daily_notes")
    date = models.DateField()
    checklist = models.JSONField(default=dict, blank=True)
    today = models.TextField(blank=True, default="")
    issue = models.TextField(blank=True, default="")
    tomorrow = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "daily_note"
        unique_together = ("user", "date")