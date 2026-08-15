import { Link, useNavigate } from 'react-router-dom'
import { NAV_LINKS } from '../data/site.js'
import { FlagIcon, PlusIcon, HeartIcon } from './icons.jsx'

export default function Footer() {
  const navigate = useNavigate()
  return (
    <footer className="hidden border-t border-slate-200/80 bg-slate-50 text-slate-900 lg:block dark:border-white/10 dark:bg-slate-950 dark:text-white">
      <div className="px-4 py-16 sm:px-6 lg:px-10 2xl:px-16">
        <div className="grid gap-12 md:grid-cols-3 xl:grid-cols-[1.5fr_1fr_1.5fr]">
          {/* Brand Col */}
          <div>
            <Link to="/" className="group flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition duration-300 group-hover:scale-105 group-hover:border-emerald-500/50 dark:border-white/15 dark:bg-slate-900">
                <FlagIcon className="h-5 w-auto text-emerald-500 dark:text-emerald-400" />
              </span>
              <div className="flex flex-col">
                <span className="font-display text-lg font-black tracking-tight text-slate-900 transition group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                  دليل البدائل
                </span>
                <span className="-mt-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  منصة الوعي الاستهلاكي
                </span>
              </div>
            </Link>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              منصة حقوقية مستقلة تهدف لترسيخ الوعي الاستهلاكي، تمكين المقاطعة الأخلاقية، وإبراز البدائل الوطنية المتاحة بكفاءة عالية.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold tracking-wide text-slate-900 dark:text-white">التنقل السريع</h3>
            <ul className="mt-4 grid grid-cols-2 gap-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-slate-600 transition hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contribution Callout */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60 dark:backdrop-blur-md">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">ساهم في تطوير الدليل</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              هل تعرف منتجاً بديلاً أو شركة تود إضافتها للقائمة؟ يمكنك تقديم اقتراحك مباشرة لمراجعته.
            </p>
            <button
              type="button"
              onClick={() => navigate('/contributions')}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition duration-300 hover:bg-emerald-500 active:scale-95"
            >
              <PlusIcon className="h-4 w-4" />
              تقديم اقتراح أو مساهمة جديدة
            </button>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-white/10">
          <p>© {new Date().getFullYear()} دليل البدائل — جميع الحقوق محفوظة</p>
          <p className="flex items-center gap-1">
            تم بناء المنصة بوعي ودعم مستمر من المجتمع
            <HeartIcon className="h-3.5 w-3.5 text-rose-500 fill-rose-500 inline" />
          </p>
        </div>
      </div>
    </footer>
  )
}
