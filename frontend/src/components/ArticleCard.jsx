import { Link } from 'react-router-dom'

import { FileTextIcon } from './icons.jsx'
import LocalImage from './LocalImage.jsx'
import { articleOwnerId } from '../services/imageService.js'

export default function ArticleCard({ article }) {
  const date = article.updated_at
    ? new Date(article.updated_at).toLocaleDateString('ar', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return (
    <Link
      to={`/articles/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900 dark:hover:border-emerald-500/40"
    >
      {article.cover_url ? (
        <div className="h-44 overflow-hidden border-b border-slate-200/70 bg-white transition-colors duration-300 group-hover:bg-rose-100 dark:border-white/10 dark:group-hover:bg-rose-500/15">
          <LocalImage
            ownerId={articleOwnerId(article.id)}
            sourceUrl={article.cover_url}
            alt={article.title}
            imgClassName="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            fallbackClassName="flex h-full w-full items-center justify-center bg-white text-slate-300 dark:bg-slate-900"
          >
            <FileTextIcon className="h-12 w-12" />
          </LocalImage>
        </div>
      ) : (
        <div className="flex h-44 items-center justify-center border-b border-slate-200/70 bg-white transition-colors duration-300 group-hover:bg-rose-100 dark:border-white/10 dark:group-hover:bg-rose-500/15">
          <FileTextIcon className="h-12 w-12 text-slate-300" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          {date && <span>{date}</span>}
        </div>
        <h3 className="mt-2 text-base font-bold leading-relaxed text-slate-900 dark:text-white">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {article.excerpt}
          </p>
        )}
      </div>
    </Link>
  )
}
