"""Image localization pipeline (backend).

سياسة الصور: الرابط الخارجي مصدر استيراد فقط، وليس مصدر عرض.
هذه الوحدة تنزّل الصورة من الرابط الأصلي، تتحقق منها، تحسّنها،
تحوّلها إلى WebP، وتحفظها محلياً باسم حتمي يعتمد على هاش الرابط،
وترجع مسار العرض المحلي. الرابط الأصلي يُحتفظ به كـ metadata فقط.
"""

import hashlib
import io
import logging

import requests
from django.conf import settings
from PIL import Image

logger = logging.getLogger(__name__)

USER_AGENT = 'BoycottDirectory/1.0 (image-localizer)'
REQUEST_TIMEOUT = 20
MAX_BYTES = 5 * 1024 * 1024  # حد أقصى لحجم الصورة المصدر (5MB)
MAX_DIMENSION = 640  # أكبر بعد مسموح بعد التحسين
MIN_DIMENSION = 16  # أصغر بعد مقبول
SUBDIR = 'product_images'


def _is_image_content_type(content_type):
    return bool(content_type) and str(content_type).lower().startswith('image/')


def image_local_path(source_url):
    """اسم محلي حتمي يعتمد على هاش الرابط الأصلي (مثال: a83f21....webp)."""
    digest = hashlib.sha256(source_url.encode('utf-8')).hexdigest()[:16]
    return f'{SUBDIR}/{digest}.webp'


def _download(source_url):
    response = requests.get(
        source_url,
        timeout=REQUEST_TIMEOUT,
        headers={'User-Agent': USER_AGENT, 'Referer': source_url},
        stream=True,
    )
    response.raise_for_status()
    content_type = response.headers.get('Content-Type', '')
    if not _is_image_content_type(content_type):
        raise ValueError(f'محتوى غير صوري: {content_type or "غير معروف"}')
    content = response.content
    if len(content) > MAX_BYTES:
        raise ValueError(f'حجم الصورة كبير: {len(content)} بايت')
    return content_type, content


def _optimize(content):
    """تحقق من كون المحتوى صورة حقيقية، قياس الأبعاد، التحسين والتحويل إلى WebP."""
    source = Image.open(io.BytesIO(content))
    source.load()

    if getattr(source, 'is_animated', False):
        source.seek(0)

    width, height = source.size
    if width < MIN_DIMENSION or height < MIN_DIMENSION:
        raise ValueError(f'أبعاد صغيرة جداً: {width}x{height}')
    if max(width, height) > MAX_DIMENSION:
        scale = MAX_DIMENSION / max(width, height)
        source = source.resize(
            (max(1, round(width * scale)), max(1, round(height * scale))),
            Image.LANCZOS,
        )

    buffer = io.BytesIO()
    if 'A' in source.getbands():
        source.convert('RGBA').save(buffer, format='WEBP', quality=85, method=4)
    else:
        source.convert('RGB').save(buffer, format='WEBP', quality=85, method=4)
    return buffer.getvalue()


def localize_image(source_url):
    """يحمّل الصورة، يتحقق منها، يحسّنها، ويحفظها محلياً.

    يعيد مسار العرض المحلي (يبدأ بـ /media/) عند النجاح،
    أو None عند فشل التنزيل/التحقق.
    """
    if not source_url:
        return None
    source_url = str(source_url).strip()
    if source_url.startswith('/media/'):
        return source_url

    rel_path = image_local_path(source_url)
    dest = settings.MEDIA_ROOT / rel_path
    if dest.exists():
        return f'{settings.MEDIA_URL}{rel_path}'

    try:
        _, content = _download(source_url)
        webp_content = _optimize(content)
    except Exception as exc:
        logger.warning('فشل توطين الصورة %s: %s', source_url, exc)
        return None

    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(webp_content)
    return f'{settings.MEDIA_URL}{rel_path}'
