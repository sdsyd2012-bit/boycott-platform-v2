from django.db import connection
from django.http import JsonResponse


def health(request):
    """Endpoint خفيف لفحص صحة الخدمة على Render (healthCheckPath = /health/)."""
    try:
        connection.ensure_connection()
    except Exception as exc:  # noqa: BLE001 — أي خطأ اتصال يعني أن الخدمة غير صحية
        return JsonResponse({'status': 'error', 'detail': str(exc)}, status=503)
    return JsonResponse({'status': 'ok'})
