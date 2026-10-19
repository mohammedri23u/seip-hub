import 'server-only'

import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'
import { CLASSROOM_PROGRAM_CODE } from './access'
import { CLASSROOM_CONTENT_VERSION } from './data'

export type LearnerClassroomCohort = { id: string; name: string }
export type LearnerClassroomMeeting = {
  id: string
  cohortId: string
  meetingKey: string
  scheduledAt: string | null
  status: 'planned' | 'completed'
  attendance: 'present' | 'late' | 'absent' | 'excused' | null
}
export type LearnerClassroomMeetings = {
  available: boolean
  cohorts: LearnerClassroomCohort[]
  meetings: LearnerClassroomMeeting[]
  error?: string
}

function unavailable(message: string): LearnerClassroomMeetings {
  return { available: false, cohorts: [], meetings: [], error: message }
}

/** Own active THE TEN memberships only. Never selects private teaching reflections or answers. */
export async function getLearnerClassroomMeetings(): Promise<LearnerClassroomMeetings> {
  const { supabase, userId } = await requireUser()
  const [profileResult, programMembershipResult, programResult] = await Promise.all([
    supabase.from('profiles').select('status').eq('id', userId).maybeSingle(),
    supabase.from('program_memberships').select('program_id').eq('user_id', userId)
      .eq('role', 'learner').eq('status', 'active'),
    supabase.from('programs').select('id').eq('code', CLASSROOM_PROGRAM_CODE).eq('status', 'active'),
  ])
  if (profileResult.error || programMembershipResult.error || programResult.error) {
    return unavailable('تعذّر التحقق من مجموعتك الحضورية. حدّث الصفحة وحاول مجدداً.')
  }
  if (profileResult.data?.status !== 'active') notFound()
  const activeProgramIds = new Set((programResult.data ?? []).map(program => program.id as string))
  const programIds = [...new Set((programMembershipResult.data ?? [])
    .map(membership => membership.program_id as string).filter(id => activeProgramIds.has(id)))]
  if (programIds.length === 0) return { available: true, cohorts: [], meetings: [] }

  const { data: memberships, error: membershipError } = await supabase.from('cohort_memberships')
    .select('cohort_id').eq('user_id', userId).eq('member_type', 'learner').eq('status', 'active')
  if (membershipError) return unavailable('تعذّر تحميل عضويتك في المجموعة. حدّث الصفحة وحاول مجدداً.')
  const membershipIds = [...new Set((memberships ?? []).map(membership => membership.cohort_id as string))]
  if (membershipIds.length === 0) return { available: true, cohorts: [], meetings: [] }

  const { data: cohorts, error: cohortError } = await supabase.from('cohorts')
    .select('id,name').in('id', membershipIds).in('program_id', programIds).eq('status', 'active').order('name')
  if (cohortError) return unavailable('تعذّر تحميل المجموعة الحضورية. حدّث الصفحة وحاول مجدداً.')
  const cohortRows = (cohorts ?? []) as LearnerClassroomCohort[]
  if (cohortRows.length === 0) return { available: true, cohorts: [], meetings: [] }

  const { data: meetings, error: meetingError } = await supabase.from('classroom_meetings')
    .select('id,cohort_id,meeting_key,scheduled_at,status').in('cohort_id', cohortRows.map(cohort => cohort.id))
    .eq('content_version', CLASSROOM_CONTENT_VERSION).order('meeting_key')
  if (meetingError) return unavailable('تعذّر تحميل المواعيد والحضور الحضوري حالياً. حدّث الصفحة أو راجع المعلم؛ لم نتمكن من تأكيد سجلّك.')
  const meetingRows = meetings ?? []
  if (meetingRows.length === 0) return { available: true, cohorts: cohortRows, meetings: [] }

  const { data: attendance, error: attendanceError } = await supabase.from('classroom_attendance')
    .select('meeting_id,status').eq('learner_id', userId).in('meeting_id', meetingRows.map(meeting => meeting.id))
  if (attendanceError) return unavailable('تعذّر تحميل سجل الحضور الحضوري. حدّث الصفحة أو راجع المعلم؛ لم نتمكن من تأكيد حالة حضورك.')
  const attendanceByMeeting = new Map((attendance ?? []).map(record => [record.meeting_id, record.status]))
  return {
    available: true,
    cohorts: cohortRows,
    meetings: meetingRows.map(meeting => ({
      id: meeting.id,
      cohortId: meeting.cohort_id,
      meetingKey: meeting.meeting_key,
      scheduledAt: meeting.scheduled_at,
      status: meeting.status,
      attendance: attendanceByMeeting.get(meeting.id) ?? null,
    })) as LearnerClassroomMeeting[],
  }
}
