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
python manage.py loaddata data.json
