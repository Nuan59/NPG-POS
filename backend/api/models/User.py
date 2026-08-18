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

    # ✅ สิทธิ์การเข้าถึงแต่ละหน้า (เฉพาะ role="emp" - adm เข้าได้ทุกหน้าอยู่แล้วไม่ต้องเช็ค)
    # เก็บเป็น {"sale": true, "inventory": false, ...} ตรงกับ PERMISSION_LIST ฝั่ง frontend
    permissions = models.JSONField(default=dict, blank=True, null=True)