'use server'

import { revalidatePath } from 'next/cache'
import { saveRubricReview } from './save-review'
import { redirect } from 'next/navigation'
import { gradeWrittenResponse } from '@/lib/ai/grading'
import { reviewDetail } from '@/lib/assessment/review'
import { requireUser } from '@/lib/auth/require-user'

type CriterionRow = {
  id: string
  criterion_code: string
  title: string
  description: string | null
  scoring_guidance: string | null
  max_score: number
}

export async function runAIGrading(programId: string, responseId: string) {
  const { supabase, userId } = await requireUser()
  const context = await loadGradingContext(supabase, programId, responseId)
  if (!context) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=missing_context`)

  if (context.scientific) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=human_scoring_required`)
  const maxScore = context.criteria.reduce((sum, criterion) => sum + Number(criterion.max_score), 0)
  const model = process.env.SEIP_AI_GRADING_MODEL?.trim() || 'gpt-5.6-luna'
  const promptVersion = process.env.SEIP_AI_PROMPT_VERSION?.trim() || 'written_rubric_v1'

  const { data: run, error: runError } = await supabase.from('ai_grading_runs').insert({
    response_id: responseId,
    rubric_version_id: context.rubricVersion.id,
    requested_by: userId,
    provider: 'openai',
    model,
    prompt_version: promptVersion,
    status: 'running',
    max_score: maxScore,
  }).select('id').single()

  if (runError || !run) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=ai_run_create_failed`)

  try {
    const result = await gradeWrittenResponse({
      questionStem: context.questionVersion.stem,
      learnerResponse: context.response.text_response,
      rubricInstructions: context.rubricVersion.instructions,
      referenceAnswer: context.rubricVersion.reference_answer,
      criteria: context.criteria.map((criterion) => ({
        code: criterion.criterion_code,
        title: criterion.title,
        description: criterion.description,
        scoringGuidance: criterion.scoring_guidance,
        maxScore: Number(criterion.max_score),
      })),
    })

    const { error: updateError } = await supabase.from('ai_grading_runs').update({
      status: 'completed',
      proposed_total_score: result.totalScore,
      confidence: result.confidence,
      summary: result.summary,
      uncertainty: result.uncertainty,
      provider_response_id: result.providerResponseId,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      raw_output: result.rawOutput,
      completed_at: new Date().toISOString(),
    }).eq('id', run.id)
    if (updateError) throw new Error('Could not persist the AI grading result.')

    const criterionMap = new Map(context.criteria.map((criterion) => [criterion.criterion_code, criterion.id]))
    const { error: scoreError } = await supabase.from('ai_criterion_scores').insert(result.criteria.map((score) => ({
      grading_run_id: run.id,
      criterion_id: criterionMap.get(score.criterion_code)!,
      proposed_score: score.score,
      rationale: score.rationale,
      confidence: score.confidence,
      missing_concepts: score.missing_concepts,
      errors: score.errors,
    })))
    if (scoreError) throw new Error('Could not persist criterion-level AI scores.')
  } catch (error) {
    await supabase.from('ai_grading_runs').update({
      status: 'failed',
      error_message: error instanceof Error ? error.message.slice(0, 2000) : 'Unknown AI grading error',
      completed_at: new Date().toISOString(),
    }).eq('id', run.id)
    redirect(`/programs/${programId}/assessment/grading/${responseId}?error=ai_grading_failed`)
  }

  revalidatePath(`/programs/${programId}/assessment/grading/${responseId}`)
}

export async function submitHumanReview(programId: string, responseId: string, formData: FormData) {
  const result = await saveRubricReview(programId, responseId, {}, formData)
  if (result.error) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=review_validation_failed`)
}

export async function approveHumanFinalScore(programId: string, responseId: string, humanReviewId: string) {
  const { supabase, userId } = await requireUser()
  const { data: review } = await supabase.from('human_reviews').select('id, response_id, total_score, max_score, status').eq('id', humanReviewId).eq('response_id', responseId).maybeSingle()
  if (!review || review.status !== 'submitted') redirect(`/programs/${programId}/assessment/grading/${responseId}?error=review_not_ready`)

  const { data: openModeration } = await supabase.from('moderation_cases').select('id').eq('response_id', responseId).in('status', ['open', 'in_review']).maybeSingle()
  if (openModeration) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=moderation_required`)

  const { error } = await supabase.rpc('ten_finalize_human_review', {
    target_review_id: humanReviewId,
    rationale: 'Approved from submitted human rubric review.',
  })
  if (error) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=final_approval_failed`)
  revalidatePath(`/programs/${programId}/assessment/grading/${responseId}`)
  revalidatePath(`/programs/${programId}/assessment/grading`)
  revalidatePath(`/programs/${programId}/assessment/grading/students`, 'layout')
  revalidatePath('/facilitator/the-ten')
}

export async function resolveModeration(programId: string, responseId: string, moderationCaseId: string, formData: FormData) {
  const rawScore = formData.get('resolved_score')
  const score = typeof rawScore === 'string' && rawScore.trim() !== '' ? Number(rawScore) : NaN
  const note = String(formData.get('resolution_note') ?? '').trim()
  if (!Number.isFinite(score) || score < 0 || !note) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=invalid_moderation`)

  const { supabase, userId } = await requireUser()
  const { data: moderation } = await supabase.from('moderation_cases').select('id, human_review_id, status').eq('id', moderationCaseId).eq('response_id', responseId).maybeSingle()
  if (!moderation || !['open', 'in_review'].includes(moderation.status) || !moderation.human_review_id) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=moderation_not_ready`)
  const { data: review } = await supabase.from('human_reviews').select('id, max_score').eq('id', moderation.human_review_id).maybeSingle()
  if (!review || score > Number(review.max_score)) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=invalid_moderation_score`)

  const { error } = await supabase.rpc('resolve_human_moderation', {
    target_case: moderationCaseId, score, note,
  })
  if (error) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=moderation_final_failed`)
  revalidatePath(`/programs/${programId}/assessment/grading/${responseId}`)
  revalidatePath(`/programs/${programId}/assessment/grading`)
  revalidatePath(`/programs/${programId}/assessment/grading/students`, 'layout')
  revalidatePath('/facilitator/the-ten')
}

async function loadGradingContext(supabase: Awaited<ReturnType<typeof requireUser>>['supabase'], programId: string, responseId: string) {
  const detail = await reviewDetail(supabase, programId, responseId)
  if (!detail || !detail.criteria.length) return null
  return {
    scientific: detail.scientific,
    response: { text_response: detail.response_text },
    rubricVersion: { id: detail.rubric_version_id, instructions: detail.rubric_instructions, reference_answer: detail.reference_answer, moderation_threshold_points: detail.moderation_threshold_points },
    criteria: detail.criteria.map(c => ({ ...c, criterion_code: c.code })) as CriterionRow[],
    questionVersion: { stem: detail.stem },
  }
}
