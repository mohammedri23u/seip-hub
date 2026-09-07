'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

const allowedTypes = new Set(['diagnostic', 'formative', 'session_quiz', 'progress', 'final'])

export async function createAssessment(programId: string, formData: FormData) {
  const cohortId = String(formData.get('cohort_id') ?? '')
  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const assessmentType = String(formData.get('assessment_type') ?? '')
  const durationRaw = String(formData.get('duration_minutes') ?? '').trim()
  const durationMinutes = durationRaw ? Number(durationRaw) : null

  if (!cohortId || !title || !allowedTypes.has(assessmentType) || (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes <= 0))) {
    redirect(`/programs/${programId}/assessment/assessments/new?error=invalid_assessment`)
  }

  const { supabase, userId } = await requireUser()
  const { data: cohort } = await supabase.from('cohorts').select('id').eq('id', cohortId).eq('program_id', programId).maybeSingle()
  if (!cohort) redirect(`/programs/${programId}/assessment/assessments/new?error=invalid_cohort`)

  const { data: assessment, error } = await supabase.from('assessments').insert({
    cohort_id: cohortId,
    title,
    description: description || null,
    assessment_type: assessmentType,
    duration_minutes: durationMinutes,
    status: 'draft',
    created_by: userId,
  }).select('id').single()

  if (error || !assessment) redirect(`/programs/${programId}/assessment/assessments/new?error=create_assessment_failed`)
  redirect(`/assessments/${assessment.id}`)
}
