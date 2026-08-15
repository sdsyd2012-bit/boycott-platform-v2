import { Link } from 'react-router-dom'
import { BanIcon, CheckIcon, TagIcon } from './icons.jsx'
import { shortDescription } from '../lib/brand.js'
import { ProductImage } from './LocalImage.jsx'

export const TONES = [
  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
  'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20',
  'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
]

export const DOTS = [
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-teal-500',
]

export const toneIndex = (name) =>
  Array.from(String(name || '')).reduce((sum, char) => sum + char.charCodeAt(0), 0) %
  TONES.length

export default function BrandCard({ brand }) {
  const categoryName = brand.categories[0] || ''
  const tone = TONES[toneIndex(categoryName)]
  const isAvoid = brand.status === 'avoid'

  return (
    <Link
      to={`/product/${brand.id}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-white/10 dark:bg-slate-900 dark:hover:border-white/20"
    >
      {/* Top Banner Image Container — always white, tinted light red on hover only */}
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-white p-5 transition-colors duration-300 group-hover:bg-rose-100 dark:group-hover:bg-rose-500/15">
        <ProductImage
          product={brand}
          alt={brand.name}
          imgClassName="max-h-24 w-auto max-w-[80%] object-contain transition-transform duration-500 group-hover:scale-110"
          fallbackClassName="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200/80 text-slate-400"
        >
          <TagIcon className="h-8 w-8" />
        </ProductImage>

        {/* Category Pill Badge */}
        {categoryName && (
          <span className={`absolute right-3 top-3 rounded-xl px-3 py-1 text-xs font-bold backdrop-blur-md ${tone}`}>
            {categoryName}
          </span>
        )}

        {/* Status Pill Badge (Top Left) */}
        <div className="absolute left-3 top-3">
          {isAvoid ? (
            <span className="inline-flex items-center gap-1 rounded-xl bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 backdrop-blur-md">
              <BanIcon className="h-3.5 w-3.5" />
              مقاطع
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 backdrop-blur-md">
              <CheckIcon className="h-3.5 w-3.5" />
              بديل آمن
            </span>
          )}
        </div>
      </div>

      {/* Card Content Footer */}
      <div className="flex flex-1 flex-col justify-between bg-white p-5 text-right dark:bg-slate-900">
        <div>
          <h3 className="text-base font-extrabold leading-snug text-slate-900 transition group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
            {brand.name}
          </h3>
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {shortDescription(brand.description) || (isAvoid ? 'يدعم الاحتلال - يرجى المقاطعة والبحث عن بديل' : 'منتج محلي آمن وداعم')}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/5">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
            الباركود: <code className="font-mono text-slate-600 dark:text-slate-300">{brand.barcode_label}</code>
          </span>
          <span className="text-xs font-bold text-emerald-600 transition group-hover:translate-x-1 dark:text-emerald-400">
            التفاصيل ←
          </span>
        </div>
      </div>
    </Link>
  )
}
