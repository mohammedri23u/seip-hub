import Link from 'next/link'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { BaghdadWorld } from '@/components/the-ten/world/baghdad-world'
import { JourneySummary, SessionCards, CheckpointCards, CertificateSummary } from '@/components/the-ten/journey-overview'
import { getLearnerJourney } from '@/lib/the-ten/learner-data'

export default async function LearnerHome() {
  const data = await getLearnerJourney()
  return <LearnerShell title={data.name ? `Welcome to the Nexus, ${data.name}` : 'Welcome to the Nexus'} intro="A place to gather evidence, discuss your reasoning, and carry what you learn into the next session.">
    <BaghdadWorld data={data} />
    <JourneySummary data={data} />
    <div className="ten-section-heading"><h2>Your sessions</h2><Link href="/learner/sessions">All sessions →</Link></div><SessionCards data={{ ...data, sessions: data.sessions.filter(s => s.status === 'live' || s.status === 'scheduled').slice(0, 4) }} />
    <div className="ten-section-heading"><h2>Assessment checkpoints</h2><Link href="/learner/assessments">All checkpoints →</Link></div><CheckpointCards data={{ ...data, assessments: data.assessments.slice(0, 4) }} />
    <div className="ten-section-heading"><h2>The road ahead</h2></div><CertificateSummary />
  </LearnerShell>
}
