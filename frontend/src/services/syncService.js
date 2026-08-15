import axios from 'axios'

import { API_BASE_URL } from '../config/api.js'
import { db } from '../db/database.js'
import { hydrateAllImages, reconcileLocalImages } from './imageService.js'
const SYNC_ENDPOINT = `${API_BASE_URL}/sync/`
const DISCOVERIES_ENDPOINT = `${API_BASE_URL}/discoveries/`

const SYNC_META_KEY = 'global'

const SYNC_STATE = {
  idle: 'idle',
  syncing: 'syncing',
  success: 'success',
  offline: 'offline',
  error: 'error',
}

let syncState = SYNC_STATE.idle
let syncStateListeners = new Set()

export function getSyncState() {
  return syncState
}

export function subscribeSyncState(listener) {
  syncStateListeners.add(listener)
  return () => syncStateListeners.delete(listener)
}

function setSyncState(nextState) {
  if (nextState === syncState) return
  syncState = nextState
  syncStateListeners.forEach((listener) => listener(syncState))
}

async function saveLastSyncTimestamp(timestamp) {
  await db.sync_meta.put({
    id: SYNC_META_KEY,
    last_sync_timestamp: timestamp,
  })
}

async function applyProducts(products) {
  await db.transaction('rw', db.products, async () => {
    for (const product of products) {
      if (product.is_deleted === true) {
        await db.products.delete(product.barcode)
        continue
      }
      const serverData = {
        name: product.name,
        brand_name: product.brand_name,
        is_boycotted: product.is_boycotted,
        category: product.category,
        image_url: product.image_url,
        reason: product.reason,
        description: product.description,
        alternatives: product.alternatives || [],
        barcodes: product.barcodes || [],
        is_deleted: false,
        updated_at: product.updated_at,
        created_at: product.created_at,
      }
      const existing = await db.products.get(product.barcode)
      if (existing?.is_user_contributed && existing.status !== 'approved') {
        // المنتج المحلي الذي اكتشفه المستخدم أصبح معتمداً من الخادم الآن —
        // نحدّث السجل القائم في مكانه بدلاً من إنشاء نسخة مكررة.
        await db.products.update(product.barcode, {
          ...serverData,
          status: 'approved',
          is_user_contributed: true,
        })
      } else {
        await db.products.put({
          barcode: product.barcode,
          ...serverData,
        })
      }
    }
  })
}

export async function pushDiscoveries() {
  let pending = []
  try {
    pending = await db.products
      .filter(
        (product) =>
          product.is_user_contributed && product.status === 'pending' && !product.sync_pushed,
      )
      .toArray()
  } catch (err) {
    console.error('Failed to query pending discoveries from Dexie:', err)
    return { ok: false, pushed: 0, error: err }
  }

  if (pending.length === 0) {
    return { ok: true, pushed: 0 }
  }

  let pushed = 0
  for (const product of pending) {
    try {
      const categoryId = product.category ? Number(product.category) : null
      await axios.post(
        DISCOVERIES_ENDPOINT,
        {
          barcode: String(product.barcode).trim(),
          name: String(product.name).trim(),
          brand_name: product.brand_name ? String(product.brand_name).trim() : '',
          category: categoryId && !isNaN(categoryId) ? categoryId : null,
          is_boycotted: Boolean(product.is_boycotted),
          image_url: product.image_url ? String(product.image_url).trim() : '',
          reason: product.reason ? String(product.reason).trim() : '',
        },
        { timeout: 15000 },
      )
      await db.products.update(product.barcode, { sync_pushed: true })
      pushed += 1
    } catch (err) {
      console.error(`Failed to push discovery for barcode ${product.barcode}:`, err?.response?.data || err.message)
    }
  }
  return { ok: true, pushed }
}

async function applyVideos(videos) {
  await db.transaction('rw', db.videos, async () => {
    for (const video of videos) {
      if (video.is_deleted === true) {
        await db.videos.delete(video.id)
      } else {
        await db.videos.put({
          id: video.id,
          title: video.title,
          embed_url: video.embed_url,
          thumbnail_url: video.thumbnail_url,
          is_deleted: false,
          updated_at: video.updated_at,
          created_at: video.created_at,
        })
      }
    }
  })
}

async function reconcileProducts(serverProducts) {
  const serverBarcodes = new Set(
    serverProducts
      .filter((product) => product.is_deleted !== true)
      .map((product) => String(product.barcode)),
  )
  const local = await db.products.toArray()
  const toDelete = local.filter(
    (item) =>
      !serverBarcodes.has(String(item.barcode)) &&
      !(item.is_user_contributed && item.status === 'pending'),
  )
  await Promise.all(toDelete.map((item) => db.products.delete(item.barcode)))
}

async function applyCategories(categories) {
  await db.transaction('rw', db.categories, async () => {
    for (const category of categories) {
      await db.categories.put({
        id: category.id,
        name: category.name,
        icon: category.icon,
        updated_at: category.updated_at,
        created_at: category.created_at,
      })
    }
  })
}

async function applyArticles(articles) {
  await db.transaction('rw', db.articles, async () => {
    for (const article of articles) {
      if (article.is_deleted === true) {
        await db.articles.delete(article.id)
      } else {
        await db.articles.put({
          id: article.id,
          title: article.title,
          slug: article.slug,
          cover_url: article.cover_url,
          excerpt: article.excerpt,
          content: article.content,
          is_deleted: false,
          updated_at: article.updated_at,
          created_at: article.created_at,
        })
      }
    }
  })
}

export async function resetLocalDatabase() {
  await db.transaction(
    'rw',
    db.products,
    db.categories,
    db.videos,
    db.articles,
    db.sync_meta,
    db.images,
    async () => {
      await Promise.all([
        db.products.clear(),
        db.categories.clear(),
        db.videos.clear(),
        db.articles.clear(),
        db.sync_meta.clear(),
        db.images.clear(),
      ])
    },
  )
}

export async function syncNow() {
  if (syncState === SYNC_STATE.syncing) {
    return { ok: false, synced: false, reason: 'already-syncing' }
  }

  setSyncState(SYNC_STATE.syncing)

  try {
    const response = await axios.get(SYNC_ENDPOINT, { timeout: 15000 })

    const data = response.data

    // مزامنة كاملة دائماً: تصفير البيانات المحلية ثم إعادة بنائها من الخادم،
    // حتى تختفي أي بيانات قديمة لم تعد موجودة لدى الخادم (يظهر فقط ما في الخادم).
    await db.transaction('rw', db.products, db.categories, db.videos, db.articles, async () => {
      await Promise.all([
        db.categories.clear(),
        db.videos.clear(),
        db.articles.clear(),
        reconcileProducts(data.products || []),
      ])
    })

    await Promise.all([
      applyCategories(data.categories || []),
      applyProducts(data.products || []),
      applyVideos(data.videos || []),
      applyArticles(data.articles || []),
    ])

    if (data.server_time) {
      await saveLastSyncTimestamp(data.server_time)
    }

    await pushDiscoveries()

    await reconcileLocalImages()
    // تنزيل خلفي للصور ذات الروابط الخارجية فقط (إن وُجدت) ثم تخزينها محلياً.
    hydrateAllImages({
      products: data.products || [],
      videos: data.videos || [],
      articles: data.articles || [],
    }).catch(() => {})

    setSyncState(SYNC_STATE.success)
    return { ok: true, synced: true, serverTime: data.server_time }
  } catch (error) {
    if (error.code === 'ECONNABORTED' || !error.response) {
      setSyncState(SYNC_STATE.offline)
      return { ok: false, synced: false, offline: true }
    }
    setSyncState(SYNC_STATE.error)
    return { ok: false, synced: false, error }
  }
}
