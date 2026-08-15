
#!/usr/bin/env bash
set -euo pipefail

python -m pip install --upgrade pip
python -m pip install -r requirements.txt

python manage.py migrate --noinput

# استيراد البيانات المحلية لأول مرة فقط
PRODUCT_COUNT=$(python manage.py shell -c "from catalog.models import Product; print(Product.objects.count())" | tail -n 1)

if [ "$PRODUCT_COUNT" = "0" ]; then
    echo "Database has no products. Loading fixture..."
    python manage.py loaddata catalog/fixtures/data.json
else
    echo "Database already contains $PRODUCT_COUNT products. Skipping fixture import."
fi

# إنشاء حساب الأدمن إذا لم يكن موجودًا
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@example.com', 'admin12345')"

python manage.py collectstatic --noinput

# ضمان وجود صور المنتجات
python manage.py ensure_media || true