import 'server-only'
import { requireUser } from '@/lib/auth/require-user'
import { attachLearnerMembershipStatus, retainedLearnerMembershipStatuses, type JourneyData, type LearnerAssessment, type LearnerAttempt, type LearnerSession, type Attendance, type LearnerMembership } from './journey'

type AssignedJourney = {
  pretest?: { id?: string | null }
  posttest?: { id?: string | null }
}

/** Uses the signed-in user's client and existing RLS. Never reads protected question keys. */
export async function getLearnerJourney(): Promise<JourneyData> {
  const { supabase, userId } = await requireUser()
  const [profile, memberships] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    supabase.from('cohort_memberships').select('cohort_id, status').eq('user_id', userId).eq('member_type', 'learner').in('status', [...retainedLearnerMembershipStatuses]),
  ])
  if (profile.error || memberships.error) throw new Error('Could not load learner membership.')
  const membershipRows = (memberships.data ?? []) as LearnerMembership[]
  const ids = [...new Set(membershipRows.map((membership) => membership.cohort_id))]
  if (!ids.length) return { name: profile.data?.full_name ?? null, cohorts: [], sessions: [], assessments: [], attempts: [], attendance: [] }

  const [cohorts, sessions, assessments, journey] = await Promise.all([
    supabase.from('cohorts').select('id, name').in('id', ids).order('name'),
    supabase.from('sessions').select('id, cohort_id, title, description, status, scheduled_at, duration_minutes').in('cohort_id', ids).in('status', ['scheduled', 'live', 'completed', 'cancelled']).order('scheduled_at', { nullsFirst: false }),
    supabase.from('assessments').select('id, cohort_id, title, assessment_type, status, opens_at, closes_at, duration_minutes').in('cohort_id', ids).in('status', ['scheduled', 'live', 'closed', 'grading', 'moderation', 'approved_results', 'released']).order('opens_at', { nullsFirst: false }),
    supabase.rpc('journey_summary', { target_cohort_id: null }),
  ])
  if (cohorts.error || sessions.error || assessments.error || journey.error) throw new Error('Could not load your journey.')

  const assigned = journey.data as AssignedJourney | null
  const assignedProgressIds = new Set([assigned?.pretest?.id, assigned?.posttest?.id].filter((id): id is string => Boolean(id)))
  const visibleAssessments = (assessments.data ?? []).filter((assessment) => assessment.assessment_type !== 'progress' || assignedProgressIds.has(assessment.id))

  const sessionIds = (sessions.data ?? []).map(s => s.id)
  const assessmentIds = visibleAssessments.map(a => a.id)
  const [attendance, attempts] = await Promise.all([
    sessionIds.length ? supabase.from('attendance_records').select('session_id, status').eq('learner_id', userId).in('session_id', sessionIds) : { data: [], error: null },
    assessmentIds.length ? supabase.from('assessment_attempts').select('id, assessment_id, status, submitted_at').eq('learner_id', userId).in('assessment_id', assessmentIds) : { data: [], error: null },
  ])
  if (attendance.error || attempts.error) throw new Error('Could not load your progress.')
  return {
    name: profile.data?.full_name ?? null,
    cohorts: attachLearnerMembershipStatus(cohorts.data ?? [], membershipRows),
    sessions: (sessions.data ?? []) as LearnerSession[], assessments: visibleAssessments as LearnerAssessment[],
    attendance: (attendance.data ?? []) as Attendance[], attempts: (attempts.data ?? []) as LearnerAttempt[],
  }
}

