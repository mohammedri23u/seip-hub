import { LearnerShell } from '@/components/the-ten/learner-shell'
import { SessionCards } from '@/components/the-ten/journey-overview'
import { getLearnerJourney } from '@/lib/the-ten/learner-data'

export default async function LearnerSessions() {
  const data = await getLearnerJourney()
  return <LearnerShell active="/learner/sessions" title="Your sessions" intro="Prepare for the next gathering, follow a live session, or revisit a completed briefing."><SessionCards data={data} /></LearnerShell>
}
