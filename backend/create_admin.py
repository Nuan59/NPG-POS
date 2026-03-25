import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import User

try:
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
        print(f'✅ Admin user created: {username}')
    else:
        print(f'⚠️  User {username} already exists')
    
    # Exit with success code
    sys.exit(0)
    
except Exception as e:
    print(f'❌ Error: {e}')
    # Exit with success code anyway to continue with gunicorn
    sys.exit(0)