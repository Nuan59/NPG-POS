"""
✅ ค่าตั้งสำหรับรันชุดทดสอบ (python manage.py test --settings=core.test_settings)
- ใช้ SQLite ในหน่วยความจำ ไม่แตะฐานข้อมูลจริง
- สร้างตารางจาก models ตรงๆ (ไม่ผ่าน migration) เพราะหลายตารางในโปรเจกต์สร้างด้วย raw SQL นอก migration
"""
import os

os.environ.pop("DATABASE_URL", None)

from .settings import *  # noqa: E402,F401,F403

DEBUG = False
ALLOWED_HOSTS = ["testserver", "localhost"]
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
MIGRATION_MODULES = {"api": None}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
