import type { AttemptSnapshot } from './attempt-status'
export type LearnerRow = { attempt_summaries?: AttemptSnapshot[]; learner_id: string; full_name: string; student_id: string | null; groups: string[]; submitted_attempts: number; in_progress_attempts: number; pending_reviews: number; pending_approval: number }
export type GradingItem = {
 position: number; question_version_id: string; question_code: string; question_type: string; marks: number; stem: string
 response_id: string | null; response_text: string | null; selected_option_id: string | null; selected_option_ids: string[] | null
 has_rubric: boolean; options: { id: string; text: string; is_correct: boolean }[]
 machine_score: number | null; machine_max: number | null; calculated_mcq: number | null
 final_score: number | null; final_max: number | null; review_id: string | null; review_score: number | null; review_max: number | null
 my_review_status: string | null; moderation_required: boolean
}
export type GradingAttempt = { summary?: AttemptSnapshot; id: string; assessment_id: string; title: string; status: string; started_at: string; submitted_at: string | null; phase: 'pre' | 'post' | 'practice'; duration_minutes: number | null; released_at: string | null; released_score: number | null; released_max: number | null; items: GradingItem[] }
export type LearnerWorkspace = { learner: Pick<LearnerRow, 'learner_id' | 'full_name' | 'student_id'>; assigned_forms: { cohort_id: string; pre_assessment_id: string | null; post_assessment_id: string | null; sequence: string | null }[]; attempts: GradingAttempt[] }

// Normalize each raw rubric score to its assessment-item weight exactly once.
// Unknown/unreviewed answers remain pending; they are never silently treated as zero.
export function weightedScore(score: number | null, max: number | null, marks: number): number | null {
 if (score === null || max === null) return null
 const s = Number(score), m = Number(max), w = Number(marks)
 if (![s, m, w].every(Number.isFinite) || m <= 0 || w < 0 || s < 0 || s > m) return null
 return s / m * w
}
export function gradingSummary(items: GradingItem[]) {
 let known = 0, approved = 0, pending = 0, awaitingApproval = 0, moderation = 0, recorded = 0
 const max = items.reduce((sum, item) => sum + Number(item.marks), 0)
 for (const item of items) {
  if (item.moderation_required) moderation++
  const final = weightedScore(item.final_score, item.final_max, item.marks)
  const machine = weightedScore(item.machine_score, item.machine_max, item.marks)
  const human = weightedScore(item.review_score, item.review_max, item.marks)
  if (final !== null || machine !== null) {
   const score = final ?? machine ?? 0
   known += score; approved += score; recorded++
  } else if (human !== null) { known += human; awaitingApproval++ }
  else if (item.calculated_mcq !== null && Number.isFinite(Number(item.calculated_mcq))) { known += Number(item.calculated_mcq); awaitingApproval++ }
  else pending++
 }
 return { known, approved, max, pending, awaitingApproval, moderation, recorded, complete: items.length > 0 && recorded === items.length && moderation === 0 }
}
export function scoreText(value: number) { return new Intl.NumberFormat('en', { maximumFractionDigits: 3 }).format(value) }
export function normaliseSearch(value: string) { return value.normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').toLocaleLowerCase().trim() }
