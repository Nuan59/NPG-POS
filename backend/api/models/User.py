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