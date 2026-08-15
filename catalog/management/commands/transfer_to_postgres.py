"""نقل كامل لبيانات المشروع من SQLite إلى قاعدة البيانات الحالية (PostgreSQL)."""

import io
from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.core import serializers
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, connections
from rest_framework.authtoken.models import Token

from catalog.models import Article, Category, Product, ProductDiscovery, Video

SQLITE_ALIAS = 'sqlite_src'

# الترتيب يحترم العلاقات بين الجداول (التابع بعد الأب).
MODEL_ORDER = [Category, Product, ProductDiscovery, Article, Video]


class Command(BaseCommand):
    help = (
        'نقل كل البيانات من ملف SQLite المحلي إلى قاعدة البيانات النشطة حالياً '
        '(تُعرَّف عبر DATABASE_URL). شغّل "python manage.py migrate" على الهدف أولاً.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--sqlite',
            default=str(settings.BASE_DIR / 'db.sqlite3'),
            help='مسار ملف SQLite المصدر (الافتراضي: db.sqlite3 في جذر المشروع).',
        )
        parser.add_argument(
            '--wipe',
            action='store_true',
            help='مسح البيانات الحالية في قاعدة البيانات الهدف قبل النقل.',
        )

    def handle(self, *args, **options):
        db_path = Path(options['sqlite'])
        if not db_path.exists():
            raise CommandError(f'ملف SQLite غير موجود: {db_path}')

        if connection.vendor == 'sqlite3':
            raise CommandError(
                'قاعدة البيانات الهدف حالياً هي SQLite. '
                'حدد DATABASE_URL (PostgreSQL) في متغيرات البيئة ثم أعد المحاولة.'
            )

        settings.DATABASES[SQLITE_ALIAS] = {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': str(db_path),
            'TIME_ZONE': None,
            'CONN_MAX_AGE': 0,
            'CONN_HEALTH_CHECKS': False,
            'OPTIONS': {},
            'AUTOCOMMIT': True,
            'ATOMIC_REQUESTS': False,
        }
        connections[SQLITE_ALIAS].ensure_connection()

        self.stdout.write(f'المصدر: {db_path}')
        self.stdout.write(f'الهدف: {connection.settings_dict["NAME"]}')

        if options['wipe']:
            self._wipe_target()

        total = 0

        # 1) مستخدمو Django أولاً (مطلوبون بواسطة التوكنات).
        user_model = apps.get_model(settings.AUTH_USER_MODEL)
        users = self._read_model(user_model)
        total += len(users)
        self._save_objects(users)

        # 2) بقية النماذج بترتيب اعتمادها.
        for model in MODEL_ORDER:
            objects = self._read_model(model)
            total += len(objects)
            self._save_objects(objects)

        # 3) توكنات المصادقة بعد المستخدمين.
        tokens = self._read_model(Token)
        total += len(tokens)
        self._save_objects(tokens)

        self._fix_sequences()

        self.stdout.write(
            self.style.SUCCESS(f'اكتمل النقل: {total} سجل إلى قاعدة البيانات الجديدة.')
        )

    def _read_model(self, model):
        """قراءة كل سجلات النموذج من قاعدة SQLite."""
        queryset = model._default_manager.using(SQLITE_ALIAS).order_by('pk')
        objects = list(queryset)
        self.stdout.write(f'  قراءة {model.__name__}: {len(objects)} سجل')
        return objects

    def _save_objects(self, objects):
        """حفظ الكائنات في قاعدة البيانات الهدف مع تحويل المفاتيح الأجنبية الطبيعية."""
        if not objects:
            return
        payload = serializers.serialize(
            'json',
            objects,
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True,
        )
        for obj in serializers.deserialize(
            'json',
            io.StringIO(payload),
            using='default',
            ignorenonexistent=True,
        ):
            obj.save(using='default')

    def _wipe_target(self):
        self.stdout.write('  مسح البيانات الحالية من الهدف...')
        for model in reversed(MODEL_ORDER):
            model._default_manager.using('default').all().delete()
        Token._default_manager.using('default').all().delete()
        user_model = apps.get_model(settings.AUTH_USER_MODEL)
        user_model._default_manager.using('default').all().delete()
        self.stdout.write('  تم مسح الهدف.')

    def _fix_sequences(self):
        """إعادة ضبط التسلسلات (sequences) في PostgreSQL حتى لا تتعارض المفاتيح القادمة."""
        if connection.vendor != 'postgresql':
            return
        tables = [m._meta.db_table for m in MODEL_ORDER]
        tables += [Token._meta.db_table, apps.get_model(settings.AUTH_USER_MODEL)._meta.db_table]
        with connection.cursor() as cursor:
            for table in tables:
                # يجد عمود التسلسل (serial/identity) تلقائياً دون افتراض اسمه "id".
                cursor.execute(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = %s AND column_default LIKE 'nextval(%%'",
                    [table],
                )
                row = cursor.fetchone()
                if not row:
                    continue
                column = row[0]
                # table/column قادمتان من قواعد البيانات الداخلية الموثوقة (آمنة للتضمين).
                cursor.execute(
                    f'SELECT setval(pg_get_serial_sequence(%s, %s), '
                    f'GREATEST(COALESCE(MAX("{column}"), 1), 1)) FROM "{table}"',
                    [table, column],
                )
