from django.db import models
from .Order import Order
from .User import User


class RegistrationLog(models.Model):
    """เก็บประวัติการเปลี่ยนสถานะทะเบียน"""

    order       = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_logs')
    from_status = models.CharField(max_length=20)
    to_status   = models.CharField(max_length=20)
    changed_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    changed_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-changed_at']

    def __str__(self):
        return f"Order {self.order_id}: {self.from_status} → {self.to_status}"