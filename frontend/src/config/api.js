/**
 * إعدادات الاتصال بالـ Backend (Django API).
 *
 * القاعدة:
 * - VITE_API_BASE_URL يُقرأ من متغيرات البيئة عند البناء (npm run build).
 * - في بيئة التطوير (DEV): إن لم يُضبط، يُستخدم العنوان المحلي للراحة.
 * - في الإنتاج (PROD): ممنوع نهائياً استخدام أي عنوان محلي (localhost/127.0.0.1).
 *   إن لم يُضبط الرابط يقع خطأ واضح فور تحميل التطبيق بدل عرض نسخة معطوبة.
 *
 * ملاحظة تقنية: يجب الوصول إلى import.meta.env مباشرة (وليس عبر متغير وسيط)
 * حتى يستبدله Vite وقت البناء ويحذف كود بيئة التطوير من نسخة الإنتاج.
 */

function normalizeBaseUrl(raw) {
  if (!raw) return ''
  return String(raw).trim().replace(/\/+$/, '')
}

const CONFIGURED_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || '')

export const API_BASE_URL = CONFIGURED_URL
  ? CONFIGURED_URL
  : import.meta.env.DEV
    ? 'http://127.0.0.1:8000/api/v1'
    : (() => {
        throw new Error(
          'VITE_API_BASE_URL غير مضبوط في بيئة الإنتاج. ' +
            'حدّده في متغيرات بيئة البناء قبل النشر، مثال: ' +
            'VITE_API_BASE_URL=https://your-api-host.com/api/v1',
        )
      })()
