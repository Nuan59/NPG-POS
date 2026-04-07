import os
import dotenv
from pathlib import Path
from datetime import timedelta
import dj_database_url

env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(env_file):
    dotenv.load_dotenv(env_file)

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("SECRET_KEY", "django-insecure-change-this-in-production")
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"

allowed_hosts_str = os.environ.get("ALLOWED_HOSTS", "")
if allowed_hosts_str:
    if "," in allowed_hosts_str:
        ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_str.split(",") if h.strip()]
    else:
        ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_str.split() if h.strip()]
else:
    ALLOWED_HOSTS = [
        'backend-service-production-1fc3.up.railway.app',
        '.railway.app',
    ]

if DEBUG:
    ALLOWED_HOSTS += ['localhost', '127.0.0.1', '192.168.1.174', '0.0.0.0', '*']

# CORS Settings
cors_origins = os.environ.get("CORS_ALLOWED_ORIGINS", "")
if cors_origins:
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]
else:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://192.168.1.185:3000",
        "https://npg-pos.vercel.app",
    ]

# ✅ รองรับทุก Vercel preview domain อัตโนมัติ
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://npg-.*\.vercel\.app$",
]

if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOW_CREDENTIALS = True

# CSRF Settings
CSRF_TRUSTED_ORIGINS = [
    "https://backend-service-production-1fc3.up.railway.app",
    "https://npg-pos.vercel.app",
    "https://*.vercel.app",  # ✅ รองรับทุก preview domain
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    'rest_framework',
    'api'
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    )
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=13),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=5),
    "TOKEN_OBTAIN_SERIALIZER": "api.serializers.CustomTokenObtainPairSerializer",
}

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"

if os.environ.get('DATABASE_URL'):
    DATABASES = {
        'default': dj_database_url.config(
            default=os.environ.get('DATABASE_URL'),
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

WHITENOISE_MANIFEST_STRICT = False
WHITENOISE_AUTOREFRESH = True

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = 'api.User'