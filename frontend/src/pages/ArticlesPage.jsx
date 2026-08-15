import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '../db/database.js'
import ArticleCard from '../components/ArticleCard.jsx'
import { FileTextIcon } from '../components/icons.jsx'

export default function ArticlesPage() {
  const articles = useLiveQuery(() => db.articles.toArray(), [])

  if (!articles) {
    return (
      <section className="py-40 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">جارِ تحميل المقالات…</p>
      </section>
    )
  }

  const published = articles
    .filter((article) => !article.is_deleted)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))

  return (
    <section className="py-12 md:py-16">
      <div className="shell">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <FileTextIcon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
              المقالات
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              مقالات توعوية وأدلة تحليلية تساعدك على المقاطعة بوعي.
            </p>
          </div>
        </div>

        {published.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {published.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 py-20 text-center dark:border-white/15">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              لا توجد مقالات بعد
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              ستظهر المقالات هنا بمجرد مزامنتها مع الخادم.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
