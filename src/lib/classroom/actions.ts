'use server'

import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import { requireClassroomTeacher } from './access'
import { CLASSROOM_CONTENT_VERSION, getClassroomMeetingRecord } from './data'

const statuses = new Set(['present', 'late', 'absent', 'excused'])
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function returnToMeeting(recordId: string, result: string): never {
  redirect('/classroom/meetings/' + recordId + '?' + result)
}

export async function createClassroomMeetings(cohortId: string, _formData?: FormData): Promise<never> {
  const context = await requireClassroomTeacher()
  if (!uuid.test(cohortId) || !context.cohortIds.includes(cohortId)) notFound()
  const rows = Array.from({ length: 5 }, (_, index) => ({
    cohort_id: cohortId, meeting_key: 'meeting-' + (index + 1), content_version: CLASSROOM_CONTENT_VERSION,
  }))
  // DO NOTHING preserves any prior dates, attendance, notes and completion.
  const { error } = await context.supabase.from('classroom_meetings')
    .upsert(rows, { onConflict: 'cohort_id,meeting_key', ignoreDuplicates: true })
  if (error) redirect('/classroom?error=initialize')
  const { data: saved, error: verifyError } = await context.supabase.from('classroom_meetings')
    .select('meeting_key').eq('cohort_id', cohortId).eq('content_version', CLASSROOM_CONTENT_VERSION)
  if (verifyError || saved?.length !== 5) redirect('/classroom?error=initialize')
  revalidatePath('/classroom')
  redirect('/classroom?saved=1')
}

export async function saveClassroomAttendance(recordId: string, formData: FormData): Promise<never> {
  const { context, meeting, learners } = await getClassroomMeetingRecord(recordId)
  const roster = new Set(learners.map(learner => learner.id))
  const rows: { meeting_id: string; learner_id: string; status: string }[] = []
  const seen = new Set<string>()
  for (const [field, value] of formData.entries()) {
    if (!field.startsWith('attendance:')) continue
    const learnerId = field.slice('attendance:'.length)
    if (!roster.has(learnerId) || seen.has(learnerId) || typeof value !== 'string') returnToMeeting(recordId, 'error=attendance')
    seen.add(learnerId)
    // The unselected option means unknown; it does not overwrite an existing record.
    if (value === '') continue
    if (!statuses.has(value)) returnToMeeting(recordId, 'error=attendance')
    rows.push({ meeting_id: meeting.id, learner_id: learnerId, status: value })
  }
  if (rows.length === 0) returnToMeeting(recordId, 'error=empty-attendance')
  // A single PostgREST upsert is atomic: one invalid/out-of-roster row rejects the whole save.
  const { data: saved, error } = await context.supabase.from('classroom_attendance')
    .upsert(rows, { onConflict: 'meeting_id,learner_id' }).select('learner_id')
  if (error || saved?.length !== rows.length) returnToMeeting(recordId, 'error=attendance')
  revalidatePath('/classroom')
  revalidatePath('/classroom/meetings/' + recordId)
  returnToMeeting(recordId, 'saved=attendance')
}

export async function saveClassroomMeeting(recordId: string, formData: FormData): Promise<never> {
  const { context } = await getClassroomMeetingRecord(recordId)
  const status = formData.get('status')
  const notes = formData.get('notes')
  const scheduledInput = formData.get('scheduled_at')
  if ((status !== 'planned' && status !== 'completed') || typeof notes !== 'string' ||
      notes.length > 4000 || typeof scheduledInput !== 'string') returnToMeeting(recordId, 'error=meeting')
  let scheduledAt: string | null = null
  if (scheduledInput.trim() !== '') {
    // datetime-local is explicitly Baghdad time; never use the server's timezone.
    const local = scheduledInput.trim()
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(local)) returnToMeeting(recordId, 'error=date')
    const date = new Date(local + '+03:00')
    if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, local.length) !== local) returnToMeeting(recordId, 'error=date')
    scheduledAt = date.toISOString()
  }
  // Completion identity/time and updated_at are assigned by the database trigger.
  const { data: saved, error } = await context.supabase.rpc('save_classroom_meeting', {
    target_meeting_id: recordId, target_status: status, target_scheduled_at: scheduledAt, target_notes: notes.trim(),
  })
  if (error || saved !== recordId) returnToMeeting(recordId, 'error=meeting')
  revalidatePath('/classroom')
  revalidatePath('/classroom/meetings/' + recordId)
  returnToMeeting(recordId, 'saved=meeting')
}
