import 'server-only'

import { notFound } from 'next/navigation'
import { requireClassroomTeacher } from './access'

export const CLASSROOM_CONTENT_VERSION = '2.0-approved-foundation'

export type ClassroomCohort = { id: string; program_id: string; name: string; status: string }
export type ClassroomMeetingRow = {
  id: string; cohort_id: string; meeting_key: string; content_version: string
  scheduled_at: string | null; notes: string; status: 'planned' | 'completed'
  completed_at: string | null; completed_by: string | null; created_by: string
  created_at: string; updated_at: string
}
export type ClassroomAttendanceRow = {
  meeting_id: string; learner_id: string
  status: 'present' | 'late' | 'absent' | 'excused'
  recorded_by: string; updated_at: string
}
export type ClassroomRosterLearner = {
  id: string; learner_id: string; full_name: string
  student_id: string | null; learner_code: string | null
}

const meetingColumns = 'id,cohort_id,meeting_key,content_version,scheduled_at,status,completed_at,completed_by,created_by,created_at,updated_at'

export async function getClassroomWorkspace() {
  const context = await requireClassroomTeacher()
  if (context.cohortIds.length === 0) return { context, cohorts: [] as ClassroomCohort[], meetings: [] as ClassroomMeetingRow[], available: true }
  const { data: cohorts, error: cohortError } = await context.supabase.from('cohorts')
    .select('id,program_id,name,status').in('id', context.cohortIds).order('name')
  if (cohortError) return { context, cohorts: [] as ClassroomCohort[], meetings: [] as ClassroomMeetingRow[], available: false, error: 'تعذّر تحميل المجموعات. حدّث الصفحة وحاول مجدداً.' }
  const { data: meetings, error } = await context.supabase.from('classroom_meetings')
    .select(meetingColumns).in('cohort_id', context.cohortIds)
    .eq('content_version', CLASSROOM_CONTENT_VERSION).order('meeting_key')
  return {
    context, cohorts: (cohorts ?? []) as ClassroomCohort[],
    meetings: (meetings ?? []).map(row => ({ ...row, notes: '' })) as ClassroomMeetingRow[], available: !error,
    error: error ? 'الحفظ الحضوري غير متاح حالياً. يمكنك متابعة استخدام مواد الجلسة.' : undefined,
  }
}

/** Always checks the record's own cohort; a guessed meeting UUID confers no access. */
export async function getClassroomMeetingRecord(recordId: string) {
  const context = await requireClassroomTeacher()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recordId) || context.cohortIds.length === 0) notFound()
  const { data: record, error } = await context.supabase.from('classroom_meetings')
    .select(meetingColumns).eq('id', recordId).in('cohort_id', context.cohortIds)
    .eq('content_version', CLASSROOM_CONTENT_VERSION).maybeSingle()
  if (error || !record) notFound()
  const meeting = { ...record, notes: '' } as ClassroomMeetingRow
  const [cohortResult, rosterResult, attendanceResult, notesResult] = await Promise.all([
    context.supabase.from('cohorts').select('id,program_id,name,status').eq('id', meeting.cohort_id).maybeSingle(),
    context.supabase.from('cohort_memberships').select('user_id').eq('cohort_id', meeting.cohort_id)
      .eq('member_type', 'learner').eq('status', 'active'),
    context.supabase.from('classroom_attendance').select('meeting_id,learner_id,status,recorded_by,updated_at').eq('meeting_id', meeting.id),
    context.supabase.from('classroom_meeting_notes').select('notes').eq('meeting_id', meeting.id).maybeSingle(),
  ])
  if (cohortResult.error || !cohortResult.data || rosterResult.error || attendanceResult.error || notesResult.error) {
    throw new Error('تعذّر تحميل سجل اللقاء. حدّث الصفحة وحاول مجدداً.')
  }
  meeting.notes = notesResult.data?.notes ?? ''
  const learnerIds = [...new Set((rosterResult.data ?? []).map(row => row.user_id as string))]
  let learners: ClassroomRosterLearner[] = []
  if (learnerIds.length > 0) {
    const { data: profiles, error: profileError } = await context.supabase.from('profiles')
      .select('id,full_name,student_id').in('id', learnerIds).order('full_name')
    if (profileError) throw new Error('تعذّر تحميل قائمة المتعلمين.')
    // Do not fabricate a roster or silently mark missing profile rows absent.
    if ((profiles ?? []).length !== learnerIds.length) throw new Error('تعذّر تحميل قائمة المتعلمين كاملة. راجع صلاحيات المجموعة.')
    learners = (profiles ?? []).map(profile => ({
      id: profile.id, learner_id: profile.id, full_name: profile.full_name,
      student_id: profile.student_id, learner_code: profile.student_id,
    }))
  }
  return {
    context, cohort: cohortResult.data as ClassroomCohort, meeting,
    learners, attendance: (attendanceResult.data ?? []) as ClassroomAttendanceRow[],
  }
}
