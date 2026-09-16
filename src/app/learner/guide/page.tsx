import Link from 'next/link'
import { redirect } from 'next/navigation'
import { GuideSelection } from '@/components/the-ten/guide-selection'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { getJourneySummary, getTenExperienceState } from '@/lib/the-ten/runtime'
import { chooseGuide } from './actions'

export default async function GuidePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [summary, experience, query] = await Promise.all([
    getJourneySummary(),
    getTenExperienceState(),
    searchParams,
  ])

  if (!summary.enrolled || !summary.pretest?.completed) redirect('/learner')
  if (!experience.arrival_complete) redirect('/learner/arrival')
  if (experience.guide_key) redirect('/learner')

  if (query.error) {
    return <LearnerShell immersive title="The Nexus could not bind your Guide">
      <section className="ten-panel">
        <p className="ten-eyebrow">GUIDE BINDING</p>
        <h2>Your selection was not saved.</h2>
        <p>No mission or assessment record was affected. Return to the hall and choose again.</p>
        <Link className="ten-action ten-action-gold ten-spaced" href="/learner/guide">Return to the hall →</Link>
      </section>
    </LearnerShell>
  }

  return <GuideSelection chooseAction={chooseGuide} />
}
