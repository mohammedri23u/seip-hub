'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

const nextStatus: Record<string, string> = {
  draft: 'review',
  review: 'approved',
  approved: 'scheduled',
  scheduled: 'live',
  live: 'closed',
  closed: 'grading',
}

export async function addBlueprintRow(assessmentId: string, formData: FormData) {
  const learningObjectiveId = String(formData.get('learning_objective_id') ?? '')
  const weightRaw = String(formData.get('target_weight') ?? '').trim()
  const marksRaw = String(formData.get('target_marks') ?? '').trim()
  const targetWeight = weightRaw ? Number(weightRaw) : null
  const targetMarks = marksRaw ? Number(marksRaw) : null
  if (!learningObjectiveId || (targetWeight !== null && (targetWeight < 0 || targetWeight > 100)) || (targetMarks !== null && targetMarks < 0)) {
    redirect(`/assessments/${assessmentId}?error=invalid_blueprint`)
  }
  const { supabase } = await requireUser()
  const { error } = await supabase.from('assessment_blueprint').upsert({
    assessment_id: assessmentId,
    learning_objective_id: learningObjectiveId,
    target_weight: targetWeight,
    target_marks: targetMarks,
  }, { onConflict: 'assessment_id,learning_objective_id' })
  if (error) redirect(`/assessments/${assessmentId}?error=blueprint_failed`)
  revalidatePath(`/assessments/${assessmentId}`)
}

export async function addAssessmentItem(assessmentId: string, formData: FormData) {
  const questionVersionId = String(formData.get('question_version_id') ?? '')
  const marks = Number(formData.get('marks') ?? 1)
  if (!questionVersionId || !Number.isFinite(marks) || marks <= 0) redirect(`/assessments/${assessmentId}?error=invalid_item`)
  const { supabase } = await requireUser()
  const { data: existing } = await supabase.from('assessment_items').select('position').eq('assessment_id', assessmentId).order('position', { ascending: false }).limit(1)
  const position = (existing?.[0]?.position ?? 0) + 1
  const { error } = await supabase.from('assessment_items').insert({ assessment_id: assessmentId, question_version_id: questionVersionId, position, marks })
  if (error) redirect(`/assessments/${assessmentId}?error=add_item_failed`)
  revalidatePath(`/assessments/${assessmentId}`)
}

export async function scheduleAssessment(assessmentId: string, formData: FormData) {
  const opensAt = String(formData.get('opens_at') ?? '').trim()
  const closesAt = String(formData.get('closes_at') ?? '').trim()
  const durationRaw = String(formData.get('duration_minutes') ?? '').trim()
  const durationMinutes = durationRaw ? Number(durationRaw) : null
  if (opensAt && closesAt && new Date(closesAt) <= new Date(opensAt)) redirect(`/assessments/${assessmentId}?error=invalid_window`)
  if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes <= 0)) redirect(`/assessments/${assessmentId}?error=invalid_duration`)
  const { supabase } = await requireUser()
  const { error } = await supabase.from('assessments').update({
    opens_at: opensAt ? new Date(opensAt).toISOString() : null,
    closes_at: closesAt ? new Date(closesAt).toISOString() : null,
    duration_minutes: durationMinutes,
  }).eq('id', assessmentId)
  if (error) redirect(`/assessments/${assessmentId}?error=schedule_failed`)
  revalidatePath(`/assessments/${assessmentId}`)
}

export async function advanceAssessment(assessmentId: string) {
  const { supabase } = await requireUser()
  const { data: assessment } = await supabase.from('assessments').select('status').eq('id', assessmentId).maybeSingle()
  if (!assessment) redirect('/dashboard')
  const target = nextStatus[assessment.status]
  if (!target) redirect(`/assessments/${assessmentId}?error=no_transition`)
  if (assessment.status === 'review') {
    const { count } = await supabase.from('assessment_items').select('question_version_id', { count: 'exact', head: true }).eq('assessment_id', assessmentId)
    if (!count) redirect(`/assessments/${assessmentId}?error=assessment_has_no_items`)
  }
  const { error } = await supabase.from('assessments').update({ status: target }).eq('id', assessmentId).eq('status', assessment.status)
  if (error) redirect(`/assessments/${assessmentId}?error=transition_failed`)
  revalidatePath(`/assessments/${assessmentId}`)
}
