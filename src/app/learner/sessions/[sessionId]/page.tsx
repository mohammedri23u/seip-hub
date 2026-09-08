import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { StatusBadge } from '@/components/the-ten/status-badge'
import { getLearnerJourney } from '@/lib/the-ten/learner-data'
import { requireUser } from '@/lib/auth/require-user'
import { formatJourneyDate } from '@/lib/the-ten/journey'

type Objective = { code: string; title: string; domain: string | null }

export default async function LearnerSession({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const data = await getLearnerJourney()
  const session = data.sessions.find(s => s.id === sessionId)
  if (!session) notFound()
  const { supabase } = await requireUser()
  const objectives = await supabase.from('session_learning_objectives').select('learning_objectives(code, title, domain)').eq('session_id', sessionId)
  if (objectives.error) throw new Error('Could not load the session briefing.')
  const rows = (objectives.data ?? []) as unknown as { learning_objectives: Objective | Objective[] | null }[]
  const attendance = data.attendance.find(a => a.session_id === sessionId)
  return <LearnerShell active="/learner/sessions" title={session.title} intro={data.cohorts.find(c => c.id === session.cohort_id)?.name}>
    <Link className="ten-text-link" href="/learner/sessions">← All sessions</Link>
    <section className="ten-panel ten-spaced">
      <StatusBadge tone={session.status === 'live' ? 'accent' : 'neutral'}>{session.status === 'completed' ? 'Session ended' : session.status}</StatusBadge>
      <h2>Your session briefing</h2><p className="whitespace-pre-wrap">{session.description || 'Your facilitator will introduce the session and its clinical context.'}</p>
      <dl className="ten-session-meta"><div><dt>When</dt><dd>{formatJourneyDate(session.scheduled_at)}</dd></div><div><dt>Duration</dt><dd>{session.duration_minutes ? `${session.duration_minutes} minutes` : 'To be confirmed'}</dd></div><div><dt>Your attendance</dt><dd>{attendance?.status ?? 'Not recorded'}</dd></div></dl>
    </section>
    <div className="ten-two-columns ten-spaced"><section className="ten-panel"><h2>What you will work toward</h2><ul className="ten-objectives">{rows.length ? rows.map((row, index) => {
      const objective = Array.isArray(row.learning_objectives) ? row.learning_objectives[0] : row.learning_objectives
      return objective ? <li key={index}><span className="ten-eyebrow">{objective.code}</span><h3>{objective.title}</h3>{objective.domain && <p>{objective.domain}</p>}</li> : null
    }) : <li>Learning objectives have not been published yet.</li>}</ul></section>
    <section className="ten-panel"><h2>{session.status === 'completed' ? 'After the session' : 'Taking part'}</h2>
      <p>{session.status === 'cancelled' ? 'This session has been cancelled. Return to the session list for other opportunities.' : session.status === 'completed' ? 'Revisit the learning objectives and check your attendance record. If it needs correcting, contact your facilitator.' : session.status === 'live' ? 'Follow your facilitator for the session activities. Individual case questions are not available on this page yet.' : 'You can read this briefing now. Your facilitator will guide the activities when the session begins.'}</p>
      <Link className="ten-action ten-spaced" href={session.status === 'completed' ? '/learner/progress' : '/learner/assessments'}>{session.status === 'completed' ? 'Review progress' : 'View cohort checkpoints'} →</Link>
    </section></div>
  </LearnerShell>
}
