import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '../db/database.js'
import { toBrand } from '../lib/brand.js'
import SectionHeading from './SectionHeading.jsx'
import BrandCard from './BrandCard.jsx'
import { ArrowLeftIcon, PackagePlusIcon } from './icons.jsx'

const FEATURED_COUNT = 6

export default function FeaturedProducts() {
  const products = useLiveQuery(() => db.products.toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  const featured = useMemo(() => {
    if (!products || !categories) return []
    const categoryById = new Map(categories.map((category) => [category.id, category]))
    return products
      .filter((product) => !product.is_deleted && product.is_boycotted)
      .sort((a, b) => {
        const aHasImage = Boolean(a.image_url)
        const bHasImage = Boolean(b.image_url)
        if (aHasImage !== bHasImage) return aHasImage ? -1 : 1
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
      })
      .slice(0, FEATURED_COUNT)
      .map((product) => toBrand(product, categoryById.get(product.category)?.name))
  }, [products, categories])

  if (!products || !categories) {
    return null
  }

  return (
    <section id="featured" className="scroll-mt-20 py-16 md:py-24">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            kicker="أبرز الشركات الموثّقة"
            title="علامات تستحق أن تحفظ أثرها"
            description="عينة من أشهر العلامات التجارية المسجلة ضمن قائمة المقاطعة أو البدائل المتاحة."
          />
          <Link
            to="/products"
            className="group inline-flex shrink-0 items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition duration-300 hover:bg-emerald-500 hover:shadow-emerald-600/30 active:scale-95"
          >
            <span>استكشف كافة المنتجات</span>
            <ArrowLeftIcon className="h-4 w-4 transition duration-300 group-hover:-translate-x-1" />
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featured.map((brand) => (
              <BrandCard key={brand.id} brand={brand} />
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-white/15 dark:bg-slate-900/50">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <PackagePlusIcon className="h-8 w-8" />
            </span>
            <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
              لا توجد منتجات مسجلة بعد
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              كن أول من يضيف منتجاً أو علامة إلى دليل البدائل، وسيظهر هنا فور مزامنته
              من الخادم.
            </p>
            <Link
              to="/contributions"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
            >
              <PackagePlusIcon className="h-4 w-4" />
              أضف أول منتج
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
