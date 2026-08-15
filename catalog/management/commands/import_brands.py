import json
import re
from collections import Counter

from django.conf import settings
from django.core.management.base import BaseCommand

from catalog.models import Category, Product

# ملف الاستيراد الافتراضي: ضعه في جذر المشروع (data.json) — لا يعتمد على أي مسار محلي.
DEFAULT_DATA_FILE = settings.BASE_DIR / 'data.json'

CATEGORY_MAP = {
    'technology': 'تقنية',
    'commerce': 'تسوق',
    'clothing': 'ملابس',
    'food': 'أغذية',
    'marketing': 'تسويق',
    'travel': 'سفر',
    'development': 'تطوير عقاري',
    'healthcare': 'رعاية صحية',
    'supermarket': 'سوبر ماركت',
    'sales': 'مبيعات',
    'fashion': 'أزياء',
    'cosmetics': 'تجميل',
    'productivity': 'إنتاجية',
    'security': 'أمن ومراقبة',
    'cloud': 'حوسبة سحابية',
    'drinks': 'مشروبات',
    'hr': 'موارد بشرية',
    'finance': 'بنوك وتمويل',
    'insurance': 'تأمين',
    'weapons': 'أسلحة',
    'manufacturer': 'تصنيع',
    'pharmaceuticals': 'أدوية',
    'household': 'مستلزمات منزلية',
    'dates': 'تمور',
    'energy': 'طاقة',
    'semiconductors': 'أشباه موصلات',
    'coffee': 'قهوة',
    'politics': 'سياسة',
    'petcare': 'مستلزمات حيوانات',
    'fintech': 'تقنية مالية',
    'contractor': 'مقاولات',
    'car': 'سيارات',
    'books': 'كتب',
    'charity': 'خيرية',
    'media': 'إعلام وترفيه',
    'toys': 'ألعاب',
}

COMPANY_CATEGORY = {
    'mars-inc': 'food',
    'procter-and-gamble': 'household',
    'lvmh': 'fashion',
    'pepsico': 'food',
    'mondelez-international-inc': 'food',
    'the-coca-cola-company': 'drinks',
    'unilever': 'food',
    'estee-lauder': 'cosmetics',
    'loreal': 'cosmetics',
    'l-oreal': 'cosmetics',
    'nestle': 'food',
    'paramount-global': 'media',
    'henkel': 'household',
    'danone': 'food',
    'reckitt-benckiser': 'household',
    'bayer': 'pharmaceuticals',
    'mattel': 'toys',
    'ajinomoto-group': 'food',
    'google': 'technology',
    'teva': 'pharmaceuticals',
    'the-walt-disney-company': 'media',
    'yum-brands': 'food',
}

EXPLICIT_CATEGORY = {
    'firefox': 'technology',
    'bravesearch': 'technology',
    'didi': 'car',
    'drinkmate': 'drinks',
    'caykur': 'drinks',
    'meysu': 'drinks',
    'hamidiyesu': 'drinks',
    'kizilay': 'drinks',
    'eti': 'food',
    'croky': 'food',
    'golf': 'food',
    'duru': 'cosmetics',
    'hudabeauty': 'cosmetics',
    'lush': 'cosmetics',
    'ahava': 'cosmetics',
    'halalbooking': 'travel',
    'bingo': 'household',
    'boron': 'household',
    'dove': 'cosmetics',
    'lesechos': 'media',
    'leparisien': 'media',
}

CATEGORY_KEYWORDS = [
    (['semiconductor', 'software', 'browser', 'cloud computing',
      'computer hardware', 'operating system'], 'technology'),
    (['airline', 'flight', 'hotel', 'tourism', 'travel agency'], 'travel'),
    (['chocolate', 'candy', 'biscuit', 'cookie', 'gum', 'cereal', 'pasta', 'noodle',
      'rice', 'cheese', 'yogurt', 'milk', 'ice cream', 'bread', 'frozen', 'confectionery',
      'fast food', 'restaurant', 'burger', 'pizza'], 'food'),
    (['espresso', 'cappuccino', 'coffee beans'], 'coffee'),
    (['cola', 'juice', 'mineral water', 'soda', 'beverage', 'sparkling water'], 'drinks'),
    (['cosmetic', 'skincare', 'skin care', 'perfume', 'fragrance', 'makeup', 'make-up',
      'shampoo', 'lotion', 'deodorant'], 'cosmetics'),
    (['detergent', 'laundry', 'cleaning', 'bleach'], 'household'),
    (['clothing', 'apparel', 'footwear', 'handbag'], 'fashion'),
    (['bank', 'banking', 'insurance', 'loan', 'mortgage'], 'finance'),
    (['pharma', 'pharmaceutical', 'medicine'], 'pharmaceuticals'),
    (['automobile', 'vehicle', 'tire'], 'car'),
    (['petfood', 'pet food', 'animal feed'], 'petcare'),
    (['weapon', 'defense', 'military'], 'weapons'),
    (['newspaper', 'broadcast', 'television network', 'film studio'], 'media'),
    (['toy', 'game'], 'toys'),
]


def _matches(text, keywords):
    return any(keyword in text for keyword in keywords)


def _classification_text(name, description):
    text = description or ''
    text = re.sub(r'\[\^\d+\]:\s*\S+', '', text)
    text = re.sub(r'https?://\S+', '', text)
    return f'{name} {text}'.lower()


def classify_category(key, name, description, stakeholders):
    if key in EXPLICIT_CATEGORY:
        return EXPLICIT_CATEGORY[key]
    for stakeholder in stakeholders or []:
        base = COMPANY_CATEGORY.get(stakeholder.get('id'))
        if base:
            return base
    text = _classification_text(name, description)
    for keywords, slug in CATEGORY_KEYWORDS:
        if _matches(text, keywords):
            return slug
    return 'commerce'


def brand_category_slug(key, brand):
    slug = (brand.get('categories') or [None])[0]
    if not slug:
        slug = classify_category(
            key,
            brand.get('name') or '',
            brand.get('description') or '',
            brand.get('stakeholders'),
        )
    return slug

REASON_MAP = {
    'operations_in_israel': 'يدعم الاحتلال الصهيوني',
    'operations_in_settlements': 'لديه عمليات داخل المستوطنات',
}


def arabic_category_name(slug):
    if not slug:
        return None
    return CATEGORY_MAP.get(slug, slug)


def short_reason(reasons):
    if not reasons:
        return 'يدعم الاحتلال الصهيوني'
    parts = [REASON_MAP.get(reason, reason) for reason in reasons]
    return ' و'.join(dict.fromkeys(parts))


class Command(BaseCommand):
    help = 'استيراد قائمة العلامات التجارية من ملف data.json'

    def add_arguments(self, parser):
        parser.add_argument('data_file', nargs='?', default=str(DEFAULT_DATA_FILE))
        parser.add_argument(
            '--backup',
            default=str(settings.BASE_DIR / 'data_backup.json'),
            help='مسار ملف النسخة الاحتياطية (الافتراضي: data_backup.json في جذر المشروع).',
        )

    def handle(self, *args, **options):
        with open(options['data_file'], encoding='utf-8') as file:
            brands = json.load(file)['brands']

        old_products = list(Product.objects.values())
        old_categories = list(Category.objects.values())
        def default(obj):
            if hasattr(obj, 'isoformat'):
                return obj.isoformat()
            raise TypeError(f'Object of type {type(obj).__name__} is not JSON serializable')

        with open(options['backup'], 'w', encoding='utf-8') as file:
            json.dump(
                {'products': old_products, 'categories': old_categories},
                file,
                ensure_ascii=False,
                indent=2,
                default=default,
            )
        self.stdout.write(f'نسخة احتياطية: {options["backup"]}')

        Product.objects.all().delete()
        Category.objects.all().delete()

        used_slugs = {
            slug
            for key, brand in brands.items()
            for slug in [brand_category_slug(key, brand)]
        }
        category_by_name = {}
        for slug in sorted(used_slugs):
            name = arabic_category_name(slug)
            category = Category.objects.create(name=name)
            category_by_name[name] = category

        products = []
        for key, brand in brands.items():
            category_slug = brand_category_slug(key, brand)
            category_name = arabic_category_name(category_slug)
            products.append(
                Product(
                    barcode=key,
                    name=brand.get('name') or key,
                    brand_name='',
                    is_boycotted=brand.get('status') == 'avoid',
                    category=category_by_name.get(category_name) if category_name else None,
                    image_url=brand.get('logo_url') or '',
                    reason=short_reason(brand.get('reasons')),
                    description=brand.get('description') or '',
                    alternatives=brand.get('alternatives') or [],
                )
            )
        Product.objects.bulk_create(products)

        status_counts = Counter(brand.get('status') for brand in brands.values())
        self.stdout.write(
            self.style.SUCCESS(
                f'تم استيراد {len(products)} علامة ({len(products)} منتج) '
                f'- الحالات: {dict(status_counts)} - أصناف: {len(category_by_name)}'
            )
        )
