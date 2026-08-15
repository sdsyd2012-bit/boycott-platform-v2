import Dexie from 'dexie'

export const db = new Dexie('BoycottPWA_DB')

db.version(1).stores({
  categories: 'id, name',
  products: 'barcode, name, brand_name, category, updated_at',
  videos: 'id, title',
  sync_meta: 'id, last_sync_timestamp',
})

db.version(2).stores({
  categories: 'id, name',
  products: 'barcode, name, brand_name, category, updated_at',
  videos: 'id, title',
  articles: 'id, slug, title, updated_at',
  sync_meta: 'id, last_sync_timestamp',
})

db.version(3).stores({
  categories: 'id, name',
  products: 'barcode, name, brand_name, category, updated_at',
  videos: 'id, title',
  articles: 'id, slug, title, updated_at',
  sync_meta: 'id, last_sync_timestamp',
})

db.version(4).stores({
  categories: 'id, name',
  products: 'barcode, name, brand_name, category, updated_at, is_user_contributed, status',
  videos: 'id, title',
  articles: 'id, slug, title, updated_at',
  sync_meta: 'id, last_sync_timestamp',
})

db.version(5).stores({
  categories: 'id, name',
  products: 'barcode, name, brand_name, category, updated_at, status',
  videos: 'id, title',
  articles: 'id, slug, title, updated_at',
  sync_meta: 'id, last_sync_timestamp',
})

db.version(6).stores({
  categories: 'id, name',
  products: 'barcode, name, brand_name, category, updated_at, status, barcodes',
  videos: 'id, title',
  articles: 'id, slug, title, updated_at',
  sync_meta: 'id, last_sync_timestamp',
})

db.version(7).stores({
  categories: 'id, name',
  products: 'barcode, name, brand_name, category, updated_at, status, barcodes',
  videos: 'id, title',
  articles: 'id, slug, title, updated_at',
  sync_meta: 'id, last_sync_timestamp',
  images: 'id, owner_id, source_url, status',
})

export default db
