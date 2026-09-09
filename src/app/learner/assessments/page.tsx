import { LearnerShell } from '@/components/the-ten/learner-shell'
import { CheckpointCards } from '@/components/the-ten/journey-overview'
import { getLearnerJourney } from '@/lib/the-ten/learner-data'

export default async function LearnerAssessmentsPage({ searchParams }: { searchParams: Promise<{ submitted?: string; error?: string }> }) {
  const [query, data] = await Promise.all([searchParams, getLearnerJourney()])
  return <LearnerShell active="/learner/assessments" title="Your checkpoints" intro="Make your reasoning visible. Open a checkpoint when it is available, then return here for its status.">
    {query.submitted === '1' && <p role="status" className="ten-notice">Submission received. Your recorded attempt status is shown below.</p>}
    {query.error && <p role="alert" className="ten-notice ten-notice-error">This checkpoint could not be started. Check its availability and try again, or contact your facilitator.</p>}
    <CheckpointCards data={data} />
  </LearnerShell>
}
