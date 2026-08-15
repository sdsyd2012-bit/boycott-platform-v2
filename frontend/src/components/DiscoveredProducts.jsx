import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'

import { db } from '../db/database.js'
import { shortDescription } from '../lib/brand.js'
import { BanIcon, CheckIcon, ClockIcon, ImageIcon } from './icons.jsx'
import { ProductImage } from './LocalImage.jsx'

export default function DiscoveredProducts() {
  const products = useLiveQuery(
    () => db.products.filter((product) => product.is_user_contributed).toArray(),
    [],
  )
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  if (!products || !categories) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  const categoryById = new Map(categories.map((category) => [category.id, category.name]))

  const sorted = [...products].sort((a, b) => (a.created_at > b.created_at ? -1 : 1))

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-white/15 dark:bg-slate-900/50">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
          <ClockIcon className="h-7 w-7" />
        </span>
        <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">لا توجد مساهمات بعد</h3>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          عندما تكتشف منتجاً غير موجود في القائمة وتضيفه من صفحة تفاصيل الباركود، سيظهر هنا
          بانتظار المراجعة.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
      {sorted.map((product) => {
        const status = product.is_boycotted ? 'avoid' : 'safe'
        return (
          <Link
            key={product.barcode}
            to={`/product/${product.barcode}`}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-slate-900/70"
          >
            <div className="relative flex h-28 items-center justify-center border-b border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-800/60">
              <ProductImage
                product={product}
                alt={product.name}
                imgClassName="max-h-20 w-auto max-w-full object-contain"
                fallbackClassName="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200 text-slate-400 dark:bg-white/5"
              >
                <ImageIcon className="h-6 w-6" />
              </ProductImage>
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-bold text-white">
                <ClockIcon className="h-3 w-3" />
                قيد المراجعة
              </span>
            </div>
            <div className="p-3.5">
              <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{product.name}</h3>
              {product.brand_name && (
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{product.brand_name}</p>
              )}
              {product.category && (
                <p className="mt-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  {categoryById.get(product.category) || ''}
                </p>
              )}
              {product.reason && (
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {shortDescription(product.reason, 70)}
                </p>
              )}
              <span
                className={`mt-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  status === 'avoid'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {status === 'avoid' ? <BanIcon className="h-3 w-3" /> : <CheckIcon className="h-3 w-3" />}
                {status === 'avoid' ? 'مقاطع' : 'آمن'}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
