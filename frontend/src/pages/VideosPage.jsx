import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database.js'
import { ClapperboardIcon, SearchIcon, PlayIcon, CloseIcon } from '../components/icons.jsx'
import LocalImage from '../components/LocalImage.jsx'
import { videoOwnerId } from '../services/imageService.js'

const toVideoId = (url) => {
  if (!url) return ''
  const value = String(url)
  const watch = value.match(/youtube\.com\/watch\?v=([\w-]{11})/)
  if (watch) return watch[1]
  const cleaned = value.split('?')[0].split('#')[0]
  const short = cleaned.match(/youtube\.com\/(?:shorts|embed|live)\/([\w-]{11})/)
  if (short) return short[1]
  const youtuBe = cleaned.match(/youtu\.be\/([\w-]{11})/)
  if (youtuBe) return youtuBe[1]
  return ''
}

const toEmbedUrl = (url) => {
  const id = toVideoId(url)
  return id ? `https://www.youtube.com/embed/${id}` : url
}

const toThumbnailUrl = (url) => {
  const id = toVideoId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : ''
}

export default function VideosPage() {
  const videos = useLiveQuery(
    () => db.videos.filter((v) => !v.is_deleted).toArray(),
    [],
  )

  const [search, setSearch] = useState('')
  const [activeVideo, setActiveVideo] = useState(null)

  const filtered = (videos || []).filter((video) =>
    video.title.toLowerCase().includes(search.trim().toLowerCase()),
  )

  return (
    <section className="py-12 md:py-16">
      <div className="shell">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ClapperboardIcon className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
                المكتبة المرئية (الفيديوهات التوعوية)
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                مقاطع فيديو توعوية وثائقية تساعدك على فهم أبعاد المقاطعة وقضيتك العادلة.
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <SearchIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في الفيديوهات…"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white pr-10 pl-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/15 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Video Grid */}
        {!videos ? (
          <div className="flex justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-white/15 dark:bg-slate-900/50">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ClapperboardIcon className="h-7 w-7" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
              {search ? 'لا توجد فيديوهات مطابقة للبحث' : 'لا توجد فيديوهات توعوية حالياً'}
            </h3>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {search ? 'جرّب البحث بكلمات أخرى.' : 'سيتم إضافة مقاطع فيديو توعوية جديدة قريباً.'}
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((video) => (
              <div
                key={video.id}
                onClick={() => setActiveVideo(video)}
                className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/70"
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-950 transition-colors duration-300 group-hover:bg-rose-500/20">
                  <LocalImage
                    ownerId={videoOwnerId(video.id)}
                    sourceUrl={video.thumbnail_url || toThumbnailUrl(video.embed_url)}
                    alt={video.title}
                    imgClassName="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    fallbackClassName="flex h-full w-full items-center justify-center bg-slate-900 text-slate-600"
                  >
                    <ClapperboardIcon className="h-12 w-12" />
                  </LocalImage>

                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 transition group-hover:bg-slate-950/20">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600/90 text-white shadow-lg transition duration-300 group-hover:scale-110 group-hover:bg-emerald-500">
                      <PlayIcon className="h-7 w-7 fill-white translate-x-0.5" />
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900 transition group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                    {video.title}
                  </h3>
                  <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    مشاهدة الفيديو ←
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Video Player Modal */}
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
                  src={toEmbedUrl(activeVideo.embed_url)}
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
