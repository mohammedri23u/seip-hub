import type { FeedbackOutcome } from './feedback'

export const casePhases = ['Intro', 'History', 'Examination', 'Investigations', 'Management', 'Summary'] as const
export type CasePhase = typeof casePhases[number]
export type FormativeFeedback = {
  questionId: string
  optionId: string
  outcome: FeedbackOutcome
  explanation: string
}
export type FormativeAnswerState = {
  status: 'idle' | 'selected' | 'submitting' | 'review'
  selected: string
  feedback: FormativeFeedback | null
  error: string | null
}
export type FormativeAnswerEvent =
  | { type: 'select'; optionId: string }
  | { type: 'submit' }
  | { type: 'resolve'; feedback: FormativeFeedback }
  | { type: 'fail' }

export const initialAnswerState: FormativeAnswerState = { status: 'idle', selected: '', feedback: null, error: null }

export function formativeAnswerReducer(state: FormativeAnswerState, event: FormativeAnswerEvent): FormativeAnswerState {
  switch (event.type) {
    case 'select': return state.status === 'submitting' || state.status === 'review' ? state : { ...state, status: 'selected', selected: event.optionId, error: null }
    case 'submit': return state.status !== 'selected' || !state.selected ? state : { ...state, status: 'submitting', error: null }
    case 'resolve': return state.status !== 'submitting' || state.selected !== event.feedback.optionId ? state : { ...state, status: 'review', feedback: event.feedback, error: null }
    case 'fail': return state.status !== 'submitting' ? state : { ...state, status: 'selected', error: 'Your answer could not be confirmed. Your selection is still here. Try again.' }
  }
}

export function validFormativeFeedback(feedback: FormativeFeedback, questionId: string, optionId: string) {
  return feedback?.questionId === questionId && feedback.optionId === optionId
    && ['correct', 'incorrect', 'partial'].includes(feedback.outcome)
    && typeof feedback.explanation === 'string' && feedback.explanation.trim().length > 0
}
