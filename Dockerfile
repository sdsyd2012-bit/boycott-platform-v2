# Dockerfile إنتاجي — بديل للنشر عبر Docker (Railway / Fly.io / أي منصة حاويات).
# للنشر على Render يكفي render.yaml + build.sh دون الحاجة لهذا الملف.

FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=config.settings

WORKDIR /app

# تثبيت الاعتماديات قبل نسخ الكود (استفادة من كاش طبقات Docker).
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# نسخ الكود وملفات Media (الصور داخل المستودع — لا تُفقد).
COPY . .

# تجميع الملفات الثابتة.
RUN python manage.py collectstatic --noinput

EXPOSE 8000

# ترقيم: متغيرات البيئة تُمرَّر من المنصة (DJANGO_SECRET_KEY, DJANGO_ALLOWED_HOSTS,
# DJANGO_CORS_ORIGINS, DATABASE_URL) ويجب تشغيل migrate + transfer_to_postgres مرة واحدة.
CMD ["gunicorn", "config.wsgi:application", "--workers", "2", "--threads", "4", "--bind", "0.0.0.0:8000", "--timeout", "60", "--access-logfile", "-"]
