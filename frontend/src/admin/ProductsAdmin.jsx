import { useCallback, useEffect, useMemo, useState } from 'react'

import { adminApi } from './adminApi.js'
import { useToast } from './Toast.jsx'
import { useConfirm } from './Confirm.jsx'
import Modal from './Modal.jsx'
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Select,
  Spinner,
  Td,
  TextArea,
  TextInput,
  Th,
  Toggle,
} from './ui.jsx'
import {
  EditIcon,
  EyeIcon,
  EyeOffIcon,
  ImageIcon,
  PlusIcon,
  SaveIcon,
  SearchIcon,
  TrashIcon,
} from '../components/icons.jsx'
import { syncNow } from '../services/syncService.js'
import { ProductImage } from '../components/LocalImage.jsx'

const emptyForm = {
  barcode: '',
  barcodes: '',
  name: '',
  brand_name: '',
  category: '',
  is_boycotted: true,
  image_url: '',
  reason: '',
  description: '',
  alternatives: '',
}

function productToForm(product) {
  return {
    barcode: product.barcode || '',
    barcodes: Array.isArray(product.barcodes) ? product.barcodes.join(', ') : '',
    name: product.name || '',
    brand_name: product.brand_name || '',
    category: product.category || '',
    is_boycotted: product.is_boycotted,
    image_url: product.image_url || '',
    reason: product.reason || '',
    description: product.description || '',
    alternatives: Array.isArray(product.alternatives) ? product.alternatives.join('\n') : '',
  }
}

function formToPayload(form) {
  const alternatives = form.alternatives
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
  const barcodes = form.barcodes
    .split(/[,،\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
  return {
    barcode: form.barcode.trim(),
    barcodes,
    name: form.name.trim(),
    brand_name: form.brand_name.trim(),
    category: form.category || null,
    is_boycotted: form.is_boycotted,
    image_url: form.image_url.trim(),
    reason: form.reason.trim(),
    description: form.description.trim(),
    alternatives,
  }
}

export default function ProductsAdmin() {
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const [products, setProducts] = useState(null)
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [visibilityFilter, setVisibilityFilter] = useState('all')
  const [imageFilter, setImageFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const load = useCallback(async () => {
    const [productsResult, categoriesResult] = await Promise.all([
      adminApi.list('products'),
      adminApi.list('categories'),
    ])
    if (productsResult.ok) setProducts(productsResult.data)
    else toast.error(productsResult.message)
    if (categoriesResult.ok) setCategories(categoriesResult.data)
    else toast.error(categoriesResult.message)
  }, [toast])

  useEffect(() => {
    load()
  }, [load, refreshTrigger])

  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const filtered = useMemo(() => {
    if (!products) return []
    const query = search.trim().toLowerCase()
    return products.filter((product) => {
      const barcodes = Array.isArray(product.barcodes) ? product.barcodes : []
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.brand_name.toLowerCase().includes(query) ||
        product.barcode.toLowerCase().includes(query) ||
        barcodes.some((code) => code.toLowerCase().includes(query))
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'boycotted' && product.is_boycotted) ||
        (statusFilter === 'support' && !product.is_boycotted)
      const matchesVisibility =
        visibilityFilter === 'all' ||
        (visibilityFilter === 'visible' && !product.is_deleted) ||
        (visibilityFilter === 'hidden' && product.is_deleted)
      const matchesImage =
        imageFilter === 'all' ||
        (imageFilter === 'with' && Boolean(product.image_url)) ||
        (imageFilter === 'without' && !product.image_url)
      return matchesSearch && matchesStatus && matchesVisibility && matchesImage
    })
  }, [products, search, statusFilter, visibilityFilter, imageFilter])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (product) => {
    setEditing(product)
    setForm(productToForm(product))
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = formToPayload(form)
    const result = editing
      ? await adminApi.update('products', editing.id, payload)
      : await adminApi.create('products', payload)
    setSaving(false)
    if (result.ok) {
      toast.success(editing ? 'تم حفظ التعديلات.' : 'تمت إضافة المنتج بنجاح.')
      setModalOpen(false)
      setRefreshTrigger((prev) => prev + 1)
      syncNow()
    } else {
      toast.error(result.message)
    }
  }

  const handleHide = async (product) => {
    const ok = await confirm({
      title: 'إخفاء المنتج',
      message: `سيتم إخفاء «${product.name}» من الموقع، مع بقاء بياناته محفوظة. يمكنك إظهاره لاحقاً.`,
      confirmLabel: 'إخفاء الآن',
    })
    if (!ok) return
    const result = await adminApi.update('products', product.id, {
      ...product,
      is_deleted: true,
    })
    if (result.ok) {
      toast.success('تم إخفاء المنتج.')
      setRefreshTrigger((prev) => prev + 1)
      syncNow()
    } else {
      toast.error(result.message)
    }
  }

  const handleShow = async (product) => {
    const result = await adminApi.update('products', product.id, {
      ...product,
      is_deleted: false,
    })
    if (result.ok) {
      toast.success('تمت إعادة إظهار المنتج.')
      setRefreshTrigger((prev) => prev + 1)
      syncNow()
    } else {
      toast.error(result.message)
    }
  }

  const handleDelete = async (product) => {
    const ok = await confirm({
      title: 'أرشفة المنتج',
      message: `سيتم أرشفة «${product.name}» وسيختفي من الواجهة العامة مع بقاء بياناته في قاعدة البيانات. يمكنك إظهاره لاحقاً.`,
      confirmLabel: 'أرشفة الآن',
    })
    if (!ok) return
    const result = await adminApi.remove('products', product.id)
    if (result.ok) {
      toast.success('تمت أرشفة المنتج.')
      setRefreshTrigger((prev) => prev + 1)
      syncNow()
    } else {
      toast.error(result.message)
    }
  }

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  if (!products) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-emerald-600" />
      </div>
    )
  }

  const pillClass = (active) =>
    `rounded-full px-4 py-1.5 text-xs font-semibold transition ${
      active
        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
        : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300'
    }`

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <SearchIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم، العلامة، أو الباركود…"
            className="pr-10"
          />
        </div>
        <Button onClick={openCreate}>
          <PlusIcon className="h-4 w-4" />
          إضافة منتج جديد
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {['all', 'boycotted', 'support'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={pillClass(statusFilter === key)}
          >
            {key === 'all' ? 'كل الحالات' : key === 'boycotted' ? 'قيد المقاطعة' : 'دعم وبدائل'}
          </button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block dark:bg-white/10" />
        {['all', 'visible', 'hidden'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setVisibilityFilter(key)}
            className={pillClass(visibilityFilter === key)}
          >
            {key === 'all' ? 'كل العناصر' : key === 'visible' ? 'المرئي' : 'المخفي'}
          </button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block dark:bg-white/10" />
        {['all', 'with', 'without'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setImageFilter(key)}
            className={pillClass(imageFilter === key)}
          >
            {key === 'all' ? 'كل الصور' : key === 'with' ? 'بصورة' : 'بدون صورة'}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
        عرض {filtered.length} من أصل {products.length} منتج
      </p>

      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-start">
            <thead className="border-b border-slate-200/70 bg-slate-50 dark:border-white/10 dark:bg-slate-950/40">
              <tr>
                <Th>المنتج</Th>
                <Th>الباركود</Th>
                <Th>الصنف</Th>
                <Th>الحالة</Th>
                <Th>آخر تحديث</Th>
                <Th className="text-end">إجراءات</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
              {filtered.map((product) => (
                <tr key={product.id} className="transition hover:bg-slate-50 dark:hover:bg-white/5">
                  <Td>
                    <div className="flex items-center gap-3">
                      <ProductImage
                        product={product}
                        alt={product.name}
                        imgClassName="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-contain p-1 dark:border-white/10"
                        fallbackClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-white/5"
                      >
                        <ImageIcon className="h-5 w-5" />
                      </ProductImage>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{product.name}</p>
                        {product.brand_name && (
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {product.brand_name}
                          </p>
                        )}
                        {!product.image_url && (
                          <Badge tone="amber" className="mt-1">بدون صورة</Badge>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td className="font-mono text-xs">
                    {Array.isArray(product.barcodes) && product.barcodes[0]
                      ? product.barcodes[0]
                      : product.barcode}
                  </Td>
                  <Td>{categoryById[product.category] || '—'}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      {product.is_deleted ? (
                        <Badge tone="amber">مخفي</Badge>
                      ) : product.is_boycotted ? (
                        <Badge tone="rose">قيد المقاطعة</Badge>
                      ) : (
                        <Badge tone="emerald">دعم وبدائل</Badge>
                      )}
                    </div>
                  </Td>
                  <Td className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(product.updated_at).toLocaleDateString('ar')}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" onClick={() => openEdit(product)} title="تعديل">
                        <EditIcon className="h-4 w-4" />
                      </Button>
                      {product.is_deleted ? (
                        <Button variant="ghost" onClick={() => handleShow(product)} title="إظهار">
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" onClick={() => handleHide(product)} title="إخفاء">
                          <EyeOffIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" onClick={() => handleDelete(product)} title="أرشفة">
                        <TrashIcon className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-6">
            <EmptyState
              title="لا توجد منتجات مطابقة"
              description="جرّب تعديل البحث أو الفلاتر."
            />
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={editing ? `تعديل «${editing.name}»` : 'إضافة منتج جديد'}
          onClose={() => setModalOpen(false)}
          wide
        >
          <div className="space-y-5 px-6 py-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="اسم المنتج *">
                <TextInput value={form.name} onChange={set('name')} placeholder="مثال: Coca-Cola" />
              </Field>
              <Field label="العلامة التجارية">
                <TextInput value={form.brand_name} onChange={set('brand_name')} placeholder="مثال: Coca-Cola Company" />
              </Field>
              <Field label="الباركود *">
                <TextInput value={form.barcode} onChange={set('barcode')} placeholder="مثال: 6291041500213" />
              </Field>
              <Field
                label="باركودات إضافية"
                hint="اربط المنتج بأرقام الباركود الحقيقية المطبوعة على العبوة، مفصولة بفواصل."
              >
                <TextInput
                  value={form.barcodes}
                  onChange={set('barcodes')}
                  placeholder="مثال: 5449000000996, 5449000131805"
                  dir="ltr"
                />
              </Field>
              <Field label="الصنف">
                <Select value={form.category} onChange={set('category')}>
                  <option value="">بدون صنف</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="رابط الشعار (اختياري)">
              <TextInput value={form.image_url} onChange={set('image_url')} placeholder="https://…" dir="ltr" />
            </Field>

            <div>
              <Field label="حالة المنتج">
                <div className="pt-1">
                  <Toggle
                    checked={form.is_boycotted}
                    onChange={(value) => setForm((current) => ({ ...current, is_boycotted: value }))}
                    label={form.is_boycotted ? 'قيد المقاطعة' : 'دعم وبدائل'}
                  />
                </div>
              </Field>
            </div>

            <Field label="سبب المقاطعة / وصف قصير">
              <TextArea
                value={form.reason}
                onChange={set('reason')}
                placeholder="اكتب سبب الإدراج أو وصفاً للمنتج…"
              />
            </Field>

            <Field
              label="الوصف"
              hint="وصف موسّع يظهر في صفحة تفاصيل المنتج."
            >
              <TextArea
                value={form.description}
                onChange={set('description')}
                rows={4}
                placeholder="اكتب نبذة وافية عن المنتج أو الشركة…"
              />
            </Field>

            <Field
              label="البدائل"
              hint="كل بديل في سطر مستقل."
            >
              <TextArea
                value={form.alternatives}
                onChange={set('alternatives')}
                placeholder={'بديل أول\nبديل ثانٍ'}
              />
            </Field>

            <div className="flex justify-end gap-2 border-t border-slate-200/70 pt-5 dark:border-white/10">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.barcode.trim()}>
                {saving ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    جارِ الحفظ…
                  </>
                ) : (
                  <>
                    <SaveIcon className="h-4 w-4" />
                    حفظ
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {dialog}
    </div>
  )
}
