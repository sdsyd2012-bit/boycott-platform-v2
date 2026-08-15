"""ضمان وجود صور المنتجات بعد إعادة النشر على أي استضافة.

عند النشر على استضافة بمجلد مؤقت (ephemeral)، تتأكد هذه الأوامر من أن كل
صورة محلية ما زالت موجودة، وتعيد تنزيلها من مصدرها الأصلي (manifest.json)
إن فقدت — فلا تُفقد أي صورة منتج أبداً.
"""

import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from catalog.images import image_local_path, localize_image
from catalog.models import Article, Product, Video


class Command(BaseCommand):
    help = (
        'فحص كل صور المنتجات/المقالات/الفيديوهات وإعادة تنزيل أي صورة مفقودة '
        'من مصدرها الأصلي باستخدام manifest.json.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='الحد الأقصى للصور المراد معالجتها (للاختبار).',
        )

    def handle(self, *args, **options):
        media_root = Path(settings.MEDIA_ROOT)
        manifest = self._load_manifest(media_root)

        missing = 0
        restored = 0
        failed = 0

        product_qs = Product.objects.filter(is_deleted=False).exclude(image_url='')
        for product in product_qs[:options['limit']] if options['limit'] else product_qs:
            local = self._ensure(product.image_url, media_root, manifest)
            if local:
                if local != product.image_url:
                    Product.objects.filter(pk=product.pk).update(image_url=local)
                    restored += 1
            elif local is None:
                missing += 1

        for model in (Video, Article):
            for instance in model.objects.filter(is_deleted=False):
                url = instance.thumbnail_url or instance.cover_url
                if not url:
                    continue
                local = self._ensure(url, media_root, manifest)
                if local is None:
                    missing += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'اكتمل الفحص: أعيدت {restored} صورة، {missing} ناقصة/فاشلة.'
            )
        )

    def _load_manifest(self, media_root):
        manifest_path = media_root / 'product_images' / 'manifest.json'
        if not manifest_path.exists():
            return {}
        try:
            return json.loads(manifest_path.read_text(encoding='utf-8'))
        except (json.JSONDecodeError, OSError):
            return {}

    def _ensure(self, image_url, media_root, manifest):
        """يتأكد من وجود الصورة محلياً ويعيد مسار العرض المحلي أو None."""
        if not image_url:
            return None
        image_url = str(image_url).strip()

        if image_url.startswith('/media/'):
            rel_path = image_url[len('/media/'):]
            if (media_root / rel_path).exists():
                return image_url
            source = manifest.get(rel_path)
            if source:
                local = localize_image(source)
                if local:
                    return local
            return None

        local = localize_image(image_url)
        return local
