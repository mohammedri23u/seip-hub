'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { gradeWrittenResponse } from '@/lib/ai/grading'
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
  const context = await loadGradingContext(supabase, responseId)
  if (!context) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=missing_context`)

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
  const { supabase, userId } = await requireUser()
  const context = await loadGradingContext(supabase, responseId)
  if (!context) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=missing_context`)

  const criterionScores = context.criteria.map((criterion) => {
    const score = Number(formData.get(`criterion_${criterion.id}`) ?? NaN)
    const feedback = String(formData.get(`feedback_${criterion.id}`) ?? '').trim() || null
    return { criterion, score, feedback }
  })
  if (criterionScores.some(({ criterion, score }) => !Number.isFinite(score) || score < 0 || score > Number(criterion.max_score))) {
    redirect(`/programs/${programId}/assessment/grading/${responseId}?error=invalid_human_scores`)
  }

  const totalScore = criterionScores.reduce((sum, item) => sum + item.score, 0)
  const maxScore = context.criteria.reduce((sum, criterion) => sum + Number(criterion.max_score), 0)
  const aiRunId = String(formData.get('ai_grading_run_id') ?? '').trim() || null
  const generalFeedback = String(formData.get('general_feedback') ?? '').trim() || null
  const manualModeration = String(formData.get('send_to_moderation') ?? '') === 'yes'

  const { data: review, error: reviewError } = await supabase.from('human_reviews').upsert({
    response_id: responseId,
    rubric_version_id: context.rubricVersion.id,
    ai_grading_run_id: aiRunId,
    reviewer_id: userId,
    status: 'submitted',
    total_score: totalScore,
    max_score: maxScore,
    general_feedback: generalFeedback,
    submitted_at: new Date().toISOString(),
  }, { onConflict: 'response_id,reviewer_id' }).select('id').single()
  if (reviewError || !review) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=review_failed`)

  await supabase.from('human_criterion_scores').delete().eq('human_review_id', review.id)
  const { error: criteriaError } = await supabase.from('human_criterion_scores').insert(criterionScores.map(({ criterion, score, feedback }) => ({
    human_review_id: review.id,
    criterion_id: criterion.id,
    score,
    feedback,
  })))
  if (criteriaError) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=review_criteria_failed`)

  let moderationReason: string | null = manualModeration ? 'Reviewer requested moderation.' : null
  let triggerType: 'manual' | 'ai_human_disagreement' = 'manual'

  if (!moderationReason && aiRunId && context.rubricVersion.moderation_threshold_points !== null) {
    const { data: aiRun } = await supabase.from('ai_grading_runs').select('proposed_total_score, status').eq('id', aiRunId).eq('response_id', responseId).maybeSingle()
    if (aiRun?.status === 'completed' && aiRun.proposed_total_score !== null) {
      const difference = Math.abs(Number(aiRun.proposed_total_score) - totalScore)
      if (difference >= Number(context.rubricVersion.moderation_threshold_points)) {
        moderationReason = `AI–human absolute score difference is ${difference.toFixed(3)} points, meeting the rubric moderation threshold.`
        triggerType = 'ai_human_disagreement'
      }
    }
  }

  if (moderationReason) {
    const { data: openCase } = await supabase.from('moderation_cases').select('id').eq('response_id', responseId).in('status', ['open', 'in_review']).maybeSingle()
    if (!openCase) {
      await supabase.from('moderation_cases').insert({
        response_id: responseId,
        ai_grading_run_id: aiRunId,
        human_review_id: review.id,
        trigger_type: triggerType,
        reason: moderationReason,
        opened_by: userId,
      })
    }
  }

  revalidatePath(`/programs/${programId}/assessment/grading/${responseId}`)
  revalidatePath(`/programs/${programId}/assessment/grading`)
}

export async function approveHumanFinalScore(programId: string, responseId: string, humanReviewId: string) {
  const { supabase, userId } = await requireUser()
  const { data: review } = await supabase.from('human_reviews').select('id, response_id, total_score, max_score, status').eq('id', humanReviewId).eq('response_id', responseId).maybeSingle()
  if (!review || review.status !== 'submitted') redirect(`/programs/${programId}/assessment/grading/${responseId}?error=review_not_ready`)

  const { data: openModeration } = await supabase.from('moderation_cases').select('id').eq('response_id', responseId).in('status', ['open', 'in_review']).maybeSingle()
  if (openModeration) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=moderation_required`)

  const { error } = await supabase.from('final_score_decisions').upsert({
    response_id: responseId,
    decision_source: 'human_review',
    human_review_id: humanReviewId,
    moderation_case_id: null,
    final_score: review.total_score,
    max_score: review.max_score,
    rationale: 'Approved from submitted human rubric review.',
    decided_by: userId,
  }, { onConflict: 'response_id' })
  if (error) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=final_approval_failed`)
  revalidatePath(`/programs/${programId}/assessment/grading/${responseId}`)
  revalidatePath(`/programs/${programId}/assessment/grading`)
}

export async function resolveModeration(programId: string, responseId: string, moderationCaseId: string, formData: FormData) {
  const score = Number(formData.get('resolved_score') ?? NaN)
  const note = String(formData.get('resolution_note') ?? '').trim()
  if (!Number.isFinite(score) || score < 0 || !note) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=invalid_moderation`)

  const { supabase, userId } = await requireUser()
  const { data: moderation } = await supabase.from('moderation_cases').select('id, human_review_id, status').eq('id', moderationCaseId).eq('response_id', responseId).maybeSingle()
  if (!moderation || !['open', 'in_review'].includes(moderation.status) || !moderation.human_review_id) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=moderation_not_ready`)
  const { data: review } = await supabase.from('human_reviews').select('id, max_score').eq('id', moderation.human_review_id).maybeSingle()
  if (!review || score > Number(review.max_score)) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=invalid_moderation_score`)

  const { error: caseError } = await supabase.from('moderation_cases').update({
    status: 'resolved',
    resolved_by: userId,
    resolved_score: score,
    resolution_note: note,
    resolved_at: new Date().toISOString(),
  }).eq('id', moderationCaseId)
  if (caseError) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=moderation_update_failed`)

  const { error: finalError } = await supabase.from('final_score_decisions').upsert({
    response_id: responseId,
    decision_source: 'moderation',
    human_review_id: moderation.human_review_id,
    moderation_case_id: moderationCaseId,
    final_score: score,
    max_score: review.max_score,
    rationale: note,
    decided_by: userId,
  }, { onConflict: 'response_id' })
  if (finalError) redirect(`/programs/${programId}/assessment/grading/${responseId}?error=moderation_final_failed`)
  revalidatePath(`/programs/${programId}/assessment/grading/${responseId}`)
  revalidatePath(`/programs/${programId}/assessment/grading`)
}

async function loadGradingContext(supabase: Awaited<ReturnType<typeof requireUser>>['supabase'], responseId: string) {
  const { data: response } = await supabase.from('student_responses').select('id, attempt_id, question_version_id, text_response').eq('id', responseId).maybeSingle()
  if (!response || response.text_response === null) return null
  const { data: mapping } = await supabase.from('question_rubrics').select('rubric_version_id').eq('question_version_id', response.question_version_id).maybeSingle()
  if (!mapping) return null
  const [{ data: rubricVersion }, { data: criteria }, { data: questionVersion }] = await Promise.all([
    supabase.from('rubric_versions').select('id, instructions, reference_answer, moderation_threshold_points').eq('id', mapping.rubric_version_id).maybeSingle(),
    supabase.from('rubric_criteria').select('id, criterion_code, title, description, scoring_guidance, max_score, position').eq('rubric_version_id', mapping.rubric_version_id).order('position'),
    supabase.from('question_versions').select('id, stem').eq('id', response.question_version_id).maybeSingle(),
  ])
  if (!rubricVersion || !questionVersion || !(criteria ?? []).length) return null
  return { response, rubricVersion, criteria: (criteria ?? []) as CriterionRow[], questionVersion }
}
