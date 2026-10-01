# AnnouncementSettings.py
# วางไฟล์นี้ใน: backend/api/models/AnnouncementSettings.py
from django.db import models


class AnnouncementSettings(models.Model):
    """
    ค่าตั้งค่ากลางของแถบประกาศไหล - มีแถวเดียวเสมอ (pk=1)
    speed_seconds = จำนวนวินาทีต่อรอบการไหล 1 รอบ - ยิ่งน้อยยิ่งไหลเร็ว
    """
    speed_seconds = models.IntegerField(default=40, verbose_name="ความเร็ว (วินาทีต่อรอบ)")

    class Meta:
        db_table = "announcement_settings"

    def __str__(self):
        return f"AnnouncementSettings (speed={self.speed_seconds}s)"