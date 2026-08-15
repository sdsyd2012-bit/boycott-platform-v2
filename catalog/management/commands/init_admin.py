from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

DEFAULTS = {
    'username': 'admin',
    'email': 'admin@localhost',
    'password': 'admin123',
}


class Command(BaseCommand):
    help = (
        'إنشاء مدير (superuser) محلي بسرعة للتجربة. '
        'الافتراضي: admin / admin123 — استخدم الوسائط لتغييرها.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--username', default=None, help='اسم المستخدم (الافتراضي: admin)')
        parser.add_argument('--email', default=None, help='البريد الإلكتروني')
        parser.add_argument('--password', default=None, help='كلمة المرور (الافتراضي: admin123)')

    def handle(self, *args, **options):
        User = get_user_model()
        username = options['username'] or DEFAULTS['username']
        email = options['email'] or DEFAULTS['email']
        password = options['password'] or DEFAULTS['password']

        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'المدير «{username}» موجود مسبقاً — لم يتم تغيير شيء.')
            )
            return

        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(
            self.style.SUCCESS(f'تم إنشاء المدير المحلي: {username} / {password}')
        )
