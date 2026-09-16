import Link from 'next/link'
import { CaseCard } from './case-card'
import { StatusBadge } from './status-badge'
import { checkpointState, formatJourneyDate, isActiveLearnerCohort, isSubmitted, type JourneyData } from '@/lib/the-ten/journey'

export function JourneySummary({ data }: { data: JourneyData }) {
  const attended = data.attendance.filter(a => a.status === 'present' || a.status === 'late').length
  const submitted = data.attempts.filter(isSubmitted).length
  const released = data.assessments.filter(a => a.status === 'released' && data.attempts.some(t => t.assessment_id === a.id && isSubmitted(t))).length
  return <dl className="ten-summary"><div><dt>Attendance recorded</dt><dd>{attended}<span> session{attended === 1 ? '' : 's'}</span></dd></div><div><dt>Checkpoints submitted</dt><dd>{submitted}<span> of {data.assessments.length} listed</span></dd></div><div><dt>Results ready to review</dt><dd>{released}<span> released</span></dd></div></dl>
}

export function SessionCards({ data }: { data: JourneyData }) {
  if (!data.sessions.length) return <div className="ten-empty"><h3>No sessions announced yet</h3><p>Your scheduled sessions will appear here when your facilitator publishes them.</p></div>
  return <div className="ten-card-grid">{data.sessions.map(session => {
    const attendance = data.attendance.find(a => a.session_id === session.id)
    return <CaseCard key={session.id} title={session.title} description={session.description ?? undefined}
      badge={data.cohorts.find(c => c.id === session.cohort_id)?.name ?? 'Session'}
      state={session.status === 'cancelled' ? 'locked' : session.status === 'completed' ? 'completed' : session.status === 'live' ? 'in_progress' : 'available'}
      statusLabel={session.status === 'completed' ? 'Session ended' : session.status === 'live' ? 'Live session' : session.status === 'cancelled' ? 'Cancelled' : 'Upcoming session'}
      actionLabel={session.status === 'completed' ? 'Review session' : 'Open briefing'}
      meta={`${formatJourneyDate(session.scheduled_at)}${session.duration_minutes ? ` · ${session.duration_minutes} min` : ''} · Attendance: ${attendance?.status ?? 'not recorded'}`}
      lockedReason="This session has been cancelled. Check the other sessions for your next step."
      href={`/learner/sessions/${session.id}`} />
  })}</div>
}

export function CheckpointCards({ data }: { data: JourneyData }) {
  if (!data.assessments.length) return <div className="ten-empty"><h3>No checkpoints announced yet</h3><p>Baseline, formative, and final assessments will appear here when published for your cohort.</p></div>
  return <div className="ten-card-grid">{data.assessments.map(assessment => {
    const view = checkpointState(
      assessment,
      data.attempts.find(a => a.assessment_id === assessment.id),
      { canTake: isActiveLearnerCohort(data, assessment.cohort_id) },
    )
    return <CaseCard key={assessment.id} title={assessment.title} description={view.reason} badge={assessment.assessment_type.replaceAll('_', ' ')}
      state={view.state} statusLabel={view.label} actionLabel={view.label} href={view.href} lockedReason={view.state === 'locked' ? 'Your facilitator controls access to this checkpoint.' : undefined}
      meta={`${data.cohorts.find(c => c.id === assessment.cohort_id)?.name ?? 'Checkpoint'}${assessment.duration_minutes ? ` · ${assessment.duration_minutes} min` : ' · Untimed'}`} />
  })}</div>
}

export function CertificateSummary() {
  return <section className="ten-panel ten-certificate" aria-labelledby="certificate-heading"><StatusBadge>Eligibility not yet available</StatusBadge><h2 id="certificate-heading">Your completion certificate</h2><p>Your program has not published certificate requirements here yet. Attendance and submitted checkpoints are available to review; they do not by themselves confirm eligibility.</p><Link className="ten-text-link" href="/learner/certificate">View completion status →</Link></section>
}
