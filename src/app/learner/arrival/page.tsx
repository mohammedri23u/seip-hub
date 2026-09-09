import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrivalExperience } from '@/components/the-ten/arrival-experience'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { getJourneySummary, getTenExperienceState } from '@/lib/the-ten/runtime'
import { completeArrival, recordStoryProgress } from './actions'

export default async function ArrivalPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [summary, experience, query] = await Promise.all([
    getJourneySummary(),
    getTenExperienceState(),
    searchParams,
  ])

  if (!summary.enrolled || !summary.onboarding_complete || !summary.pretest?.completed) {
    redirect('/learner')
  }

  if (experience.arrival_complete) {
    redirect(experience.guide_key ? '/learner' : '/learner/guide')
  }

  if (query.error) {
    return <LearnerShell immersive title="The Nexus could not record your arrival">
      <section className="ten-panel">
        <p className="ten-eyebrow">THE ARRIVAL</p>
        <h2>Your story progress was not saved.</h2>
        <p>Nothing academic was lost. Return to the Arrival and try the final gate again.</p>
        <Link className="ten-action ten-action-gold ten-spaced" href="/learner/arrival">Return to the Arrival →</Link>
      </section>
    </LearnerShell>
  }

  return <ArrivalExperience completeAction={completeArrival} progressAction={recordStoryProgress} initialSceneId={experience.story_progress?.arrival?.last_scene_id} />
}
