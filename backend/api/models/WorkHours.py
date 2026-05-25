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