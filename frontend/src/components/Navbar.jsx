import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { NAV_LINKS } from '../data/site.js'
import { useTheme } from '../hooks/useTheme.js'
import { useOnlineStatus } from '../hooks/useOnlineStatus.js'
import { useToast } from '../admin/Toast.jsx'
import { syncNow, getSyncState, subscribeSyncState, resetLocalDatabase } from '../services/syncService.js'
import {
  FlagIcon,
  SunIcon,
  MoonIcon,
  MenuIcon,
  CloseIcon,
  ScanIcon,
  RotateCwIcon,
  PlusIcon,
  TrashIcon,
} from './icons.jsx'

function isActiveLink(href, pathname) {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href.split('#')[0])
}

export default function Navbar({ links = NAV_LINKS }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useTheme()
  const toast = useToast()
  const [syncState, setSyncState] = useState(getSyncState())
  const online = useOnlineStatus()

  useEffect(() => subscribeSyncState(setSyncState), [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const syncing = syncState === 'syncing'

  const handleManualSync = async () => {
    if (syncing) return
    const result = await syncNow()
    if (result.ok && result.synced) {
      toast.success('تم تحديث البيانات بنجاح')
    } else if (result.offline) {
      toast.error('لا يوجد اتصال بالإنترنت. تعذّرت المزامنة.')
    } else if (result.reason === 'already-syncing') {
      // مزامنة أُخرى قيد التنفيذ
    } else {
      toast.error('فشلت المزامنة')
    }
  }

  const handleResetLocal = async () => {
    if (syncing) return
    const confirmed = window.confirm(
      'سيتم مسح جميع البيانات المحلية المخزنة في هذا المتصفح (المنتجات، الأصناف، ' +
        'المقالات، الفيديوهات، وبيانات المزامنة)، ثم تُعاد المزامنة من الخادم تلقائياً. متابعة؟',
    )
    if (!confirmed) return
    try {
      await resetLocalDatabase()
      toast.success('تم مسح البيانات المحلية.')
      const result = await syncNow()
      if (result.ok) {
        toast.success('تمت إعادة المزامنة مع الخادم.')
      } else if (result.offline) {
        toast.error('تم المسح، لكن لا يوجد اتصال بالمزامنة الآن.')
      }
    } catch (error) {
      console.error('Failed to reset local database:', error)
      toast.error('تعذّر مسح البيانات المحلية.')
    }
  }

  const iconBtn =
    'flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition duration-200 ' +
    'hover:bg-emerald-500/10 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-300'

  return (
    <header
      className={`relative sticky top-0 z-50 hidden border-b border-slate-200/60 bg-slate-50/85 backdrop-blur-xl transition-all duration-300 lg:block dark:border-white/[0.07] dark:bg-slate-950/85 ${
        scrolled ? 'shadow-[0_12px_32px_-18px_rgba(15,23,42,0.35)]' : 'shadow-none'
      }`}
    >
      <div className="flex h-20 items-center justify-between gap-6 px-4 sm:px-6 lg:px-10 2xl:px-16">
        {/* Brand */}
        <Link to="/" className="group flex items-center gap-3" aria-label="دليل البدائل">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 transition duration-300 group-hover:shadow-md group-hover:ring-emerald-500/40 dark:bg-slate-900 dark:ring-white/10">
            <FlagIcon className="h-6 w-auto text-emerald-600 transition-transform duration-300 group-hover:-rotate-6 dark:text-emerald-400" />
            <span
              className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-slate-50 dark:ring-slate-950 ${
                online ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              role="status"
              title={online ? 'متصل بالإنترنت' : 'لا يوجد اتصال بالإنترنت'}
            />
          </span>
          <span className="flex flex-col">
            <span className="font-display text-xl font-extrabold tracking-tight text-slate-900 transition-colors duration-200 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300">
              دليل البدائل
            </span>
            <span className="-mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-600/80 dark:text-emerald-400/80">
              منصة الوعي الاستهلاكي
            </span>
          </span>
        </Link>

        {/* Center nav — quiet links with a sliding underline */}
        <nav className="flex items-center justify-center">
          {links.map((link) => {
            const isActive = isActiveLink(link.href, pathname)
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`group relative px-4 py-2.5 text-[15px] font-semibold tracking-tight transition-colors duration-200 ${
                  isActive
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {link.label}
                <span
                  className={`absolute inset-x-4 bottom-0.5 h-[2px] origin-right rounded-full bg-emerald-500 transition-transform duration-300 ease-out ${
                    isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                />
              </Link>
            )
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/scan"
            className="group inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition duration-300 hover:-translate-y-px hover:bg-emerald-500 hover:shadow-md hover:shadow-emerald-600/25 active:scale-95"
          >
            <ScanIcon className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
            <span>الماسح الذكي</span>
          </Link>

          <div className="flex items-center gap-1 rounded-full bg-white/70 p-1.5 shadow-xs ring-1 ring-slate-200/60 backdrop-blur dark:bg-slate-900/70 dark:ring-white/10">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncing}
              className={iconBtn}
              title="تحديث البيانات"
              aria-label="تحديث البيانات"
            >
              <RotateCwIcon className={`h-4 w-4 ${syncing ? 'animate-spin text-emerald-500' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleResetLocal}
              disabled={syncing}
              className={iconBtn}
              title="مسح البيانات المحلية وإعادة المزامنة"
              aria-label="مسح البيانات المحلية وإعادة المزامنة"
            >
              <TrashIcon className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className={iconBtn}
              aria-label="تبديل المظهر"
              title="تبديل المظهر"
            >
              {theme === 'dark' ? (
                <SunIcon className="h-4 w-4 text-amber-400" />
              ) : (
                <MoonIcon className="h-4 w-4" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/70 text-slate-600 shadow-xs backdrop-blur lg:hidden dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300"
            aria-label="القائمة"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Faint emerald hairline that appears once scrolled */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-emerald-500/60 to-transparent transition-opacity duration-500 ${
          scrolled ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="animate-fade-in border-t border-slate-200/70 bg-slate-50/95 px-4 py-4 backdrop-blur-2xl lg:hidden dark:border-white/10 dark:bg-slate-950/95">
          <nav className="flex flex-col gap-1">
            {links.map((link) => {
              const isActive = isActiveLink(link.href, pathname)
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-[15px] font-semibold transition ${
                    isActive
                      ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300'
                      : 'text-slate-700 hover:bg-slate-200/60 dark:text-slate-200 dark:hover:bg-white/5'
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                </Link>
              )
            })}
          </nav>

          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200/70 pt-4 dark:border-white/10">
            <Link
              to="/scan"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <ScanIcon className="h-4 w-4" />
              الماسح الذكي
            </Link>
            <Link
              to="/contributions"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/15 dark:bg-slate-900 dark:text-slate-200"
            >
              <PlusIcon className="h-4 w-4" />
              اقتراح جديد
            </Link>
          </div>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              handleResetLocal()
            }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-white/15 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-white/5"
          >
            <TrashIcon className="h-4 w-4" />
            مسح البيانات المحلية
          </button>
        </div>
      )}
    </header>
  )
}
