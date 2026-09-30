# Announcement.py
# วางไฟล์นี้ใน: backend/api/models/Announcement.py
from django.db import models


class Announcement(models.Model):
    """
    ประกาศตัวหนังสือไหลใต้ Navbar - เห็นได้ทุกคนที่ login แล้ว
    สร้าง/ลบ/เปิดปิดได้เฉพาะ admin เท่านั้น (เช็คสิทธิ์ใน AnnouncementViewSet)
    ถ้ามีหลายอันที่ is_active=True พร้อมกัน จะต่อกันเป็นข้อความเดียวคั่นด้วย ★ ในแถบวิ่ง
    - content: ข้อความสั้นที่โชว์ในแถบไหล
    - detail: รายละเอียดเพิ่มเติม (ไม่บังคับ) - โชว์ตอนกดที่แถบไหลเพื่อดูรายละเอียดเต็ม
    """
    content = models.TextField(verbose_name="ข้อความประกาศ")
    detail = models.TextField(blank=True, default="", verbose_name="รายละเอียดเพิ่มเติม")
    is_active = models.BooleanField(default=True, verbose_name="แสดงอยู่")
    created_by = models.CharField(max_length=255, blank=True, default="")
    created_by_username = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "announcement"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Announcement-{self.id}: {self.content[:30]}"