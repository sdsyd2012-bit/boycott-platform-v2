import { useEffect, useRef, useState } from 'react'
import SectionHeading from './SectionHeading.jsx'
import { StoreIcon, BanIcon, CheckIcon, LayersIcon } from './icons.jsx'

const STAT_ITEMS = [
  { key: 'total', label: 'شركة وعلامة موثّقة', icon: StoreIcon, color: 'text-emerald-500 bg-emerald-500/10' },
  { key: 'avoid', label: 'شركة قيد المقاطعة', icon: BanIcon, color: 'text-rose-500 bg-rose-500/10' },
  { key: 'support', label: 'بديل داعم ومتاح', icon: CheckIcon, color: 'text-teal-500 bg-teal-500/10' },
  { key: 'alternatives', label: 'منتج وطني بديل', icon: LayersIcon, color: 'text-amber-500 bg-amber-500/10' },
]

function useCountUp(target, start, duration = 1200) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!start) return
    let raf = 0
    const t0 = performance.now()
    const tick = (now) => {
      const progress = Math.min((now - t0) / duration, 1)
      setValue(Math.round((target || 0) * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [start, target, duration])

  return value
}

function StatCard({ value, start, label, icon: Icon, color }) {
  const count = useCountUp(value, start)
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl transition duration-300 hover:-translate-y-1.5 hover:shadow-xl sm:p-8 dark:border-white/10 dark:bg-slate-900/60">
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl ${color} transition duration-300 group-hover:scale-110`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </span>
        <span className="hidden text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 sm:block">
          مُحدث تلقائياً
        </span>
      </div>
      <div className="mt-4 text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white sm:mt-6 sm:text-5xl">
        {count.toLocaleString('en-US')}
      </div>
      <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300 sm:mt-2 sm:text-sm">
        {label}
      </div>
    </div>
  )
}

export default function Stats({ stats }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  const isEmpty = !stats || (!stats.total && !stats.avoid && !stats.support && !stats.alternatives)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="stats" className="scroll-mt-20 py-16 md:py-24">
      <div className="shell">
        <SectionHeading
          center
          kicker="إحصائيات المنصة"
          title="أرقام دقيقة تُجسّد أثر المقاطعة"
          description="يُحدَّث الدليل باستمرار بالاعتماد على التوثيق الحقوقي ومشاركة المجتمع الفاعلة."
        />
        <div
          ref={ref}
          className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-6 lg:grid-cols-4"
        >
          {STAT_ITEMS.map((item) => (
            <StatCard
              key={item.key}
              value={stats?.[item.key]}
              start={inView}
              label={item.label}
              icon={item.icon}
              color={item.color}
            />
          ))}
        </div>
        {isEmpty && (
          <p className="mx-auto mt-8 max-w-md rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-4 text-center text-sm leading-relaxed text-slate-500 dark:border-white/15 dark:bg-slate-900/50 dark:text-slate-400">
            المنصة بدأت للتو — لا توجد أرقام بعد. أضف أول منتج من لوحة التحكم أو شارك
            باقتراحك ليكبر العدد.
          </p>
        )}
      </div>
    </section>
  )
}
