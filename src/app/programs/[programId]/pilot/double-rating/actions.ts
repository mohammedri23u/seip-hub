'use server'

import { programMembership } from '@/lib/auth/program-membership'


import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

async function assertAssessmentLead(programId: string) {
  const { supabase, userId } = await requireUser()
  const [{ data: membership }, { data: admin }] = await Promise.all([
    programMembership(supabase, programId, userId),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
  ])
  if (!admin && membership?.role !== 'program_director' && membership?.role !== 'assessment_lead') {
    redirect(`/programs/${programId}/pilot/double-rating?error=not_authorized`)
  }
  return { supabase, userId }
}

async function responseBelongsToScoredForm(
  supabase: Awaited<ReturnType<typeof requireUser>>['supabase'],
  programId: string,
  responseId: string,
) {
  const { data: response } = await supabase.from('student_responses').select('id, attempt_id').eq('id', responseId).maybeSingle()
  if (!response) return false
  const { data: attempt } = await supabase.from('assessment_attempts').select('assessment_id, status').eq('id', response.attempt_id).maybeSingle()
  if (!attempt || !['submitted', 'late'].includes(attempt.status)) return false
  const { data: assessment } = await supabase.from('assessments').select('id, cohort_id, assessment_type').eq('id', attempt.assessment_id).maybeSingle()
  if (!assessment || assessment.assessment_type !== 'progress') return false
  const { data: cohort } = await supabase.from('cohorts').select('program_id').eq('id', assessment.cohort_id).maybeSingle()
  if (!cohort || cohort.program_id !== programId) return false

  const { data: assignments } = await supabase
    .from('program_assessment_sequences')
    .select('pre_assessment_id, post_assessment_id')
    .eq('program_id', programId)
    .eq('active', true)
  return (assignments ?? []).some((row) => row.pre_assessment_id === assessment.id || row.post_assessment_id === assessment.id)
}

export async function requireDoubleRating(programId: string, responseId: string, formData: FormData) {
  const { supabase, userId } = await assertAssessmentLead(programId)
  const reason = String(formData.get('reason') ?? '').trim()
  if (reason.length < 10) redirect(`/programs/${programId}/pilot/double-rating?error=reason_required`)

  const { data: quality } = await supabase
    .from('program_assessment_quality_settings')
    .select('double_rating_required, double_rating_target_count, double_rating_selection_rule')
    .eq('program_id', programId)
    .maybeSingle()
  if (!quality?.double_rating_required || !quality.double_rating_target_count || !quality.double_rating_selection_rule?.trim()) {
    redirect(`/programs/${programId}/pilot/double-rating?error=quality_rule_required`)
  }

  if (!(await responseBelongsToScoredForm(supabase, programId, responseId))) {
    redirect(`/programs/${programId}/pilot/double-rating?error=invalid_response`)
  }

  const { count } = await supabase
    .from('grading_quality_samples')
    .select('response_id', { count: 'exact', head: true })
    .eq('program_id', programId)
    .in('status', ['assigned', 'complete'])
  if ((count ?? 0) >= quality.double_rating_target_count) {
    redirect(`/programs/${programId}/pilot/double-rating?error=target_reached`)
  }

  const { error } = await supabase.from('grading_quality_samples').upsert({
    response_id: responseId,
    program_id: programId,
    required_reviews: 2,
    reason,
    status: 'assigned',
    created_by: userId,
  }, { onConflict: 'response_id' })
  if (error) redirect(`/programs/${programId}/pilot/double-rating?error=sample_save_failed`)

  revalidatePath(`/programs/${programId}/pilot/double-rating`)
  revalidatePath(`/programs/${programId}/assessment/grading`)
  redirect(`/programs/${programId}/pilot/double-rating?saved=1`)
}

export async function cancelDoubleRating(programId: string, responseId: string) {
  const { supabase } = await assertAssessmentLead(programId)
  const { error } = await supabase.from('grading_quality_samples').update({ status: 'cancelled' }).eq('program_id', programId).eq('response_id', responseId).eq('status', 'assigned')
  if (error) redirect(`/programs/${programId}/pilot/double-rating?error=cancel_failed`)
  revalidatePath(`/programs/${programId}/pilot/double-rating`)
  revalidatePath(`/programs/${programId}/assessment/grading`)
  redirect(`/programs/${programId}/pilot/double-rating?cancelled=1`)
}
