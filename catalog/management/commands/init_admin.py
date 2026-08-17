import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        'إنشاء superuser إن لم يكن موجوداً فقط. بيانات الحساب تُقرأ من متغيرات '
        'البيئة DJANGO_ADMIN_USERNAME / DJANGO_ADMIN_EMAIL / DJANGO_ADMIN_PASSWORD. '
        'القيم الافتراضية: lv,hk / admin@example.com. '
        'لا يُحذف أي مستخدم ولا تُستبدل كلمة مرور مستخدم موجود أبداً.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--username', default=None, help='اسم المستخدم (يتجاوز DJANGO_ADMIN_USERNAME)')
        parser.add_argument('--email', default=None, help='البريد الإلكتروني (يتجاوز DJANGO_ADMIN_EMAIL)')
        parser.add_argument('--password', default=None, help='كلمة المرور (يتجاوز DJANGO_ADMIN_PASSWORD)')

    def handle(self, *args, **options):
        User = get_user_model()
        username = (options['username'] or os.environ.get('DJANGO_ADMIN_USERNAME') or 'lv,hk').strip()
        email = (options['email'] or os.environ.get('DJANGO_ADMIN_EMAIL') or 'admin@example.com').strip()
        password = options['password'] or os.environ.get('DJANGO_ADMIN_PASSWORD') or 'hgl,g]hgkf,dhgavdt'

        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(
                    f'المستخدم "{username}" موجود مسبقاً — لم يتم تغيير أي شيء.'
                )
            )
            return

        if not password:
            self.stderr.write(
                self.style.ERROR(
                    'لا يمكن إنشاء مستخدم جديد بدون كلمة مرور. '
                    'اضبط DJANGO_ADMIN_PASSWORD في متغيرات البيئة.'
                )
            )
            raise SystemExit(1)

        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(
            self.style.SUCCESS(f'تم إنشاء حساب الأدمن "{username}" ({email}).')
        )
