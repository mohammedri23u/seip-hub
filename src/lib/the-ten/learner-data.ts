import 'server-only'
import { requireUser } from '@/lib/auth/require-user'
import type { JourneyData, LearnerAssessment, LearnerAttempt, LearnerSession, Attendance } from './journey'

/** Uses the signed-in user's client and existing RLS. Never reads protected question keys. */
export async function getLearnerJourney(): Promise<JourneyData> {
  const { supabase, userId } = await requireUser()
  const [profile, memberships] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    supabase.from('cohort_memberships').select('cohort_id').eq('user_id', userId).eq('member_type', 'learner').eq('status', 'active'),
  ])
  if (profile.error || memberships.error) throw new Error('Could not load learner membership.')
  const ids = [...new Set((memberships.data ?? []).map(m => m.cohort_id as string))]
  if (!ids.length) return { name: profile.data?.full_name ?? null, cohorts: [], sessions: [], assessments: [], attempts: [], attendance: [] }
  const [cohorts, sessions, assessments] = await Promise.all([
    supabase.from('cohorts').select('id, name').in('id', ids).order('name'),
    supabase.from('sessions').select('id, cohort_id, title, description, status, scheduled_at, duration_minutes').in('cohort_id', ids).in('status', ['scheduled', 'live', 'completed', 'cancelled']).order('scheduled_at', { nullsFirst: false }),
    supabase.from('assessments').select('id, cohort_id, title, assessment_type, status, opens_at, closes_at, duration_minutes').in('cohort_id', ids).in('status', ['scheduled', 'live', 'closed', 'grading', 'moderation', 'approved_results', 'released']).order('opens_at', { nullsFirst: false }),
  ])
  if (cohorts.error || sessions.error || assessments.error) throw new Error('Could not load your journey.')
  const sessionIds = (sessions.data ?? []).map(s => s.id)
  const assessmentIds = (assessments.data ?? []).map(a => a.id)
  const [attendance, attempts] = await Promise.all([
    sessionIds.length ? supabase.from('attendance_records').select('session_id, status').eq('learner_id', userId).in('session_id', sessionIds) : { data: [], error: null },
    assessmentIds.length ? supabase.from('assessment_attempts').select('id, assessment_id, status, submitted_at').eq('learner_id', userId).in('assessment_id', assessmentIds) : { data: [], error: null },
  ])
  if (attendance.error || attempts.error) throw new Error('Could not load your progress.')
  return {
    name: profile.data?.full_name ?? null, cohorts: cohorts.data ?? [],
    sessions: (sessions.data ?? []) as LearnerSession[], assessments: (assessments.data ?? []) as LearnerAssessment[],
    attendance: (attendance.data ?? []) as Attendance[], attempts: (attempts.data ?? []) as LearnerAttempt[],
  }
}
