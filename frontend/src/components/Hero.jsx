import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HERO_SLIDES } from '../data/site.js'
import { ScanIcon, ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from './icons.jsx'

export default function Hero({ slides = HERO_SLIDES }) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [failed, setFailed] = useState(new Set())

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 6500)
    return () => clearInterval(id)
  }, [paused, slides.length])

  const slide = slides[current]
  const markFailed = (index) => setFailed((prev) => new Set(prev).add(index))

  const nextSlide = () => setCurrent((c) => (c + 1) % slides.length)
  const prevSlide = () => setCurrent((c) => (c - 1 + slides.length) % slides.length)

  return (
    <section
      id="home"
      className="relative flex min-h-[520px] w-full items-center justify-center overflow-hidden bg-slate-100 sm:min-h-[640px] dark:bg-slate-950"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background Orbs & Ambient Glow */}
      <div className="pointer-events-none absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl dark:bg-emerald-600/20" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl dark:bg-teal-500/15" />

      {/* Slide Images */}
      {slides.map((s, i) => (
        <div
          key={s.image}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === current ? 'z-10 opacity-100' : 'z-0 opacity-0'
          }`}
        >
          {!failed.has(i) && (
            <img
              src={s.image}
              alt=""
              onError={() => markFailed(i)}
              className={`h-full w-full object-cover ${
                i === current ? 'animate-[kenburns_16s_ease-out_forwards]' : ''
              }`}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/85 to-white/60 dark:from-slate-950 dark:via-slate-950/80 dark:to-slate-950/60 dark:backdrop-blur-[2px]" />
        </div>
      ))}

      {/* Main Content Container */}
      <div
        key={current}
        className="relative z-20 mx-auto w-full max-w-4xl px-4 py-20 text-center animate-[fade-up_0.6s_cubic-bezier(0.16,1,0.3,1)_both]"
      >
        {/* Glowing Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse dark:bg-emerald-400" />
          <span className="text-xs font-bold tracking-wide text-emerald-700 dark:text-emerald-300">
            {slide.tag}
          </span>
        </div>

        {/* Main Title */}
        <h1 className="mt-6 text-[1.65rem] font-black leading-snug tracking-tight text-slate-900 sm:text-4xl md:text-5xl lg:text-6xl dark:text-white">
          {slide.title}
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:mt-6 sm:text-lg dark:text-slate-300">
          {slide.sub}
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 px-6 sm:mt-10 sm:w-auto sm:flex-row sm:gap-4 sm:px-0">
          <Link
            to={slide.primary.href}
            className="group relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-emerald-500 px-8 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-emerald-500/25 transition duration-300 hover:bg-emerald-400 hover:scale-[1.02] active:scale-95 sm:w-auto sm:px-8 sm:py-4"
          >
            <span>{slide.primary.label}</span>
            <ArrowRightIcon className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
          </Link>

          <Link
            to="/scan"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white/70 px-8 py-3.5 text-sm font-extrabold text-slate-800 shadow-sm backdrop-blur-md transition duration-300 hover:bg-white hover:border-slate-400 active:scale-95 sm:w-auto sm:px-8 sm:py-4 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:hover:border-white/30"
          >
            <ScanIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>الماسح الذكي</span>
          </Link>
        </div>
      </div>

      {/* Slide Navigation Arrows */}
      <button
        type="button"
        onClick={prevSlide}
        aria-label="الشريحة السابقة"
        className="absolute right-4 top-1/2 z-30 hidden -translate-y-1/2 rounded-full border border-slate-300 bg-white/70 p-3 text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-white sm:flex dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:hover:bg-white/20"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={nextSlide}
        aria-label="الشريحة التالية"
        className="absolute left-4 top-1/2 z-30 hidden -translate-y-1/2 rounded-full border border-slate-300 bg-white/70 p-3 text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-white sm:flex dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:hover:bg-white/20"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute inset-x-0 bottom-8 z-30 flex justify-center gap-2.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrent(i)}
            aria-label={`الشريحة ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current
                ? 'w-9 bg-emerald-500 shadow-md shadow-emerald-500/40 dark:bg-emerald-400 dark:shadow-emerald-400/50'
                : 'w-2 bg-slate-400/40 hover:bg-slate-500/60 dark:bg-white/30 dark:hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
