import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import User

username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'Nuan')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'lnwlion555@gmail.com')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'Nua0898535959.')

if not User.objects.filter(username=username).exists():
    # สร้าง Admin user (role='adm') ที่สามารถเข้า Django Admin ได้
    user = User.objects.create_superuser(
        username=username,
        email=email,
        password=password,
        name=username,
        role='adm'  # ตั้งเป็น Admin role
    )
    print(f'✅ Admin user created: {username} (role=adm, is_superuser=True)')
else:
    print(f'⚠️  User {username} already exists')