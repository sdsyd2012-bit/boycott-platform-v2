"""
Django settings for config project — Production-Ready.

إعدادات جاهزة للنشر على أي استضافة PaaS مجانية (Render/Railway/...):
- كل الإعدادات الحساسة تُقرأ من متغيرات البيئة أو ملف `.env`.
- قاعدة البيانات: PostgreSQL عبر `DATABASE_URL`، مع الرجوع إلى SQLite محلياً.
- الملفات الثابتة تُخدم عبر WhiteNoise، وملفات Media عبر المسار `/media/`.
- CORS آمن: لا يُسمح إلا للأصول المصرّح بها عبر `DJANGO_CORS_ORIGINS`.
"""

import os
from pathlib import Path

import dj_database_url

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_dotenv():
    """تحميل متغيرات ملف `.env` المحلي إن وُجد (بدون اعتماديات خارجية)."""
    env_path = BASE_DIR / '.env'
    if not env_path.exists():
        return
    try:
        with open(env_path, encoding='utf-8') as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, _, value = line.partition('=')
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
    except OSError:
        pass


def _env_bool(name, default=False):
    return os.environ.get(name, str(default)).lower() in ('true', '1', 'yes', 'on')


def _env_int(name, default=0):
    try:
        return int(os.environ.get(name, '').strip() or default)
    except (TypeError, ValueError):
        return default


def _env_list(name, default=None):
    value = os.environ.get(name, '').strip()
    if not value:
        return default or []
    return [item.strip() for item in value.split(',') if item.strip()]


_load_dotenv()

# ────────────────────────── الأساسيات ──────────────────────────

DEBUG = _env_bool('DJANGO_DEBUG', False)

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-dev-only-key-not-for-production'
    else:
        raise ImproperlyConfigured(
            'DJANGO_SECRET_KEY must be set in the environment when DEBUG=False.'
        )

ALLOWED_HOSTS = _env_list('DJANGO_ALLOWED_HOSTS')

# نطاقات تُضاف تلقائياً عند النشر على استضافات PaaS مجانية شهيرة.
# البادئة "." تعني النطاق وجميع نطاقاته الفرعية (وفق مواصفات Django).
for _host in (
    os.environ.get('RENDER_EXTERNAL_HOSTNAME', ''),
    os.environ.get('RAILWAY_PUBLIC_DOMAIN', ''),
):
    if _host and _host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_host)

AUTO_ALLOWED_SUFFIXES = (
    '.onrender.com',
    '.railway.app',
    '.fly.dev',
    '.vercel.app',
    '.netlify.app',
)
for _suffix in AUTO_ALLOWED_SUFFIXES:
    if _suffix not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_suffix)

if DEBUG:
    for _dev in ('localhost', '127.0.0.1', '[::1]'):
        if _dev not in ALLOWED_HOSTS:
            ALLOWED_HOSTS.append(_dev)

if not ALLOWED_HOSTS:
    raise ImproperlyConfigured(
        'DJANGO_ALLOWED_HOSTS must be set in the environment when DEBUG=False. '
        'Use a comma-separated list, e.g. api.example.com,example.onrender.com'
    )

# ────────────────────────── التطبيقات ──────────────────────────

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'catalog',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ────────────────────────── قاعدة البيانات ──────────────────────────
# 1) DATABASE_URL إن وُجد (Neon/Supabase/Render...) — الطريقة المفضلة.
# 2) أو متغيرات POSTGRES_* التقليدية (توافق مع إعدادات النشر السابقة).
# 3) وإلا SQLite للعمل المحلي.
DATABASE_URL = os.environ.get('DATABASE_URL', '').strip()
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=_env_bool('DJANGO_DB_SSL', False),
        ),
    }
elif os.environ.get('POSTGRES_DB') or os.environ.get('POSTGRES_HOST'):
    _db_ssl = os.environ.get('POSTGRES_SSL_MODE', 'prefer')
    _db_options = {'sslmode': _db_ssl} if _db_ssl else {}
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('POSTGRES_DB', 'boycott_platform'),
            'USER': os.environ.get('POSTGRES_USER', 'postgres'),
            'PASSWORD': os.environ.get('POSTGRES_PASSWORD', ''),
            'HOST': os.environ.get('POSTGRES_HOST', 'localhost'),
            'PORT': os.environ.get('POSTGRES_PORT', '5432'),
            'CONN_MAX_AGE': 600,
            'OPTIONS': _db_options,
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# ────────────────────────── المصادقة ──────────────────────────

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# ────────────────────────── اللغة والمنطقة ──────────────────────────

LANGUAGE_CODE = 'ar'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

# ────────────────────────── Static و Media ──────────────────────────

STATIC_URL = '/static/'

STATIC_ROOT = BASE_DIR / 'staticfiles'

STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

# ملفات Media تُخزَّن في مجلد `media/` داخل المستودع،
# لذلك تبقى ثابتة ولا تُفقد عند إعادة النشر على أي استضافة.
MEDIA_URL = '/media/'

MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ────────────────────────── REST Framework ──────────────────────────

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'sync': '120/min',
        'discoveries': '20/min',
    },
    'COERCE_DECIMAL_TO_STRING': False,
}

# ────────────────────────── CORS آمن ──────────────────────────
# يُسمح فقط للأصول المصرّح بها. في بيئة التطوير (DEBUG) يُفتح CORS للراحة.

CORS_ALLOWED_ORIGINS = _env_list('DJANGO_CORS_ORIGINS') or _env_list(
    'DJANGO_CORS_ALLOWED_ORIGINS'
)

if DEBUG and not CORS_ALLOWED_ORIGINS:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = False
    if not CORS_ALLOWED_ORIGINS and not DEBUG:
        import logging
        logging.getLogger(__name__).warning(
            'DJANGO_CORS_ORIGINS is not set — cross-origin API requests will be blocked.'
        )

CORS_ALLOW_CREDENTIALS = False

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'authorization',
    'content-type',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# تُستخدم لطلبات CSRF عبر HTTPS (لوحة الإدارة وغيرها).
CSRF_TRUSTED_ORIGINS = list(CORS_ALLOWED_ORIGINS)

# ────────────────────────── أمان HTTPS ──────────────────────────
# يبدأ تلقائياً في الإنتاج (DEBUG=False) ويمكن ضبطه يدوياً عبر DJANGO_SECURE.

SECURE = _env_bool('DJANGO_SECURE', not DEBUG)

if SECURE:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    USE_X_FORWARDED_HOST = True
    SECURE_SSL_REDIRECT = _env_bool('DJANGO_SSL_REDIRECT', True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = _env_int('DJANGO_HSTS_SECONDS', 31536000)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

X_FRAME_OPTIONS = 'DENY'

# ────────────────────────── سجلات ──────────────────────────

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'simple': {'format': '{levelname} {asctime} {name}: {message}', 'style': '{'},
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.environ.get('DJANGO_LOG_LEVEL', 'INFO'),
    },
}
