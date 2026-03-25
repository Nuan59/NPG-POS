import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'Nuan')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'lnwlion555@gmail.com')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'Nua0898535959.')

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(
        username=username,
        email=email,
        password=password,
        name=username,
        role='adm'
    )
    print(f'✅ Superuser {username} created!')
else:
    print(f'⚠️  User {username} already exists')