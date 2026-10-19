/** Shared with the research pack: THE_TEN_RESEARCH_AI_1.0. No provider or database access. */
export const SHADOW_CONTRACT_VERSION = 'THE_TEN_RESEARCH_AI_1.0'
export const reviewFlags = ['SAFETY_CONTRADICTION', 'AMBIGUOUS', 'UNREADABLE', 'OUT_OF_SCOPE', 'PROMPT_INJECTION', 'LANGUAGE_REVIEW', 'HUMAN_REVIEW'] as const
export type ShadowInput = {
  response_id: string; item_id: string; item_version: string; question: string
  permitted_languages: string[]; rubric_version: string
  rubric_0: string; rubric_1: string; rubric_2: string; criterion_ids: string[]
  criteria: { criterion_id: string; description: string; points: number }[]
  acceptable_alternatives: string[]; critical_contradictions: string[]; student_response: string
}
export type ShadowOutput = {
  response_id: string; status: 'scored' | 'abstain'; proposed_score: 0 | 1 | 2 | null
  evidence_quotes: string[]; matched_criteria: string[]; missing_criteria: string[]
  review_flags: (typeof reviewFlags)[number][]; draft_feedback: string; reason_for_abstention: string | null
}

// This is a deliberately non-clinical rehearsal. It is never a learner response or research result.
export const syntheticShadowInput: ShadowInput = {
  response_id: 'SYNTHETIC-DEMO-001', item_id: 'DEMO-REASONING-01', item_version: 'demo-1',
  question: 'What should a learner do when new information challenges an initial explanation?',
  permitted_languages: ['English', 'Arabic'], rubric_version: 'demo-1',
  rubric_0: 'Neither revising the explanation nor giving a reason is expressed.',
  rubric_1: 'Expresses either revising the explanation or explaining the change, but not both.',
  rubric_2: 'Expresses revising the explanation and explaining why the new evidence changes it.',
  criterion_ids: ['REVISE', 'EXPLAIN'], acceptable_alternatives: ['Equivalent wording in Arabic or English'],
  criteria: [{ criterion_id: 'REVISE', description: 'Expresses revising the initial explanation', points: 1 }, { criterion_id: 'EXPLAIN', description: 'Explains why new evidence changes the explanation', points: 1 }],
  critical_contradictions: ['Ignore new evidence in order to preserve the first answer'],
  student_response: 'I would revise my initial explanation and explain why the new evidence changes it.',
}
export const syntheticShadowOutput: ShadowOutput = {
  response_id: syntheticShadowInput.response_id, status: 'scored', proposed_score: 2,
  evidence_quotes: ['revise my initial explanation', 'explain why the new evidence changes it'],
  matched_criteria: ['REVISE', 'EXPLAIN'], missing_criteria: [], review_flags: ['HUMAN_REVIEW'],
  draft_feedback: 'You described revising your explanation and giving an evidence-based reason.', reason_for_abstention: null,
}

const outputKeys = ['response_id', 'status', 'proposed_score', 'evidence_quotes', 'matched_criteria', 'missing_criteria', 'review_flags', 'draft_feedback', 'reason_for_abstention']
type Validation = { valid: true; value: ShadowOutput } | { valid: false; errors: string[] }

export function validateShadowOutput(raw: unknown, input: ShadowInput): Validation {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { valid: false, errors: ['المخرج يجب أن يكون JSON object واحدًا.'] }
  const value = raw as Record<string, unknown>
  const errors: string[] = []
  if (Object.keys(value).length !== outputKeys.length || outputKeys.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !outputKeys.includes(key))) errors.push('حقول المخرج لا تطابق Contract v1.0 بالضبط.')
  if (value.response_id !== input.response_id) errors.push('Response ID لا يطابق الإجابة التي أُرسلت.')
  if (value.status !== 'scored' && value.status !== 'abstain') errors.push('Status يجب أن يكون scored أو abstain.')
  if (value.status === 'scored' && ![0, 1, 2].includes(value.proposed_score as number)) errors.push('Proposed score يجب أن يكون عددًا صحيحًا: 0 أو 1 أو 2.')
  if (value.status === 'abstain' && value.proposed_score !== null) errors.push('Abstention يبقى null، ولا يُحوّل إلى صفر.')
  for (const key of ['evidence_quotes', 'matched_criteria', 'missing_criteria', 'review_flags']) {
    if (!Array.isArray(value[key]) || !(value[key] as unknown[]).every(item => typeof item === 'string' && item.trim().length > 0)) errors.push(`${key} يجب أن يكون قائمة نصوص غير فارغة.`)
    else if (new Set(value[key] as string[]).size !== (value[key] as string[]).length) errors.push(`${key} يحتوي على تكرار.`)
  }
  if (Array.isArray(value.evidence_quotes)) for (const quote of value.evidence_quotes) {
    if (typeof quote === 'string' && (!quote.trim() || !input.student_response.includes(quote))) errors.push('Evidence quote غير موجود حرفيًا في الإجابة الأصلية.')
  }
  for (const key of ['matched_criteria', 'missing_criteria']) if (Array.isArray(value[key]) && (value[key] as unknown[]).some(id => typeof id !== 'string' || !input.criterion_ids.includes(id))) errors.push(`${key} يحتوي على Criterion ID غير معتمد.`)
  if (Array.isArray(value.matched_criteria) && Array.isArray(value.missing_criteria) && value.matched_criteria.some(id => (value.missing_criteria as unknown[]).includes(id))) errors.push('المعيار نفسه لا يمكن أن يكون متحققًا ومفقودًا معًا.')
  if (Array.isArray(value.review_flags) && value.review_flags.some(flag => !reviewFlags.includes(flag as typeof reviewFlags[number]))) errors.push('Review flag غير معتمد.')
  if (typeof value.draft_feedback !== 'string' || value.draft_feedback.length > 1200) errors.push('Draft feedback يجب أن يكون نصًا حتى 1200 حرف.')
  if (value.status === 'abstain' && (typeof value.reason_for_abstention !== 'string' || !value.reason_for_abstention.trim())) errors.push('Abstention يحتاج إلى سبب واضح للإحالة البشرية.')
  if (value.status === 'scored' && value.reason_for_abstention !== null) errors.push('الإجابة المصححة تحمل reason_for_abstention بقيمة null.')
  if (value.status === 'scored' && input.student_response.trim() && Array.isArray(value.evidence_quotes) && value.evidence_quotes.length === 0) errors.push('الإجابة المصححة تحتاج Evidence quote من الإجابة.')
  return errors.length ? { valid: false, errors: [...new Set(errors)] } : { valid: true, value: value as ShadowOutput }
}
