'use client'
import { useReducer, useRef } from 'react'
import { AnswerOption } from '../answer-option'
import { FeedbackPanel } from '../feedback-panel'
import { CharacterGuide } from '../character-guide'
import type { TheTenCharacter } from '@/lib/the-ten/assets'
import { feedbackPresentation } from '@/lib/the-ten/feedback'
import { formativeAnswerReducer, initialAnswerState, validFormativeFeedback, type FormativeFeedback } from '@/lib/the-ten/case-flow'

export type FormativeQuestionData = {
  id: string; prompt: string; options: { id: string; text: string }[]
  feedback?: FormativeFeedback
  lockedReason?: string
}

/** The adapter supplies confirmed formative feedback. This component contains no answer key. */
export function FormativeQuestion({ question, character, submitAnswer, onBusy, onFeedback }: {
  question: FormativeQuestionData; character?: TheTenCharacter
  submitAnswer: (questionId: string, optionId: string) => Promise<FormativeFeedback>
  onBusy?: (busy: boolean) => void
  onFeedback?: (feedback: FormativeFeedback) => void
}) {
  const saved = question.feedback
  const [state, dispatch] = useReducer(formativeAnswerReducer, saved && validFormativeFeedback(saved, question.id, saved.optionId)
    ? { status: 'review', selected: saved.optionId, feedback: saved, error: null }
    : initialAnswerState)
  const inFlight = useRef(false)
  const locked = Boolean(question.lockedReason) || state.status === 'review' || state.status === 'submitting'
  const presentation = state.feedback ? feedbackPresentation[state.feedback.outcome] : null

  async function submit() {
    if (inFlight.current || state.status !== 'selected' || locked) return
    inFlight.current = true
    dispatch({ type: 'submit' })
    onBusy?.(true)
    try {
      const feedback = await submitAnswer(question.id, state.selected)
      if (!validFormativeFeedback(feedback, question.id, state.selected)) throw new Error('Mismatched feedback')
      dispatch({ type: 'resolve', feedback })
      onFeedback?.(feedback)
    } catch {
      dispatch({ type: 'fail' })
    } finally {
      inFlight.current = false
      onBusy?.(false)
    }
  }

  return <section aria-label="Formative question" aria-busy={state.status === 'submitting'}>
    <fieldset className="ten-formative-options"><legend>{question.prompt}</legend>{question.options.map((option, index) => <AnswerOption key={option.id} name={`case_${question.id}`} value={option.id} label={String.fromCharCode(65 + index)} text={option.text}
      checked={state.selected === option.id} disabled={locked}
      state={state.selected === option.id ? state.feedback?.outcome ?? (state.status === 'submitting' ? 'submitting' : 'selected') : 'idle'}
      onChange={() => dispatch({ type: 'select', optionId: option.id })} />)}</fieldset>
    {question.lockedReason && <p className="ten-notice">Locked: {question.lockedReason}</p>}
    {state.error && <p role="alert" className="ten-notice ten-notice-error">{state.error}</p>}
    <div aria-live="polite" aria-atomic="true">{state.status === 'submitting' && <p>Confirming your answer…</p>}{state.feedback && presentation && <div className="ten-feedback-sequence"><FeedbackPanel state={state.feedback.outcome} title={presentation.title}>{state.feedback.explanation}</FeedbackPanel></div>}</div>
    {state.status !== 'review' && <button type="button" className="ten-action" disabled={locked || !state.selected} onClick={submit}>{state.status === 'submitting' ? 'Submitting…' : 'Confirm answer'}</button>}
    {character && <div className="ten-spaced"><CharacterGuide character={character} reaction={presentation?.reaction ?? (state.status === 'submitting' ? 'thinking' : question.lockedReason ? 'locked' : 'guide')} message={state.feedback ? 'Take a moment with the explanation before continuing.' : 'Consider the evidence before you commit to an answer.'} /></div>}
  </section>
}
