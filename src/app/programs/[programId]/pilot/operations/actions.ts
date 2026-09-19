'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireProgramRole } from '@/lib/auth/require-program-role'

export async function saveCompletion(programId: string, data: FormData) {
  const { supabase } = await requireProgramRole(programId, ['program_director'])
  const raw = data.get('attendance')
  const { error } = await supabase.rpc('save_program_completion_settings', {
    target_program: programId, minimum_sessions: raw === null || raw === '' ? null : Number(raw),
    feedback_required: data.get('feedback') === 'on', title: String(data.get('title') ?? '').trim(),
  })
  revalidatePath('/learner/certificate')
  redirect(`/programs/${programId}/pilot/operations?${error ? 'error=completion' : 'saved=1'}`)
}

export async function allocate(programId: string, cohortId: string, learnerId: string, data: FormData) {
  const { supabase } = await requireProgramRole(programId, ['program_director', 'assessment_lead'])
  const { data: cohort } = await supabase.from('cohorts').select('id').eq('id', cohortId).eq('program_id', programId).maybeSingle()
  if (!cohort) redirect(`/programs/${programId}/pilot/operations?error=cohort`)
  const { error } = await supabase.rpc('allocate_assessment_sequence', { target_cohort: cohortId, target_learner: learnerId, sequence: String(data.get('sequence')) })
  redirect(`/programs/${programId}/pilot/operations?${error ? 'error=allocation' : 'saved=1'}`)
}

export async function recordEvidence(programId: string, data: FormData) {
  const { supabase, userId } = await requireProgramRole(programId, ['program_director'])
  const { error } = await supabase.from('program_release_evidence').upsert({
    program_id: programId, gate: String(data.get('gate')), evidence_url: String(data.get('url')).trim(),
    note: String(data.get('note')).trim(), recorded_by: userId, recorded_at: new Date().toISOString(),
  }, { onConflict: 'program_id,gate' }).select('gate').single()
  revalidatePath(`/programs/${programId}/pilot`)
  redirect(`/programs/${programId}/pilot/operations?${error ? 'error=evidence' : 'saved=1'}`)
}

export async function scheduleSession(programId: string, sessionId: string, data: FormData) {
  const { supabase } = await requireProgramRole(programId, ['program_director'])
  // UTC is explicit in the form, independent of browser/server timezone.
  const raw = String(data.get('scheduled') ?? '')
  const date = new Date(raw.endsWith('Z') ? raw : raw + 'Z')
  if (!raw || Number.isNaN(date.getTime())) redirect(`/programs/${programId}/pilot/operations?error=schedule`)
  const { error } = await supabase.rpc('schedule_program_session', {
    target_session: sessionId, scheduled: date.toISOString(), duration: Number(data.get('duration')),
    facilitator: String(data.get('facilitator') ?? '') || null,
  })
  redirect(`/programs/${programId}/pilot/operations?${error ? 'error=schedule' : 'saved=1'}`)
}

export async function publishAssessment(programId: string, assessmentId: string, data: FormData) {
  const { supabase } = await requireProgramRole(programId, ['program_director', 'assessment_lead'])
  const { data: assessment } = await supabase.from('assessments').select('cohort_id').eq('id', assessmentId).maybeSingle()
  if (!assessment) redirect(`/programs/${programId}/pilot/operations?error=assessment`)
  const { data: cohort } = await supabase.from('cohorts').select('id').eq('id', assessment.cohort_id).eq('program_id', programId).maybeSingle()
  if (!cohort) redirect(`/programs/${programId}/pilot/operations?error=cohort`)
  const status = String(data.get('status'))
  if (!['approved', 'live', 'closed'].includes(status)) redirect(`/programs/${programId}/pilot/operations?error=status`)
  const { error } = await supabase.from('assessments').update({ status }).eq('id', assessmentId).select('id').single()
  redirect(`/programs/${programId}/pilot/operations?${error ? 'error=publication' : 'saved=1'}`)
}
