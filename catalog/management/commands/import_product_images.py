import concurrent.futures
import json

from django.conf import settings
from django.core.management.base import BaseCommand

from catalog.images import image_local_path, localize_image
from catalog.models import Product


class Command(BaseCommand):
    help = (
        'تنزيل صور المنتجات الخارجية، التحقق منها، تحسينها (WebP) '
        'وتخزينها محلياً وتحديث image_url إلى المسار المحلي.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--workers', type=int, default=8)
        parser.add_argument('--limit', type=int, default=None)

    def handle(self, *args, **options):
        workers = options['workers']
        limit = options['limit']

        pending = list(
            Product.objects.filter(is_deleted=False)
            .exclude(image_url='')
            .exclude(image_url__startswith='/media/')
        )
        if limit:
            pending = pending[:limit]

        already_local = Product.objects.filter(
            is_deleted=False, image_url__startswith='/media/'
        ).count()

        self.stdout.write(f'موجود محلياً مسبقاً: {already_local}')
        self.stdout.write(f'بانتظار المعالجة: {len(pending)}')

        if not pending:
            self.stdout.write(self.style.SUCCESS('لا يوجد ما يجب معالجته.'))
            return

        results = []
        manifest = {}

        def process(product):
            local_url = localize_image(product.image_url)
            return (product.pk, product.barcode, product.image_url, local_url)

        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
            futures = [executor.submit(process, product) for product in pending]
            done = 0
            for future in concurrent.futures.as_completed(futures):
                pk, barcode, original_url, local_url = future.result()
                results.append((pk, barcode, original_url, local_url))
                done += 1
                if done % 50 == 0:
                    self.stdout.write(f'تمت المعالجة: {done}/{len(pending)}')

        imported = 0
        failed = 0
        for pk, barcode, original_url, local_url in results:
            if local_url:
                Product.objects.filter(pk=pk).update(image_url=local_url)
                imported += 1
                manifest[image_local_path(original_url)] = original_url
            else:
                failed += 1

        manifest_dir = settings.MEDIA_ROOT / 'product_images'
        manifest_dir.mkdir(parents=True, exist_ok=True)
        with open(manifest_dir / 'manifest.json', 'w', encoding='utf-8') as fh:
            json.dump(manifest, fh, ensure_ascii=False, indent=2)

        self.stdout.write(
            self.style.SUCCESS(
                f'اكتمل: {imported} نجحت، {failed} فشلت '
                f'(من أصل {len(pending)}).'
            )
        )
