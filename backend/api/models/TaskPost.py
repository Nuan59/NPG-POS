# TaskPost.py
# วางไฟล์นี้ใน: backend/api/models/TaskPost.py
from django.db import models


class TaskPost(models.Model):
    """
    โพสต์ประกาศ/มอบหมายงาน - ใครก็โพสต์ได้ (admin เห็นทุกโพสต์เสมอ)
    - post_type = "general"  -> ประกาศทั่วไป ทุกคนเห็นเหมือนกัน ไม่มีสถานะ
    - post_type = "assigned" -> มอบหมายเฉพาะคน แต่ละคนมีสถานะ+กำหนดเวลาของตัวเอง (ดู TaskAssignment)
    """
    POST_TYPE_CHOICES = [
        ("general", "ประกาศทั่วไป"),
        ("assigned", "มอบหมายงาน"),
    ]

    content = models.TextField(verbose_name="เนื้อหา")
    post_type = models.CharField(max_length=20, choices=POST_TYPE_CHOICES, default="general")
    created_by = models.CharField(max_length=255, blank=True, default="")  # ชื่อที่โชว์ (คนโพสต์)
    created_by_username = models.CharField(max_length=255, blank=True, default="")  # username จริง (เช็คสิทธิ์)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "task_post"
        ordering = ["-created_at"]

    def __str__(self):
        return f"TaskPost-{self.id} ({self.post_type})"


class TaskAssignment(models.Model):
    """
    สถานะ+กำหนดเวลาของพนักงานแต่ละคนที่ถูกมอบหมายในโพสต์เดียวกัน - แยกกันคนละแถว
    เพื่อให้แต่ละคนมีสถานะ/กำหนดเวลาของตัวเองโดยไม่กระทบคนอื่นในโพสต์เดียวกัน
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

    class Meta:
        db_table = "task_assignment"
        unique_together = ("post", "employee")

    def __str__(self):
        return f"Assignment-{self.id} - {self.employee_id} - {self.status}"