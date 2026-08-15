import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import DiscoveredProducts from '../components/DiscoveredProducts.jsx'
import { PackagePlusIcon, PlusIcon, CloseIcon, BanIcon, CheckIcon } from '../components/icons.jsx'
import { db } from '../db/database.js'
import { useToast } from '../admin/Toast.jsx'
import { pushDiscoveries } from '../services/syncService.js'

const EMPTY_FORM = {
  barcode: '',
  name: '',
  brandName: '',
  category: '',
  isBoycotted: true,
  imageUrl: '',
  reason: '',
}

export default function ContributionsPage() {
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const categories = useLiveQuery(() => db.categories.toArray(), [])

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    const barcode = form.barcode.trim()
    const name = form.name.trim()

    if (!barcode) {
      toast.error('رقم الباركود مطلوب')
      return
    }
    if (!name) {
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
      name,
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
        toast.success('تم إرسال المساهمة بنجاح إلى الخادم للمراجعة!')
      } else {
        toast.success('تم حفظ مساهمتك محلياً، وستُرسل فور الاتصال بالخادم.')
      }
      setModalOpen(false)
      setForm(EMPTY_FORM)
    } catch (err) {
      console.error('Error submitting discovery:', err)
      toast.error('تعذّر إرسال المساهمة، حاول مجدداً.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="py-12 md:py-16">
      <div className="shell">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
              <PackagePlusIcon className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
                مساهماتي
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                المنتجات التي قمت باقتراحها، وتظهر هنا بانتظار المراجعة ثم تُنشر للجميع بعد اعتمادها.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 active:scale-95"
          >
            <PlusIcon className="h-5 w-5" />
            إضافة منتج جديد للمراجعة
          </button>
        </div>

        <div className="mt-8">
          <DiscoveredProducts />
        </div>

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
              className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />
            <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/15 dark:bg-slate-900 md:p-8">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                    <PackagePlusIcon className="h-5 w-5" />
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    اقترح منتجاً جديداً
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-right">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      الباركود <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.barcode}
                      onChange={set('barcode')}
                      placeholder="6291041500213"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/15 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      اسم المنتج <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={set('name')}
                      placeholder="اسم المنتج"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/15 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      العلامة التجارية
                    </label>
                    <input
                      type="text"
                      value={form.brandName}
                      onChange={set('brandName')}
                      placeholder="العلامة التجاريّة"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/15 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      التصنيف
                    </label>
                    <select
                      value={form.category}
                      onChange={set('category')}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/15 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="">بدون تصنيف</option>
                      {(categories || []).map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    حالة المنتج
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, isBoycotted: true })}
                      className={`rounded-xl border py-2 text-xs font-bold transition ${
                        form.isBoycotted
                          ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                          : 'border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400'
                      }`}
                    >
                      <BanIcon className="ml-1 inline h-3.5 w-3.5" />
                      مقاطع
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, isBoycotted: false })}
                      className={`rounded-xl border py-2 text-xs font-bold transition ${
                        !form.isBoycotted
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                          : 'border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400'
                      }`}
                    >
                      <CheckIcon className="ml-1 inline h-3.5 w-3.5" />
                      آمن
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    رابط الصورة (اختياري)
                  </label>
                  <input
                    type="url"
                    dir="ltr"
                    value={form.imageUrl}
                    onChange={set('imageUrl')}
                    placeholder="https://…"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/15 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    سبب المقاطعة / ملاحظات
                  </label>
                  <textarea
                    value={form.reason}
                    onChange={set('reason')}
                    rows={3}
                    placeholder="سبب إدراج المنتج…"
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/15 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200/80 pt-4 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-60"
                  >
                    {saving ? 'جارِ الإرسال…' : 'إرسال للمراجعة'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
