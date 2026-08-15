import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '../db/database.js'
import { cleanDescription, shortDescription, toBrand } from '../lib/brand.js'
import BrandCard, { TONES, toneIndex } from '../components/BrandCard.jsx'
import { ProductImage } from '../components/LocalImage.jsx'
import { useToast } from '../admin/Toast.jsx'
import { pushDiscoveries } from '../services/syncService.js'
import {
  ArrowRightIcon,
  BanIcon,
  CheckIcon,
  PackagePlusIcon,
  TagIcon,
} from '../components/icons.jsx'

const EMPTY_FORM = {
  name: '',
  brandName: '',
  category: '',
  isBoycotted: true,
  imageUrl: '',
  reason: '',
}

export default function ProductDetails() {
  const { barcode } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const scanned = searchParams.get('scan') === '1'
  const toast = useToast()

  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const products = useLiveQuery(() => db.products.toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  const categoryById = useMemo(() => {
    if (!categories) return new Map()
    return new Map(categories.map((category) => [category.id, category]))
  }, [categories])

  const product = useMemo(() => {
    if (!products) return null
    return (
      products.find((item) => item.barcode === barcode) ||
      products.find(
        (item) => Array.isArray(item.barcodes) && item.barcodes.includes(barcode),
      ) ||
      undefined
    )
  }, [products, barcode])

  const categoryName = product?.category ? categoryById.get(product.category)?.name : ''

  const manualAlternatives = useMemo(() => {
    if (
      !products ||
      !product ||
      !Array.isArray(product.alternatives) ||
      product.alternatives.length === 0
    ) {
      return []
    }
    const ids = product.alternatives.map((id) => String(id).trim()).filter(Boolean)
    const byBarcode = new Map(products.map((item) => [String(item.barcode), item]))
    return ids
      .map((id) => byBarcode.get(id))
      .filter(
        (item) => Boolean(item) && !item.is_deleted && String(item.barcode) !== String(product.barcode),
      )
      .map((item) => toBrand(item, categoryById.get(item.category)?.name))
  }, [products, product, categoryById])

  const similar = useMemo(() => {
    if (!products || !product || !product.category) return []
    return products
      .filter(
        (item) =>
          item.category === product.category &&
          !item.is_deleted &&
          String(item.barcode) !== String(product.barcode),
      )
      .map((item) => toBrand(item, categoryById.get(item.category)?.name))
  }, [products, product, categoryById])

  const safeAlternatives = similar.filter((brand) => brand.status === 'support')
  const alternatives =
    manualAlternatives.length > 0 ? manualAlternatives : safeAlternatives.length > 0 ? safeAlternatives : similar
  const alternativesTitle =
    manualAlternatives.length > 0
      ? 'البدائل الموصى بها'
      : safeAlternatives.length > 0
        ? 'البدائل المحلية الموصى بها'
        : 'منتجات مشابهة'

  const handleContribute = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) {
      toast.error('اسم المنتج مطلوب')
      return
    }
    if (saving) return
    setSaving(true)

    const now = new Date().toISOString()
    const catVal = form.category ? Number(form.category) : null
    const categoryId = catVal && !isNaN(catVal) ? catVal : null

    const record = {
      barcode,
      name: form.name.trim(),
      brand_name: form.brandName.trim(),
      category: categoryId,
      is_boycotted: form.isBoycotted,
      image_url: form.imageUrl.trim(),
      reason: form.reason.trim(),
      description: '',
      alternatives: [],
      is_deleted: false,
      is_user_contributed: true,
      status: 'pending',
      sync_pushed: false,
      created_at: now,
      updated_at: now,
    }

    try {
      await db.products.put(record)
      const res = await pushDiscoveries()
      if (res.pushed > 0) {
        toast.success('تمت إضافة المنتج بنجاح وإرساله للمراجعة لدى الإدارة!')
      } else {
        toast.success('تم حفظ مساهمتك محلياً، وستُرسل للمراجعة فور الاتصال بالخادم.')
      }
      navigate(`/product/${barcode}`)
    } catch (err) {
      console.error('Error saving contribution:', err)
      toast.error('تعذّر حفظ المساهمة، حاول مجدداً.')
      setSaving(false)
    }
  }

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value })

  const contributeForm = (
    <form
      onSubmit={handleContribute}
      className="mx-auto mt-10 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-right shadow-sm dark:border-white/10 dark:bg-slate-900/80 md:p-8"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
          <PackagePlusIcon className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            ساهم بإضافة هذا المنتج
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            تساعدنا مساهمتك على إثراء القائمة. سيُرسل طلبك للمراجعة قبل النشر.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            اسم المنتج <span className="text-rose-500">*</span>
          </span>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder="مثال: شاي ليبتون"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/15 dark:bg-slate-950 dark:text-white"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              العلامة التجارية
            </span>
            <input
              type="text"
              value={form.brandName}
              onChange={set('brandName')}
              placeholder="مثال: يونيليفر"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/15 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              التصنيف
            </span>
            <select
              value={form.category}
              onChange={set('category')}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/15 dark:bg-slate-950 dark:text-white"
            >
              <option value="">بدون تصنيف</option>
              {(categories || []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              رابط صورة المنتج (اختياري)
            </span>
            <input
              type="url"
              dir="ltr"
              value={form.imageUrl}
              onChange={set('imageUrl')}
              placeholder="https://…"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/15 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              حالة المنتج
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, isBoycotted: true })}
                className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                  form.isBoycotted
                    ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                    : 'border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400'
                }`}
              >
                <BanIcon className="ml-1 inline h-4 w-4" />
                مقاطع
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, isBoycotted: false })}
                className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                  !form.isBoycotted
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                    : 'border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400'
                }`}
              >
                <CheckIcon className="ml-1 inline h-4 w-4" />
                آمن
              </button>
            </div>
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            سبب/ملاحظات (اختياري)
          </span>
          <textarea
            value={form.reason}
            onChange={set('reason')}
            rows={3}
            placeholder="مثال: العلامة مملوكة لشركة تدعم الاحتلال…"
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/15 dark:bg-slate-950 dark:text-white"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-60 sm:w-auto"
      >
        {saving ? 'جارِ الإرسال…' : 'إرسال المساهمة للمراجعة'}
      </button>
    </form>
  )

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [barcode])

  if (!products || !categories) {
    return (
      <section className="py-40 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">جارِ تحميل تفاصيل المنتج…</p>
      </section>
    )
  }

  if (!product) {
    return (
      <>
        <section className="py-28 text-center md:py-40">
          <div className="mx-auto max-w-md px-4">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5">
              <TagIcon className="h-8 w-8" />
            </span>
            {scanned ? (
              <>
                <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
                  هذا الباركود غير مسجّل لدينا بعد
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  الباركود <span className="font-mono font-bold text-slate-700 dark:text-slate-200" dir="ltr">{barcode}</span>{' '}
                  غير موجود في قاعدة بيانات «دليل البدائل». نعمل باستمرار على ربط منتجات جديدة، ويمكنك
                  المساعدة بإضافته الآن.
                </p>
              </>
            ) : (
              <>
                <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
                  لم نعثر على هذا المنتج
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  لا يوجد منتج بهذا الباركود في قاعدة البيانات. يمكنك المساعدة بإضافته الآن ليصل
                  للمراجعة ويظهر للجميع.
                </p>
              </>
            )}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/scan"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <ArrowRightIcon className="h-4 w-4" />
                المسح مجدداً
              </Link>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-600 transition hover:border-emerald-500 hover:text-emerald-600 dark:border-white/15 dark:text-slate-300"
              >
                تصفح المنتجات
              </Link>
            </div>
            <p className="mt-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
              هل تعرف هذا المنتج؟ أضفه الآن:
            </p>
          </div>
        </section>
        {contributeForm}
      </>
    )
  }

  const boycotted = product.is_boycotted
  const description = cleanDescription(product.description)

  const accents = boycotted
    ? {
        card: 'border-rose-200/70 bg-gradient-to-br from-rose-50 via-white to-white dark:border-rose-500/20 dark:from-rose-950/40 dark:via-slate-950 dark:to-slate-950',
        badge: 'bg-rose-600 text-white',
        panel: 'border-rose-500/20 bg-rose-500/10',
        panelLabel: 'text-rose-600 dark:text-rose-300',
        watermark: 'text-rose-600/10 dark:text-rose-500/10',
      }
    : {
        card: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-white dark:border-emerald-500/20 dark:from-emerald-950/40 dark:via-slate-950 dark:to-slate-950',
        badge: 'bg-emerald-600 text-white',
        panel: 'border-emerald-500/20 bg-emerald-500/10',
        panelLabel: 'text-emerald-600 dark:text-emerald-300',
        watermark: 'text-emerald-500/10 dark:text-emerald-400/10',
      }

  const primaryBarcode = product.barcodes?.[0] || product.barcode

  return (
    <section className="py-10 md:py-14">
      <div className="shell">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
          <Link to="/" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">
            الرئيسية
          </Link>
          <span aria-hidden>/</span>
          <Link to="/products" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">
            المنتجات
          </Link>
          <span aria-hidden>/</span>
          <span className="font-semibold text-slate-600 dark:text-slate-300">{product.name}</span>
        </nav>

        {/* Status Hero Card */}
        <div className={`mt-6 overflow-hidden rounded-[2rem] border shadow-sm ${accents.card}`}>
          <div className="grid lg:grid-cols-2">
            {/* Image Panel */}
            <div className="relative flex min-h-72 items-center justify-center overflow-hidden bg-white/40 p-10 lg:min-h-96 lg:border-l dark:bg-black/10">
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-0 flex items-center justify-center ${accents.watermark}`}
              >
                {boycotted ? <BanIcon className="h-64 w-64" /> : <CheckIcon className="h-64 w-64" />}
              </span>
              <ProductImage
                product={product}
                alt={product.name}
                imgClassName="relative z-10 max-h-56 w-auto max-w-full object-contain drop-shadow-xl"
                fallbackClassName="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/80 shadow-lg ring-1 ring-slate-200/70 dark:bg-slate-900/80 dark:ring-white/10"
              >
                <TagIcon className="h-12 w-12 text-slate-400" />
              </ProductImage>
            </div>

            {/* Content Panel */}
            <div className="p-8 md:p-12">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-sm ${accents.badge}`}
                >
                  {boycotted ? <BanIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
                  {boycotted ? 'مقاطع' : 'بديل آمن'}
                </span>
                {categoryName && (
                  <span className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${TONES[toneIndex(categoryName)]}`}>
                    {categoryName}
                  </span>
                )}
                {product.is_user_contributed && product.status === 'pending' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/15 px-3.5 py-1.5 text-xs font-bold text-orange-500 dark:text-orange-400">
                    ⏳ قيد المراجعة
                  </span>
                )}
                {product.is_user_contributed && product.status === 'approved' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                    ✅ تم الاعتماد
                  </span>
                )}
                {product.is_user_contributed && product.status === 'rejected' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/15 px-3.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-300">
                    ❌ مرفوض
                  </span>
                )}
              </div>

              <h1
                className={`mt-6 text-3xl font-black leading-tight tracking-tight md:text-5xl ${
                  boycotted ? 'text-rose-900 dark:text-rose-200' : 'text-emerald-900 dark:text-emerald-200'
                }`}
              >
                {product.name}
              </h1>
              {product.brand_name && product.brand_name !== product.name && (
                <p className="mt-3 text-lg font-semibold text-slate-600 dark:text-slate-300">
                  {product.brand_name}
                </p>
              )}

              <div className={`mt-7 rounded-2xl border p-5 ${accents.panel}`}>
                <p className={`flex items-center gap-1.5 text-xs font-bold tracking-wide ${accents.panelLabel}`}>
                  {boycotted ? <BanIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
                  {boycotted ? 'لماذا نقاطع هذا المنتج؟' : 'لماذا يُعدّ بديلاً آمناً؟'}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {shortDescription(product.reason) ||
                    (boycotted ? 'يدعم الاحتلال الصهيوني' : 'علامة محلية آمنة لا تدعم الاحتلال')}
                </p>
              </div>

              {primaryBarcode && (
                <p className="mt-6 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <TagIcon className="h-4 w-4" />
                  الباركود:
                  <code className="font-mono font-bold tracking-wider text-slate-700 dark:text-slate-200" dir="ltr">
                    {primaryBarcode}
                  </code>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Verified Description */}
        {description && description !== cleanDescription(product.reason) && (
          <div className="mt-8 rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckIcon className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">نبذة موثّقة</h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
          </div>
        )}

        {/* Alternatives */}
        <div className="mt-12 md:mt-16">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl">
              {alternativesTitle}
            </h2>
            <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>
          {alternatives.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 xl:grid-cols-6">
              {alternatives.slice(0, 6).map((brand) => (
                <BrandCard key={brand.id} brand={brand} />
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">
              لا توجد بدائل متاحة حالياً.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
