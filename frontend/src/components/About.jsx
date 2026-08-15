import { Link, useNavigate } from 'react-router-dom'

import SectionHeading from './SectionHeading.jsx'
import { TargetIcon, ShieldIcon, SproutIcon } from './icons.jsx'

const VALUES = [
  {
    Icon: TargetIcon,
    title: 'الدقة',
    text: 'كل معلومة موثّقة بمصادر محكمة قابلة للتتبع قبل أن تصل إليك.',
  },
  {
    Icon: ShieldIcon,
    title: 'الشفافية',
    text: 'منصة مستقلة لا تهدف للربح، مهمتنا الوحيدة نشر الوعي.',
  },
  {
    Icon: SproutIcon,
    title: 'الأثر',
    text: 'نشجع البدائل الوطنية ونرصد أثر كل قرار شراء على أرض الواقع.',
  },
]

export default function About() {
  const navigate = useNavigate()
  return (
    <section id="about" className="scroll-mt-20 py-20 md:py-28">
      <div className="shell">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              kicker="عن المنصة"
              title="مبادرة مجتمعية تصنعها أيادٍ حرة"
              description="دليل البدائل مبادرة تطوعية أطلقها مطوّرون وناشطون لتيسير المقاطعة وجعلها عملية وواضحة. نؤمن أن المعرفة أول خطوة نحو التغيير، وأن كل قرار شراء يترجم قيمك إلى فعل واقعي يخدم فلسطين ويقوّي اقتصادنا الوطني."
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                ابدأ الآن
              </Link>
              <button
                type="button"
                onClick={() => navigate('/contributions')}
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-white/20"
              >
                شارك باقتراحك
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <value.Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {value.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {value.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
