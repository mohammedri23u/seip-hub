export type AssessmentDeliveryItem = {
  question_version_id: string
  question_type: string
  options: Array<{ id: string }>
}

export type AssessmentResponseValues = {
  selected_option_id: string | null
  selected_option_ids: string[] | null
  text_response: string | null
}
export type AssessmentResponseRow = AssessmentResponseValues & {
  attempt_id: string
  question_version_id: string
}

export class InvalidAssessmentResponse extends Error {}

function optionIdsFromForm(item: AssessmentDeliveryItem, formData: FormData) {
  const field = `q_${item.question_version_id}`
  const values = formData.getAll(field)
  if (values.some((value) => typeof value !== 'string')) {
    throw new InvalidAssessmentResponse('Assessment options must be submitted as text identifiers.')
  }

  const submitted = (values as string[]).map((value) => value.trim()).filter(Boolean)
  const deliveredIds = new Set(item.options.map((option) => option.id))
  if (submitted.some((id) => !deliveredIds.has(id))) {
    throw new InvalidAssessmentResponse('A submitted option was not included in the assessment delivery.')
  }

  const selected = new Set(submitted)
  return item.options.map((option) => option.id).filter((id) => selected.has(id))
}

/** Converts one delivered question into mutually compatible database response fields. */
export function assessmentResponseValues(item: AssessmentDeliveryItem, formData: FormData): AssessmentResponseValues | null {
  if (item.question_type === 'single_best_answer' || item.question_type === 'true_false') {
    const selected = optionIdsFromForm(item, formData)
    if (selected.length === 0) return null
    if (selected.length !== 1) throw new InvalidAssessmentResponse('Only one option may be selected for this question.')
    return { selected_option_id: selected[0], selected_option_ids: null, text_response: null }
  }

  if (item.question_type === 'multiple_response') {
    return {
      selected_option_id: null,
      selected_option_ids: optionIdsFromForm(item, formData),
      text_response: null,
    }
  }

  const value = formData.get(`q_${item.question_version_id}`)
  const textResponse = typeof value === 'string' ? value.trim() : ''
  return { selected_option_id: null, selected_option_ids: null, text_response: textResponse }
}

/** Validates the complete submission before the server writes any response row. */
export function assessmentResponseRows(
  items: AssessmentDeliveryItem[],
  formData: FormData,
  attemptId: string,
): AssessmentResponseRow[] {
  return items.flatMap((item) => {
    const values = assessmentResponseValues(item, formData)
    return values ? [{ attempt_id: attemptId, question_version_id: item.question_version_id, ...values }] : []
  })
}
