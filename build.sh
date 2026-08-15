#!/usr/bin/env bash
# أوامر البناء عند النشر (Render/Railway/...).
set -euo pipefail

python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# تجميع الملفات الثابتة (لوحة الإدارة وغيرها) — تُخدم عبر WhiteNoise.
python manage.py collectstatic --noinput

# ضمان وجود صور المنتجات بعد سحب الكود (إعادة تنزيل أي مفقود من manifest).
python manage.py ensure_media || true

python manage.py migrate --noinput
python manage.py loaddata data

python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@example.com', 'admin12345')"

