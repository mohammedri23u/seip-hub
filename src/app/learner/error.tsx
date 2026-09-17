'use client'
import Link from 'next/link'
import { useI18n } from '@/components/i18n-provider'

export default function LearnerError({ reset }: { reset: () => void }) {
  const { tr } = useI18n()
  return <main className="ten-main"><section className="ten-panel" role="alert"><h1>{tr('Your journey could not be loaded', 'تعذّر تحميل رحلتك')}</h1><p>{tr('We could not retrieve your records. Try again to see your current progress.', 'تعذّر استرجاع سجلاتك. حاول مجدداً لعرض تقدّمك الحالي.')}</p><button className="ten-action ten-spaced" onClick={reset}>{tr('Try again', 'حاول مجدداً')}</button><Link className="ten-text-link ten-spaced" href="/dashboard">{tr('Return to your workspace', 'العودة إلى مساحة العمل')}</Link></section></main>
}
