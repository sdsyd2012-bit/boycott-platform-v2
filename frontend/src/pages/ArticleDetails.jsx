import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '../db/database.js'
import { ArrowRightIcon, FileTextIcon } from '../components/icons.jsx'
import LocalImage from '../components/LocalImage.jsx'
import { articleOwnerId } from '../services/imageService.js'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('ar', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function ArticleDetails() {
  const { slug } = useParams()

  const article = useLiveQuery(
    () => db.articles.where('slug').equals(slug).first(),
    [slug],
  )

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  if (article === undefined) {
    return (
      <section className="py-40 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">جارِ تحميل المقال…</p>
      </section>
    )
  }

  if (!article || article.is_deleted) {
    return (
      <section className="py-28 text-center md:py-40">
        <div className="mx-auto max-w-md px-4">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5">
            <FileTextIcon className="h-8 w-8" />
          </span>
          <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
            لم نعثر على هذا المقال
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            المقال الذي تبحث عنه غير متاح حالياً. قد يكون مخفياً أو غير مُزامَن إلى هذا الجهاز بعد.
          </p>
          <Link
            to="/articles"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <ArrowRightIcon className="h-4 w-4" />
            العودة إلى المقالات
          </Link>
        </div>
      </section>
    )
  }

  const paragraphs = (article.content || '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link
          to="/articles"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-emerald-500 dark:text-slate-400"
        >
          <ArrowRightIcon className="h-4 w-4" />
          عودة إلى المقالات
        </Link>

        <article className="mt-6">
          {article.cover_url && (
            <LocalImage
              ownerId={articleOwnerId(article.id)}
              sourceUrl={article.cover_url}
              alt={article.title}
              imgClassName="max-h-80 w-full rounded-2xl border border-slate-200 object-cover dark:border-white/10"
              fallbackClassName="flex max-h-80 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-300 dark:border-white/10 dark:bg-slate-900"
            >
              <FileTextIcon className="h-16 w-16" />
            </LocalImage>
          )}

          <div className="mt-8">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {formatDate(article.updated_at)}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="mt-4 text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                {article.excerpt}
              </p>
            )}
            <div className="mt-8 space-y-4 border-t border-slate-200 pt-8 dark:border-white/10">
              {paragraphs.length > 0 ? (
                paragraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    className="text-base leading-relaxed text-slate-700 dark:text-slate-300"
                  >
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-base leading-relaxed text-slate-500 dark:text-slate-400">
                  لم يُضف محتوى لهذا المقال بعد.
                </p>
              )}
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
