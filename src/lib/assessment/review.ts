import type { requireUser } from '@/lib/auth/require-user'

export type ReviewDetail = {
  program_id: string; response_id: string; assessment_title: string; question_code: string
  stem: string; response_text: string; rubric_version_id: string; rubric_instructions: string | null; reference_answer: string | null
  moderation_threshold_points: number | null
  criteria: { id: string; code: string; title: string; description: string | null; scoring_guidance: string | null; max_score: number; position: number }[]
  my_review: { id: string; status: string; total_score: number; max_score: number; general_feedback: string | null; criterion_scores: Record<string, number> } | null
  final_decision: { id: string; score: number; max_score: number; source: string } | null
}

export async function reviewDetail(supabase: Awaited<ReturnType<typeof requireUser>>['supabase'], programId: string, responseId: string) {
  const { data, error } = await supabase.rpc('ten_review_detail', { target_response_id: responseId })
  if (error || !data || data.program_id !== programId) return null
  return data as ReviewDetail
}
