/** Presentation of persisted records only. These states never authorize an action. */
export type LearnerSession = {
  id: string; cohort_id: string; title: string; description: string | null
  status: string; scheduled_at: string | null; duration_minutes: number | null
}
export type LearnerAssessment = {
  id: string; cohort_id: string; title: string; assessment_type: string; status: string
  opens_at: string | null; closes_at: string | null; duration_minutes: number | null
}
export type LearnerAttempt = {
  id: string; assessment_id: string; status: string; submitted_at: string | null
}
export type Attendance = { session_id: string; status: string }
export type LearnerCohort = {
  id: string
  name: string
  membership_status: 'active' | 'completed'
}
export type LearnerMembership = { cohort_id: string; status: LearnerCohort['membership_status'] }
export const retainedLearnerMembershipStatuses = ['active', 'completed'] as const

export function attachLearnerMembershipStatus(
  cohorts: { id: string; name: string }[],
  memberships: LearnerMembership[],
): LearnerCohort[] {
  const statusByCohort = new Map(memberships.map((membership) => [membership.cohort_id, membership.status]))
  return cohorts.flatMap((cohort) => {
    const membership_status = statusByCohort.get(cohort.id)
    return membership_status ? [{ ...cohort, membership_status }] : []
  })
}
export type JourneyData = {
  name: string | null
  cohorts: LearnerCohort[]
  sessions: LearnerSession[]
  assessments: LearnerAssessment[]
  attempts: LearnerAttempt[]
  attendance: Attendance[]
}
export type CheckpointState = {
  state: 'available' | 'in_progress' | 'completed' | 'locked'
  label: string; reason: string; href?: string
}

export function isSubmitted(attempt?: LearnerAttempt) {
  return attempt?.status === 'submitted' || attempt?.status === 'late'
}

export function isActiveLearnerCohort(data: JourneyData, cohortId: string) {
  return data.cohorts.some((cohort) => cohort.id === cohortId && cohort.membership_status === 'active')
}

export function checkpointState(
  assessment: LearnerAssessment,
  attempt?: LearnerAttempt,
  { now = Date.now(), canTake = true }: { now?: number; canTake?: boolean } = {},
): CheckpointState {
  if (attempt?.status === 'invalidated') return { state: 'locked', label: 'Attempt invalidated', reason: 'Contact your facilitator about this attempt.' }
  if (isSubmitted(attempt)) return {
    state: 'completed', label: assessment.status === 'released' ? 'Results released' : 'Submitted',
    reason: assessment.status === 'released' ? 'Review your released scores.' : 'Your attempt is saved. Results await release.',
    href: assessment.status === 'released' ? `/learner/results/${attempt!.id}` : '/learner/progress',
  }
  if (!canTake) return {
    state: 'locked',
    label: 'Cohort completed',
    reason: 'This cohort is complete. Your historical sessions, progress, and released results remain available.',
  }
  if (assessment.status === 'scheduled' || (assessment.status === 'live' && assessment.opens_at && Date.parse(assessment.opens_at) > now)) {
    return { state: 'locked', label: 'Upcoming', reason: assessment.opens_at ? `Opens ${formatJourneyDate(assessment.opens_at)}. Your facilitator must also open the checkpoint.` : 'Your facilitator has not opened this checkpoint yet.' }
  }
  if (assessment.status !== 'live' || (assessment.closes_at && Date.parse(assessment.closes_at) < now)) {
    return { state: 'locked', label: 'Closed', reason: attempt ? 'This attempt is unfinished and the checkpoint is closed. Contact your facilitator.' : 'This checkpoint is closed to new submissions.' }
  }
  return {
    state: attempt ? 'in_progress' : 'available', label: attempt ? 'Resume checkpoint' : 'Begin checkpoint',
    reason: attempt ? 'An attempt is in progress. Review every answer before submitting.' : 'This checkpoint is open.',
    href: `/assessments/${assessment.id}/take`,
  }
}

export function nextJourneyAction(data: JourneyData, now = Date.now()) {
  const activeCohortIds = new Set(data.cohorts.filter((cohort) => cohort.membership_status === 'active').map((cohort) => cohort.id))
  const checkpoints = data.assessments
    .filter((assessment) => activeCohortIds.has(assessment.cohort_id))
    .map(assessment => ({ assessment, presentation: checkpointState(assessment, data.attempts.find(a => a.assessment_id === assessment.id), { now }) }))
  const checkpoint = checkpoints.find(c => c.presentation.state === 'in_progress')
    ?? checkpoints.find(c => c.assessment.assessment_type === 'diagnostic' && c.presentation.state === 'available')
  if (checkpoint) return { title: checkpoint.assessment.title, description: checkpoint.presentation.reason, label: checkpoint.presentation.label, href: checkpoint.presentation.href! }
  const live = data.sessions.find(s => activeCohortIds.has(s.cohort_id) && s.status === 'live')
  if (live) return { title: live.title, description: 'Your session is live. Open its briefing and follow your facilitator.', label: 'Open session', href: `/learner/sessions/${live.id}` }
  const available = checkpoints.find(c => c.presentation.state === 'available')
  if (available) return { title: available.assessment.title, description: available.presentation.reason, label: available.presentation.label, href: available.presentation.href! }
  const upcoming = data.sessions.find(s => activeCohortIds.has(s.cohort_id) && s.status === 'scheduled')
  if (upcoming) return { title: upcoming.title, description: 'Prepare for your next session. Its briefing is available now.', label: 'Read briefing', href: `/learner/sessions/${upcoming.id}` }
  return { title: data.cohorts.length ? 'Take stock of your journey' : 'Your journey starts here', description: data.cohorts.length ? 'Review your attendance, submitted checkpoints, and released results.' : 'Explore the orientation. Your sessions will appear when you join an active learner cohort.', label: data.cohorts.length ? 'View progress' : 'Read orientation', href: data.cohorts.length ? '/learner/progress' : '/learner/orientation' }
}

export function formatJourneyDate(value: string | null) {
  if (!value) return 'Time to be confirmed'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Baghdad' }).format(new Date(value)) + ' · Baghdad'
}
