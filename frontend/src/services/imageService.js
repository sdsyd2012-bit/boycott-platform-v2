/**
 * Central image service — Local-First policy.
 *
 * القاعدة: الرابط الخارجي مصدر استيراد فقط، وليس مصدر عرض.
 * - إذا كانت هناك صورة محلية سليمة → استخدمها.
 * - إذا كانت الصورة remote ولم تُنزّل بعد → مرّرها عبر pipeline التنزيل.
 * - بعد نجاح التنزيل → استخدم النسخة المحلية (Blob محفوظ في Dexie).
 * - إذا فشل التنزيل → fallback (لا نعرض الرابط الخارجي أبداً افتراضياً).
 */

import { db } from '../db/database.js'
import { API_BASE_URL } from '../config/api.js'

const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin
  } catch {
    return ''
  }
})()

const MAX_BYTES = 5 * 1024 * 1024
const MAX_DIMENSION = 640
const MIN_DIMENSION = 16
const HYDRATION_CONCURRENCY = 6

const inflight = new Map()
const failedAt = new Map()
const FAILED_RETRY_MS = 10 * 60 * 1000

export const IMAGE_STATES = {
  none: 'none',
  local: 'local',
  ready: 'ready',
  pending: 'pending',
  failed: 'failed',
}

/** اسم حتمي (hash) لكيان الصورة داخل Dexie — يمنع التعارض بين الكيانات. */
export function ownerImageId(ownerId) {
  let hash = 0xcbf29ce484222325n
  for (const char of String(ownerId)) {
    hash ^= BigInt(char.codePointAt(0))
    hash = BigInt.asUintN(64, hash * 0x100000001b3n)
  }
  return hash.toString(16).padStart(16, '0')
}

export const productOwnerId = (barcode) => `product:${barcode}`
export const videoOwnerId = (id) => `video:${id}`
export const articleOwnerId = (id) => `article:${id}`

export function isRemoteUrl(url) {
  return Boolean(url) && /^https?:\/\//i.test(String(url).trim())
}

/** هل يُعدّ هذا الرابط "محلياً" (يُقدَّم من أصل الـ API نفسه)؟ */
export function isApiLocalUrl(url) {
  const value = String(url || '').trim()
  if (!value) return false
  if (value.startsWith('/')) return true
  if (isRemoteUrl(value)) {
    try {
      return new URL(value).origin === API_ORIGIN
    } catch {
      return false
    }
  }
  return false
}

/** يحوّل مساراً نسبياً مثل /media/... إلى رابط كامل من أصل الـ API. */
export function resolveMediaUrl(url) {
  const value = String(url || '').trim()
  if (!value) return ''
  if (value.startsWith('/') && API_ORIGIN) {
    try {
      return new URL(value, API_ORIGIN).href
    } catch {
      return value
    }
  }
  return value
}

async function downloadBlob(sourceUrl) {
  const response = await fetch(sourceUrl, { mode: 'cors' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const contentType = String(response.headers.get('Content-Type') || '').toLowerCase()
  if (!contentType.startsWith('image/')) {
    throw new Error(`محتوى غير صوري: ${contentType || 'غير معروف'}`)
  }
  const blob = await response.blob()
  if (blob.size > MAX_BYTES) throw new Error(`حجم الصورة كبير: ${blob.size}`)
  return blob
}

async function optimizeToWebP(blob) {
  const bitmap = await createImageBitmap(blob)
  const width = bitmap.width
  const height = bitmap.height
  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    bitmap.close()
    throw new Error(`أبعاد صغيرة جداً: ${width}x${height}`)
  }
  const maxDim = Math.max(width, height)
  const scale = maxDim > MAX_DIMENSION ? MAX_DIMENSION / maxDim : 1
  const targetWidth = Math.max(1, Math.round(width * scale))
  const targetHeight = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)
  bitmap.close()

  const webp = await new Promise((resolve) =>
    canvas.toBlob((out) => resolve(out), 'image/webp', 0.85),
  )
  return {
    blob: webp || blob,
    width: targetWidth,
    height: targetHeight,
    mimeType: webp ? 'image/webp' : blob.type,
  }
}

/**
 * Pipeline التنزيل والاستيراد:
 * تنزيل → تحقق MIME → تحقق صورة حقيقية (createImageBitmap) → تحقق أبعاد →
 * تحسين/تحويل WebP → تخزين محلي في Dexie. الاسم حتمي (hash) حسب ownerId.
 */
export async function ensureLocalImage({ ownerId, sourceUrl }) {
  const url = String(sourceUrl || '').trim()
  if (!url || !ownerId) return null
  const isLocal = isApiLocalUrl(url)
  if (!isLocal && !isRemoteUrl(url)) return null
  const fetchUrl = isLocal ? resolveMediaUrl(url) : url

  const id = ownerImageId(ownerId)
  if (inflight.has(id)) return inflight.get(id)

  const existing = await db.images.get(id)
  if (existing?.status === 'ready') return existing
  const lastFailed = failedAt.get(id)
  if (lastFailed && Date.now() - lastFailed < FAILED_RETRY_MS) {
    return existing?.status === 'failed' ? null : undefined
  }

  const now = new Date().toISOString()
  const task = (async () => {
    await db.images.put({
      id,
      owner_id: ownerId,
      source_url: url,
      status: 'pending',
      created_at: existing?.created_at || now,
      updated_at: now,
    })
    try {
      const raw = await downloadBlob(fetchUrl)
      const optimized = await optimizeToWebP(raw)
      const record = {
        id,
        owner_id: ownerId,
        source_url: url,
        status: 'ready',
        blob: optimized.blob,
        mime_type: optimized.mimeType,
        width: optimized.width,
        height: optimized.height,
        bytes: optimized.blob.size,
        created_at: existing?.created_at || now,
        updated_at: new Date().toISOString(),
      }
      await db.images.put(record)
      return record
    } catch (error) {
      failedAt.set(id, Date.now())
      await db.images.put({
        id,
        owner_id: ownerId,
        source_url: url,
        status: 'failed',
        error: error?.message || String(error),
        created_at: existing?.created_at || now,
        updated_at: new Date().toISOString(),
      })
      return null
    }
  })()

  inflight.set(id, task)
  try {
    return await task
  } finally {
    inflight.delete(id)
  }
}

/**
 * Resolver المركزي: قرار عرض الصورة.
 * يُرجع { state, src } حيث src رابط جاهز للعرض عند state = local،
 * أو Blob محلي عند state = ready.
 */
export function resolveImage({ sourceUrl }, cachedRecord) {
  const url = String(sourceUrl || '').trim()
  if (!url) return { state: IMAGE_STATES.none, src: '' }
  if (isApiLocalUrl(url)) {
    if (cachedRecord?.status === 'ready' && cachedRecord.blob) {
      return { state: IMAGE_STATES.ready, src: '', blob: cachedRecord.blob }
    }
    if (cachedRecord?.status === 'failed') return { state: IMAGE_STATES.failed, src: '' }
    return { state: IMAGE_STATES.local, src: resolveMediaUrl(url) }
  }
  if (cachedRecord?.status === 'ready' && cachedRecord.blob) {
    return { state: IMAGE_STATES.ready, src: '', blob: cachedRecord.blob }
  }
  if (cachedRecord?.status === 'failed') return { state: IMAGE_STATES.failed, src: '' }
  return { state: IMAGE_STATES.pending, src: '' }
}

/** Resolver خاص بالمنتجات (باستخدام product.image_url). */
export function resolveProductImage(product, cachedRecord) {
  return resolveImage(
    { sourceUrl: product?.image_url || product?.logo_url || '' },
    cachedRecord,
  )
}

async function queueWorker(jobs, indexRef) {
  while (indexRef.current < jobs.length) {
    const job = jobs[indexRef.current]
    indexRef.current += 1
    try {
      await ensureLocalImage(job)
    } catch {
      // فشل فردي لا يوقف باقي القائمة
    }
  }
}

/**
 * Hydration خلفي: ينزّل صور كل الكيانات ذات الروابط الخارجية
 * ويخزنها محلياً بحد أقصى HYDRATION_CONCURRENCY اتصالات متزامنة.
 */
export async function hydrateAllImages({ products = [], videos = [], articles = [] } = {}) {
  const jobs = []
  for (const product of products) {
    const url = product?.image_url || ''
    if (isRemoteUrl(url) || isApiLocalUrl(url)) {
      jobs.push({ ownerId: productOwnerId(product.barcode), sourceUrl: url })
    }
  }
  for (const video of videos) {
    if (isRemoteUrl(video?.thumbnail_url) || isApiLocalUrl(video?.thumbnail_url)) {
      jobs.push({ ownerId: videoOwnerId(video.id), sourceUrl: video.thumbnail_url })
    }
  }
  for (const article of articles) {
    if (isRemoteUrl(article?.cover_url) || isApiLocalUrl(article?.cover_url)) {
      jobs.push({ ownerId: articleOwnerId(article.id), sourceUrl: article.cover_url })
    }
  }
  if (jobs.length === 0) return
  const indexRef = { current: 0 }
  await Promise.all(
    Array.from({ length: Math.min(HYDRATION_CONCURRENCY, jobs.length) }, () =>
      queueWorker(jobs, indexRef),
    ),
  )
}

/** حذف سجلات الصور لكيانات لم تعد موجودة محلياً. */
export async function reconcileLocalImages() {
  const [products, videos, articles] = await Promise.all([
    db.products.toArray(),
    db.videos.toArray(),
    db.articles.toArray(),
  ])
  const owners = new Set([
    ...products.map((p) => productOwnerId(p.barcode)),
    ...videos.map((v) => videoOwnerId(v.id)),
    ...articles.map((a) => articleOwnerId(a.id)),
  ])
  const images = await db.images.toArray()
  const stale = images.filter((img) => !owners.has(img.owner_id)).map((img) => img.id)
  if (stale.length > 0) await db.images.bulkDelete(stale)
}
