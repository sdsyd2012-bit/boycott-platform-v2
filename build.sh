#!/usr/bin/env bash
# build.sh — أمر البناء الوحيد لنظام Render (مشار إليه في render.yaml).
#
# الخطوات:
#   1) تثبيت الاعتماديات.
#   2) تطبيق migrations (مرة واحدة فقط — لا يوجد preDeployCommand مكرر).
#   3) استيراد البيانات من catalog/fixtures/data.json فقط إذا كانت قاعدة
#      البيانات لا تحتوي على أي منتج — لا يُحذف أي شيء ولا يُستبدل أي سجل.
#   4) حذف المستخدم القديم 'admin' إن وُجد (تم استبداله بمستخدم جديد).
#   5) إنشاء حساب الأدمن فقط إذا لم يكن موجوداً (من متغيرات البيئة DJANGO_ADMIN_*).
#   6) تجميع الملفات الثابتة (WhiteNoise).
#   7) ضمان وجود صور المنتجات (لا تُحذف الصور الموجودة).
set -euo pipefail

echo "==> 1/7 تثبيت الاعتماديات"
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo "==> 2/7 تطبيق migrations"
python manage.py migrate --noinput

echo "==> 3/7 استيراد البيانات (مرة واحدة فقط)"
PRODUCT_COUNT=$(python manage.py shell -c "from catalog.models import Product; print(Product.objects.count())" | tail -n 1)

if [ "$PRODUCT_COUNT" = "0" ]; then
    echo "    قاعدة البيانات فارغة. جارٍ استيراد catalog/fixtures/data.json ..."
    python manage.py loaddata catalog/fixtures/data.json
else
    echo "    قاعدة البيانات تحتوي بالفعل على $PRODUCT_COUNT منتجاً. تم تخطي الاستيراد."
fi

echo "==> 4/7 حذف المستخدم القديم 'admin' (إن وُجد)"
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
deleted, _ = User.objects.filter(username='admin').delete()
if deleted:
    print(f'    تم حذف {deleted} مستخدم(ين) باسم admin')
else:
    print('    لا يوجد مستخدم باسم admin')
"

echo "==> 5/7 إنشاء حساب الأدمن (إن لم يكن موجوداً)"
python manage.py init_admin

echo "==> 6/7 تجميع الملفات الثابتة"
python manage.py collectstatic --noinput

echo "==> 7/7 ضمان وجود صور المنتجات"
python manage.py ensure_media || true

echo "==> build.sh اكتمل بنجاح"
