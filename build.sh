#!/usr/bin/env bash
# build.sh — أمر البناء الوحيد لنظام Render (مشار إليه في render.yaml).
#
# الخطوات:
#   1) تثبيت الاعتماديات.
#   2) تطبيق migrations (مرة واحدة فقط — لا يوجد preDeployCommand مكرر).
#   3) استيراد البيانات من catalog/fixtures/data.json فقط إذا كانت قاعدة
#      البيانات لا تحتوي على أي منتج — لا يُحذف أي شيء ولا يُستبدل أي سجل.
#   4) إنشاء حساب الأدمن فقط إذا لم يكن موجوداً (من متغيرات البيئة DJANGO_ADMIN_*).
#   5) تجميع الملفات الثابتة (WhiteNoise).
#   6) ضمان وجود صور المنتجات (لا تُحذف الصور الموجودة).
set -euo pipefail

echo "==> 1/6 تثبيت الاعتماديات"
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo "==> 2/6 تطبيق migrations"
python manage.py migrate --noinput

echo "==> 3/6 استيراد البيانات (مرة واحدة فقط)"
PRODUCT_COUNT=$(python manage.py shell -c "from catalog.models import Product; print(Product.objects.count())" | tail -n 1)

if [ "$PRODUCT_COUNT" = "0" ]; then
    echo "    قاعدة البيانات فارغة. جارٍ استيراد catalog/fixtures/data.json ..."
    python manage.py loaddata catalog/fixtures/data.json
else
    echo "    قاعدة البيانات تحتوي بالفعل على $PRODUCT_COUNT منتجاً. تم تخطي الاستيراد."
fi

echo "==> 4/6 إنشاء حساب الأدمن (إن لم يكن موجوداً)"
python manage.py init_admin

echo "==> 5/6 تجميع الملفات الثابتة"
python manage.py collectstatic --noinput

echo "==> 6/6 ضمان وجود صور المنتجات"
python manage.py ensure_media || true

echo "==> build.sh اكتمل بنجاح"
