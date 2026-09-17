import { LearnerShell } from '@/components/the-ten/learner-shell'
import { SessionCards } from '@/components/the-ten/journey-overview'
import { getLearnerJourney } from '@/lib/the-ten/learner-data'
import { getLocale, localize } from '@/lib/i18n'

export default async function LearnerSessions() {
  const [data, locale] = await Promise.all([getLearnerJourney(), getLocale()])
  const tr = (english: string, arabic: string) => localize(locale, english, arabic)
  return <LearnerShell active="/learner/sessions" title={tr('Your sessions', 'جلساتك')} intro={tr('Prepare for the next gathering, follow a live session, or revisit a completed briefing.', 'استعد للقاء التالي، وتابع الجلسة المباشرة، أو راجع إحاطة مكتملة.')}><SessionCards data={data} /></LearnerShell>
}
