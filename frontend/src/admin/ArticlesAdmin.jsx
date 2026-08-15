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
  Spinner,
  Td,
  TextArea,
  TextInput,
  Th,
} from './ui.jsx'
import {
  EditIcon,
  EyeIcon,
  EyeOffIcon,
  FileTextIcon,
  PlusIcon,
  SaveIcon,
  SearchIcon,
  TrashIcon,
} from '../components/icons.jsx'
import { syncNow } from '../services/syncService.js'
import LocalImage from '../components/LocalImage.jsx'
import { articleOwnerId } from '../services/imageService.js'

const ARABIC_TO_LATIN = {
  أ: 'a', إ: 'a', آ: 'a', ا: 'a',
  ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh',
  د: 'd', ذ: 'dh', ر: 'r', ز: 'z', س: 's', ش: 'sh',
  ص: 's', ض: 'd', ط: 't', ظ: 'z', ع: 'aa', غ: 'gh',
  ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n',
  ه: 'h', و: 'w', ي: 'y', ة: 'h', ى: 'a', ء: '',
  ' ': '-', '،': '', '، ': '-', ':': '', '؟': '', '!': '',
}

function toSlug(title) {
  const normalized = title
    .toLowerCase()
    .replace(/[^\u0600-\u06FF\sA-Za-z0-9]/g, '')
    .split('')
    .map((char) => ARABIC_TO_LATIN[char] || char)
    .join('')
    .replace(/[-\s]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'post'
}

const emptyForm = {
  title: '',
  slug: '',
  cover_url: '',
  excerpt: '',
  content: '',
}

export default function ArticlesAdmin() {
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const [articles, setArticles] = useState(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const load = useCallback(async () => {
    const result = await adminApi.list('articles')
    if (result.ok) setArticles(result.data)
    else toast.error(result.message)
  }, [toast])

  useEffect(() => {
    load()
  }, [load, refreshTrigger])

  const filtered = useMemo(() => {
    if (!articles) return []
    const query = search.trim().toLowerCase()
    return articles.filter(
      (article) =>
        article.title.toLowerCase().includes(query) ||
        article.slug.toLowerCase().includes(query),
    )
  }, [articles, search])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (article) => {
    setEditing(article)
    setForm({
      title: article.title,
      slug: article.slug,
      cover_url: article.cover_url || '',
      excerpt: article.excerpt || '',
      content: article.content || '',
    })
    setModalOpen(true)
  }

  const generateSlug = () => {
    if (!form.title.trim()) {
      toast.error('اكتب عنوان المقال أولاً لتوليد الرابط.')
      return
    }
    setForm((current) => ({ ...current, slug: toSlug(current.title) }))
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      slug: (form.slug.trim() || toSlug(form.title)).toLowerCase(),
      cover_url: form.cover_url.trim(),
      excerpt: form.excerpt.trim(),
      content: form.content.trim(),
    }
    const result = editing
      ? await adminApi.update('articles', editing.id, payload)
      : await adminApi.create('articles', payload)
    setSaving(false)
    if (result.ok) {
      toast.success(editing ? 'تم حفظ المقال.' : 'تم نشر المقال.')
      setModalOpen(false)
      setRefreshTrigger((prev) => prev + 1)
      syncNow()
    } else {
      toast.error(result.message)
    }
  }

  const handleHide = async (article) => {
    const ok = await confirm({
      title: 'إخفاء المقال',
      message: `سيتم إخفاء «${article.title}» من الموقع دون حذف محتواه.`,
      confirmLabel: 'إخفاء الآن',
    })
    if (!ok) return
    const result = await adminApi.update('articles', article.id, {
      ...article,
      is_deleted: true,
    })
    if (result.ok) {
      toast.success('تم إخفاء المقال.')
      setRefreshTrigger((prev) => prev + 1)
      syncNow()
    } else {
      toast.error(result.message)
    }
  }

  const handleShow = async (article) => {
    const result = await adminApi.update('articles', article.id, {
      ...article,
      is_deleted: false,
    })
    if (result.ok) {
      toast.success('تمت إعادة نشر المقال.')
      setRefreshTrigger((prev) => prev + 1)
      syncNow()
    } else {
      toast.error(result.message)
    }
  }

  const handleDelete = async (article) => {
    const ok = await confirm({
      title: 'أرشفة المقال',
      message: `سيتم أرشفة «${article.title}» وسيختفي من الواجهة العامة مع بقاء بياناته في قاعدة البيانات.`,
      confirmLabel: 'أرشفة الآن',
    })
    if (!ok) return
    const result = await adminApi.remove('articles', article.id)
    if (result.ok) {
      toast.success('تمت أرشفة المقال.')
      setRefreshTrigger((prev) => prev + 1)
      syncNow()
    } else {
      toast.error(result.message)
    }
  }

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  if (!articles) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-emerald-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <SearchIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن مقال…"
            className="pr-10"
          />
        </div>
        <Button onClick={openCreate}>
          <PlusIcon className="h-4 w-4" />
          كتابة مقال جديد
        </Button>
      </div>

      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
        عرض {filtered.length} من أصل {articles.length} مقال
      </p>

      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-start">
            <thead className="border-b border-slate-200/70 bg-slate-50 dark:border-white/10 dark:bg-slate-950/40">
              <tr>
                <Th>العنوان</Th>
                <Th>الرابط</Th>
                <Th>الحالة</Th>
                <Th>آخر تحديث</Th>
                <Th className="text-end">إجراءات</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
              {filtered.map((article) => (
                <tr key={article.id} className="transition hover:bg-slate-50 dark:hover:bg-white/5">
                  <Td>
                    <div className="flex items-center gap-3">
                      <LocalImage
                        ownerId={articleOwnerId(article.id)}
                        sourceUrl={article.cover_url}
                        alt={article.title}
                        imgClassName="h-10 w-14 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-white/10"
                        fallbackClassName="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-white/5"
                      >
                        <FileTextIcon className="h-5 w-5" />
                      </LocalImage>
                      <p className="max-w-[220px] font-bold text-slate-900 dark:text-white">
                        {article.title}
                      </p>
                    </div>
                  </Td>
                  <Td className="font-mono text-xs text-slate-400 dark:text-slate-500">
                    /{article.slug}
                  </Td>
                  <Td>
                    {article.is_deleted ? (
                      <Badge tone="amber">مخفي</Badge>
                    ) : (
                      <Badge tone="emerald">منشور</Badge>
                    )}
                  </Td>
                  <Td className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(article.updated_at).toLocaleDateString('ar')}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" onClick={() => openEdit(article)} title="تعديل">
                        <EditIcon className="h-4 w-4" />
                      </Button>
                      {article.is_deleted ? (
                        <Button variant="ghost" onClick={() => handleShow(article)} title="إعادة نشر">
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" onClick={() => handleHide(article)} title="إخفاء">
                          <EyeOffIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" onClick={() => handleDelete(article)} title="أرشفة">
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
            <EmptyState title="لا توجد مقالات" description="اكتب أول مقال توعوي الآن." />
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={editing ? `تعديل «${editing.title}»` : 'مقال جديد'}
          onClose={() => setModalOpen(false)}
          wide
        >
          <div className="space-y-5 px-6 py-6">
            <Field label="عنوان المقال *">
              <TextInput value={form.title} onChange={set('title')} placeholder="مثال: المقاطعة أداة وعي لا تعب" />
            </Field>

            <div>
              <Field label="الرابط (Slug)" hint="أتركه فارغاً وسيُولَّد تلقائياً من العنوان.">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">/</span>
                  <TextInput value={form.slug} onChange={set('slug')} placeholder="moqataa-aware" dir="ltr" />
                  <Button variant="secondary" onClick={generateSlug} className="shrink-0">
                    توليد تلقائي
                  </Button>
                </div>
              </Field>
            </div>

            <Field label="رابط الصورة (اختياري)">
              <TextInput value={form.cover_url} onChange={set('cover_url')} placeholder="https://…" dir="ltr" />
            </Field>

            <Field label="الملخص (اختياري)">
              <TextArea value={form.excerpt} onChange={set('excerpt')} rows={2} placeholder="جملة قصيرة تظهر في بطاقة المقال…" />
            </Field>

            <Field label="محتوى المقال">
              <TextArea value={form.content} onChange={set('content')} rows={10} placeholder="اكتب المقال هنا… كل فقرة في سطر منفصل." />
            </Field>

            <div className="flex justify-end gap-2 border-t border-slate-200/70 pt-5 dark:border-white/10">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
                {saving ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    جارِ الحفظ…
                  </>
                ) : (
                  <>
                    <SaveIcon className="h-4 w-4" />
                    نشر المقال
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
