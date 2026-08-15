import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database.js'
import { ClapperboardIcon, PlayIcon, CloseIcon } from './icons.jsx'
import LocalImage from './LocalImage.jsx'
import { videoOwnerId } from '../services/imageService.js'

export default function FeaturedVideos() {
  const videos = useLiveQuery(
    () => db.videos.filter((v) => !v.is_deleted).toArray(),
    [],
  )

  const [activeVideo, setActiveVideo] = useState(null)

  if (!videos || videos.length === 0) return null

  return (
    <section className="py-12 md:py-16 border-t border-slate-200/80 dark:border-white/10">
      <div className="shell">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ClapperboardIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white md:text-2xl">
                فيديوهات توعوية
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                تابع أبرز الفيديوهات والمقاطع التثقيفية حول المقاطعة والوعي الاستهلاكي.
              </p>
            </div>
          </div>
          <Link
            to="/videos"
            className="text-xs font-bold text-emerald-600 transition hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 sm:text-sm"
          >
            عرض الكل ({videos.length}) ←
          </Link>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.slice(0, 3).map((video) => (
            <div
              key={video.id}
              onClick={() => setActiveVideo(video)}
              className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-slate-900/70"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-slate-950 transition-colors duration-300 group-hover:bg-rose-500/20">
                <LocalImage
                  ownerId={videoOwnerId(video.id)}
                  sourceUrl={video.thumbnail_url}
                  alt={video.title}
                  imgClassName="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  fallbackClassName="flex h-full w-full items-center justify-center bg-slate-900 text-slate-600"
                >
                  <ClapperboardIcon className="h-10 w-10" />
                </LocalImage>
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 transition group-hover:bg-slate-950/20">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600/90 text-white shadow-lg transition duration-300 group-hover:scale-110 group-hover:bg-emerald-500">
                    <PlayIcon className="h-6 w-6 fill-white translate-x-0.5" />
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900 transition group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                  {video.title}
                </h3>
              </div>
            </div>
          ))}
        </div>

        {activeVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <div
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => setActiveVideo(null)}
            />
            <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <h3 className="truncate font-bold text-white pr-2">{activeVideo.title}</h3>
                <button
                  type="button"
                  onClick={() => setActiveVideo(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="relative aspect-video w-full bg-black">
                <iframe
                  src={activeVideo.embed_url}
                  title={activeVideo.title}
                  className="absolute inset-0 h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
