'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

export async function createRubric(programId: string, formData: FormData) {
  const rubricCode = String(formData.get('rubric_code') ?? '').trim().toUpperCase()
  const title = String(formData.get('title') ?? '').trim()
  const description = emptyToNull(formData.get('description'))
  const instructions = emptyToNull(formData.get('instructions'))
  const referenceAnswer = emptyToNull(formData.get('reference_answer'))
  const thresholdRaw = String(formData.get('moderation_threshold_points') ?? '').trim()
  const threshold = thresholdRaw ? Number(thresholdRaw) : null

  const criteria = Array.from({ length: 6 }, (_, index) => {
    const n = index + 1
    const criterionTitle = String(formData.get(`criterion_${n}_title`) ?? '').trim()
    if (!criterionTitle) return null
    const code = String(formData.get(`criterion_${n}_code`) ?? '').trim().toUpperCase() || `C${n}`
    const maxScore = Number(formData.get(`criterion_${n}_max`) ?? 0)
    return {
      criterion_code: code,
      title: criterionTitle,
      description: emptyToNull(formData.get(`criterion_${n}_description`)),
      scoring_guidance: emptyToNull(formData.get(`criterion_${n}_guidance`)),
      max_score: maxScore,
      position: n,
    }
  }).filter((criterion): criterion is NonNullable<typeof criterion> => Boolean(criterion))

  if (!rubricCode || !/^[A-Z0-9_-]{2,30}$/.test(rubricCode) || !title || !criteria.length || threshold !== null && (!Number.isFinite(threshold) || threshold < 0)) {
    redirect(`/programs/${programId}/assessment/rubrics/new?error=invalid_input`)
  }
  if (criteria.some((criterion) => !Number.isFinite(criterion.max_score) || criterion.max_score <= 0)) {
    redirect(`/programs/${programId}/assessment/rubrics/new?error=invalid_criteria`)
  }

  const { supabase, userId } = await requireUser()
  const { data: rubric, error: rubricError } = await supabase.from('rubrics').insert({
    program_id: programId,
    rubric_code: rubricCode,
    title,
    description,
    created_by: userId,
  }).select('id').single()

  if (rubricError || !rubric) redirect(`/programs/${programId}/assessment/rubrics/new?error=rubric_failed`)

  const { data: version, error: versionError } = await supabase.from('rubric_versions').insert({
    rubric_id: rubric.id,
    version_number: 1,
    instructions,
    reference_answer: referenceAnswer,
    moderation_threshold_points: threshold,
    created_by: userId,
  }).select('id').single()

  if (versionError || !version) {
    await supabase.from('rubrics').delete().eq('id', rubric.id)
    redirect(`/programs/${programId}/assessment/rubrics/new?error=version_failed`)
  }

  const { error: criteriaError } = await supabase.from('rubric_criteria').insert(criteria.map((criterion) => ({
    ...criterion,
    rubric_version_id: version.id,
  })))

  if (criteriaError) {
    await supabase.from('rubrics').delete().eq('id', rubric.id)
    redirect(`/programs/${programId}/assessment/rubrics/new?error=criteria_failed`)
  }

  redirect(`/programs/${programId}/assessment/rubrics/${rubric.id}`)
}

function emptyToNull(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text || null
}
