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
  TextInput,
  Th,
} from './ui.jsx'
import {
  ClapperboardIcon,
  EditIcon,
  EyeIcon,
  EyeOffIcon,
  PlusIcon,
  SaveIcon,
  SearchIcon,
  TrashIcon,
} from '../components/icons.jsx'
import { syncNow } from '../services/syncService.js'
import LocalImage from '../components/LocalImage.jsx'
import { videoOwnerId } from '../services/imageService.js'

const emptyForm = { title: '', embed_url: '', thumbnail_url: '' }

export default function VideosAdmin() {
  const toast = useToast()
  const { confirm, dialog } = useConfirm()
  const [videos, setVideos] = useState(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const load = useCallback(async () => {
    const result = await adminApi.list('videos')
    if (result.ok) setVideos(result.data)
    else toast.error(result.message)
  }, [toast])

  useEffect(() => {
    load()
  }, [load, refreshTrigger])

  const filtered = useMemo(() => {
    if (!videos) return []
    const query = search.trim().toLowerCase()
    return videos.filter((video) => video.title.toLowerCase().includes(query))
  }, [videos, search])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (video) => {
    setEditing(video)
    setForm({
      title: video.title,
      embed_url: video.embed_url,
      thumbnail_url: video.thumbnail_url || '',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      embed_url: form.embed_url.trim(),
      thumbnail_url: form.thumbnail_url.trim(),
    }
    const result = editing
      ? await adminApi.update('videos', editing.id, payload)
      : await adminApi.create('videos', payload)
    setSaving(false)
    if (result.ok) {
      toast.success(editing ? 'تم حفظ الفيديو.' : 'تمت إضافة الفيديو.')
      setModalOpen(false)
      setRefreshTrigger((prev) => prev + 1)
      syncNow()
    } else {
      toast.error(result.message)
    }
  }

  const handleHide = async (video) => {
    const ok = await confirm({
      title: 'إخفاء الفيديو',
      message: `سيتم إخفاء «${video.title}» من الموقع دون حذفه.`,
      confirmLabel: 'إخفاء الآن',
    })
    if (!ok) return
    const result = await adminApi.update('videos', video.id, {
      ...video,
      is_deleted: true,
    })
    if (result.ok) {
      toast.success('تم إخفاء الفيديو.')
      setRefreshTrigger((prev) => prev + 1)
      syncNow()
    } else {
      toast.error(result.message)
    }
  }

  const handleShow = async (video) => {
    const result = await adminApi.update('videos', video.id, {
      ...video,
      is_deleted: false,
    })
    if (result.ok) {
      toast.success('تمت إعادة إظهار الفيديو.')
      setRefreshTrigger((prev) => prev + 1)
      syncNow()
    } else {
      toast.error(result.message)
    }
  }

  const handleDelete = async (video) => {
    const ok = await confirm({
      title: 'أرشفة الفيديو',
      message: `سيتم أرشفة «${video.title}» وسيختفي من الواجهة العامة مع بقاء بياناته في قاعدة البيانات.`,
      confirmLabel: 'أرشفة الآن',
    })
    if (!ok) return
    const result = await adminApi.remove('videos', video.id)
    if (result.ok) {
      toast.success('تمت أرشفة الفيديو.')
      setRefreshTrigger((prev) => prev + 1)
      syncNow()
    } else {
      toast.error(result.message)
    }
  }

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  if (!videos) {
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
            placeholder="ابحث عن فيديو…"
            className="pr-10"
          />
        </div>
        <Button onClick={openCreate}>
          <PlusIcon className="h-4 w-4" />
          إضافة فيديو جديد
        </Button>
      </div>

      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
        عرض {filtered.length} من أصل {videos.length} فيديو
      </p>

      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-start">
            <thead className="border-b border-slate-200/70 bg-slate-50 dark:border-white/10 dark:bg-slate-950/40">
              <tr>
                <Th>الفيديو</Th>
                <Th>الرابط</Th>
                <Th>الحالة</Th>
                <Th className="text-end">إجراءات</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
              {filtered.map((video) => (
                <tr key={video.id} className="transition hover:bg-slate-50 dark:hover:bg-white/5">
                  <Td>
                    <div className="flex items-center gap-3">
                      <LocalImage
                        ownerId={videoOwnerId(video.id)}
                        sourceUrl={video.thumbnail_url}
                        alt={video.title}
                        imgClassName="h-10 w-16 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-white/10"
                        fallbackClassName="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-white/5"
                      >
                        <ClapperboardIcon className="h-5 w-5" />
                      </LocalImage>
                      <p className="max-w-[260px] font-bold text-slate-900 dark:text-white">
                        {video.title}
                      </p>
                    </div>
                  </Td>
                  <Td className="max-w-[220px] truncate font-mono text-xs text-slate-400 dark:text-slate-500" dir="ltr">
                    {video.embed_url}
                  </Td>
                  <Td>
                    {video.is_deleted ? (
                      <Badge tone="amber">مخفي</Badge>
                    ) : (
                      <Badge tone="emerald">منشور</Badge>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" onClick={() => openEdit(video)} title="تعديل">
                        <EditIcon className="h-4 w-4" />
                      </Button>
                      {video.is_deleted ? (
                        <Button variant="ghost" onClick={() => handleShow(video)} title="إظهار">
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" onClick={() => handleHide(video)} title="إخفاء">
                          <EyeOffIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" onClick={() => handleDelete(video)} title="أرشفة">
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
            <EmptyState title="لا توجد فيديوهات" description="أضف أول فيديو توعوي الآن." />
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={editing ? `تعديل «${editing.title}»` : 'إضافة فيديو جديد'}
          onClose={() => setModalOpen(false)}
        >
          <div className="space-y-5 px-6 py-6">
            <Field label="عنوان الفيديو *">
              <TextInput value={form.title} onChange={set('title')} placeholder="مثال: قصة المقاطعة" />
            </Field>
            <Field label="رابط التضمين (Embed) *">
              <TextInput
                value={form.embed_url}
                onChange={set('embed_url')}
                placeholder="https://www.youtube.com/embed/…"
                dir="ltr"
              />
            </Field>
            <Field label="رابط الصورة المصغرة (اختياري)">
              <TextInput value={form.thumbnail_url} onChange={set('thumbnail_url')} placeholder="https://…" dir="ltr" />
            </Field>
            <div className="flex justify-end gap-2 border-t border-slate-200/70 pt-5 dark:border-white/10">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.embed_url.trim()}>
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
