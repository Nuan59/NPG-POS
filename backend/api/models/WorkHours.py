from django.db import models

class WorkHours(models.Model):
    start_hour = models.IntegerField(default=8)
    start_minute = models.IntegerField(default=0)
    end_hour = models.IntegerField(default=18)
    end_minute = models.IntegerField(default=0)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Work Hours"

    def __str__(self):
        return f"{self.start_hour:02d}:{self.start_minute:02d} - {self.end_hour:02d}:{self.end_minute:02d}"

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

class LoginLog(models.Model):
    """
    ✅ ประวัติเข้า-ออกระบบ (ใช้ในรายงานพนักงาน)
    1 แถว = เข้าระบบ 1 ครั้ง / logout_at ว่าง = ไม่ได้กดออกระบบ (ปิดเบราว์เซอร์เฉยๆ หรือ token หมดอายุ)
    ตารางสร้างผ่าน /dev/create-login-log-table/ (raw SQL ไม่ผ่าน migration)
    """
    user = models.ForeignKey("User", on_delete=models.CASCADE, related_name="login_logs")
    login_at = models.DateTimeField(auto_now_add=True)
    logout_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "login_log"
        ordering = ["-login_at"]