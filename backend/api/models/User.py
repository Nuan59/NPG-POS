from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    name = models.CharField(max_length=150)
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=150)

    ROLE_CHOICES = [
        ('adm', 'Admin'),
        ('emp', 'Employee')
    ]

    role = models.CharField(max_length=3, choices=ROLE_CHOICES)

    # permissions สำหรับ emp (adm เห็นทุกอย่างอยู่แล้ว)
    permissions = models.JSONField(
        default=dict,
        blank=True,
        help_text='{"sale": true, "inventory": true, "customer": true, "registration": false, "npg": false, "board": false}'
    )

    def get_permissions_dict(self):
        """คืนค่า permissions พร้อม default ครบทุก key"""
        defaults = {
            "sale": False,
            "inventory": False,
            "customer": False,
            "registration": False,
            "npg": False,
            "board": False,
        }
        if isinstance(self.permissions, dict):
            defaults.update(self.permissions)
        return defaults