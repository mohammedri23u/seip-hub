import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrivalExperience } from '@/components/the-ten/arrival-experience'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { getJourneySummary, getTenExperienceState } from '@/lib/the-ten/runtime'
import { completeArrival, recordStoryProgress } from './actions'
import { getLocale, localize } from '@/lib/i18n'

export default async function ArrivalPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [summary, experience, query, locale] = await Promise.all([
    getJourneySummary(),
    getTenExperienceState(),
    searchParams,
    getLocale(),
  ])
  const tr = (english: string, arabic: string) => localize(locale, english, arabic)

  if (!summary.enrolled || !summary.onboarding_complete || !summary.pretest?.completed) {
    redirect('/learner')
  }

  if (experience.arrival_complete) {
    redirect(experience.guide_key ? '/learner' : '/learner/guide')
  }

  if (query.error) {
    return <LearnerShell immersive title={tr('The Nexus could not record your arrival', 'تعذّر على النِكسس تسجيل وصولك')}>
      <section className="ten-panel">
        <p className="ten-eyebrow">{tr('THE ARRIVAL', 'الوصول')}</p>
        <h2>{tr('Your story progress was not saved.', 'لم يُحفَظ تقدّمك في القصة.')}</h2>
        <p>{tr('Nothing academic was lost. Return to the Arrival and try the final gate again.', 'لم تفقد أي سجل أكاديمي. عُد إلى الوصول وحاول عبور البوابة الأخيرة مجدداً.')}</p>
        <Link className="ten-action ten-action-gold ten-spaced" href="/learner/arrival">{tr('Return to the Arrival', 'العودة إلى الوصول')} →</Link>
      </section>
    </LearnerShell>
  }

  return <ArrivalExperience completeAction={completeArrival} progressAction={recordStoryProgress} initialSceneId={experience.story_progress?.arrival?.last_scene_id} />
}
