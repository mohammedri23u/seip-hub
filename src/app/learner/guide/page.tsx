import Link from 'next/link'
import { redirect } from 'next/navigation'
import { GuideSelection } from '@/components/the-ten/guide-selection'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { getJourneySummary, getTenExperienceState } from '@/lib/the-ten/runtime'
import { chooseGuide } from './actions'
import { getLocale, localize } from '@/lib/i18n'

export default async function GuidePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [summary, experience, query, locale] = await Promise.all([
    getJourneySummary(),
    getTenExperienceState(),
    searchParams,
    getLocale(),
  ])
  const tr = (english: string, arabic: string) => localize(locale, english, arabic)

  if (!summary.enrolled || !summary.pretest?.completed) redirect('/learner')
  if (!experience.arrival_complete) redirect('/learner/arrival')
  if (experience.guide_key) redirect('/learner')

  if (query.error) {
    return <LearnerShell immersive title={tr('The Nexus could not bind your Guide', 'تعذّر على النِكسس ربط مرشدك')}>
      <section className="ten-panel">
        <p className="ten-eyebrow">{tr('GUIDE BINDING', 'ربط المرشد')}</p>
        <h2>{tr('Your selection was not saved.', 'لم يُحفَظ اختيارك.')}</h2>
        <p>{tr('No mission or assessment record was affected. Return to the hall and choose again.', 'لم يتأثر أي سجل للمهمات أو التقييمات. عُد إلى القاعة واختر مجدداً.')}</p>
        <Link className="ten-action ten-action-gold ten-spaced" href="/learner/guide">{tr('Return to the hall', 'العودة إلى القاعة')} →</Link>
      </section>
    </LearnerShell>
  }

  return <GuideSelection chooseAction={chooseGuide} />
}
