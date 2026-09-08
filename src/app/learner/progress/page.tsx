import Link from 'next/link'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { JourneySummary, CertificateSummary } from '@/components/the-ten/journey-overview'
import { StatusBadge } from '@/components/the-ten/status-badge'
import { getLearnerJourney } from '@/lib/the-ten/learner-data'
import { checkpointState, isActiveLearnerCohort } from '@/lib/the-ten/journey'

export default async function LearnerProgress() {
  const data = await getLearnerJourney()
  return <LearnerShell active="/learner/progress" title="Pause. Reflect. Move forward." intro="Your recorded participation and checkpoint history. These records describe activity, not a measure of clinical competence.">
    <JourneySummary data={data} />
    <section className="ten-panel"><h2>Session attendance</h2><p>A session ending does not automatically record your attendance.</p><ul className="ten-record-list">{data.sessions.length ? data.sessions.map(session => <li key={session.id}><div><Link className="ten-text-link" href={`/learner/sessions/${session.id}`}>{session.title}</Link><p>Session: {session.status}</p></div><StatusBadge tone={data.attendance.some(a => a.session_id === session.id && ['present', 'late'].includes(a.status)) ? 'success' : 'neutral'}>{data.attendance.find(a => a.session_id === session.id)?.status ?? 'Not recorded'}</StatusBadge></li>) : <li>No session records yet.</li>}</ul></section>
    <section className="ten-panel ten-spaced"><h2>Checkpoints &amp; results</h2><ul className="ten-record-list">{data.assessments.length ? data.assessments.map(assessment => {
      const view = checkpointState(assessment, data.attempts.find(a => a.assessment_id === assessment.id), { canTake: isActiveLearnerCohort(data, assessment.cohort_id) })
      return <li key={assessment.id}><div><h3>{assessment.title}</h3><p>{view.reason}</p>{view.href && view.href !== '/learner/progress' && <Link className="ten-text-link" href={view.href}>{view.label} →</Link>}</div><StatusBadge tone={view.state === 'completed' ? 'success' : 'neutral'}>{view.label}</StatusBadge></li>
    }) : <li>No checkpoint records yet.</li>}</ul></section>
    <div className="ten-spaced"><CertificateSummary /></div>
  </LearnerShell>
}
