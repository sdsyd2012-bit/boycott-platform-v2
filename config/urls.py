from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

from .views import health

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health, name='health'),
    path('api/v1/', include('catalog.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # خدمة /media/ في الإنتاج — الملفات موجودة داخل المستودع (media/product_images)
    # فلا تُفقد عند إعادة النشر على الاستضافة.
    urlpatterns += [
        re_path(
            r'^media/(?P<path>.*)$',
            serve,
            {'document_root': settings.MEDIA_ROOT},
        ),
    ]
