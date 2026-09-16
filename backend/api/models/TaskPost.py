# TaskPost.py
# วางไฟล์นี้ใน: backend/api/models/TaskPost.py
# แล้วเพิ่มบรรทัดนี้ใน backend/api/models/__init__.py (ที่เดียวกับที่ import NPGAccount, NPGPayment):
#   from .TaskPost import TaskPost, TaskAssignment
from django.db import models


class TaskPost(models.Model):
    """
    โพสต์ประกาศ/มอบหมายงานให้พนักงาน (สร้างได้เฉพาะ admin)
    - post_type = "general"  -> ประกาศทั่วไป ทุกคนเห็นเหมือนกัน ไม่มีสถานะ
    - post_type = "assigned" -> มอบหมายเฉพาะคน แต่ละคนมีสถานะทำ/ไม่ทำแยกกัน (ดู TaskAssignment)
    """
    POST_TYPE_CHOICES = [
        ("general", "ประกาศทั่วไป"),
        ("assigned", "มอบหมายงาน"),
    ]

    content = models.TextField(verbose_name="เนื้อหา")
    post_type = models.CharField(max_length=20, choices=POST_TYPE_CHOICES, default="general")
    created_by = models.CharField(max_length=255, blank=True, default="")  # ชื่อ admin ที่โพสต์

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "task_post"
        ordering = ["-created_at"]

    def __str__(self):
        return f"TaskPost-{self.id} ({self.post_type})"


class TaskAssignment(models.Model):
    """
    สถานะงานของพนักงานแต่ละคนที่ถูกมอบหมายในโพสต์เดียวกัน - แยกกันคนละแถว
    เพื่อให้แต่ละคนติ๊ก "ทำแล้ว" ของตัวเองได้โดยไม่กระทบคนอื่นในโพสต์เดียวกัน
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
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "task_assignment"
        unique_together = ("post", "employee")

    def __str__(self):
        return f"Assignment-{self.id} - {self.employee_id} - {self.status}"