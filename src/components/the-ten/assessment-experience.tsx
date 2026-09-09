'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { AnswerOption } from './answer-option'
import { ProgressTracker } from './progress-tracker'
import { QuestionCard } from './question-card'

type DeliveryOption = { id: string; text: string; position: number }
type DeliveryItem = {
  question_version_id: string
  position: number
  marks: number
  question_type: string
  stem: string
  options: DeliveryOption[]
}

type AnswerValue = string | string[]

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 rounded-[16px] bg-[#D8A94E] px-5 py-3 text-sm font-black text-[#17363A] transition hover:-translate-y-0.5 hover:bg-[#F2D99B] disabled:cursor-wait disabled:opacity-60 motion-reduce:transform-none motion-reduce:transition-none"
    >
      {pending ? 'Submitting securely…' : 'Confirm and submit assessment'}
    </button>
  )
}

function AssessmentFields({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus()
  return <fieldset disabled={pending} aria-busy={pending} className="min-w-0 space-y-5"><legend className="sr-only">Assessment responses</legend>{children}<span className="sr-only" role="status">{pending ? 'Submitting your assessment. Please wait.' : ''}</span></fieldset>
}

export function AssessmentExperience({
  items,
  action,
}: {
  items: DeliveryItem[]
  action: (formData: FormData) => Promise<void>
}) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [confirming, setConfirming] = useState(false)
  const confirmationRef = useRef<HTMLElement>(null)

  const answered = useMemo(
    () => items.reduce((count, item) => {
      const value = answers[item.question_version_id]
      return count + ((Array.isArray(value) ? value.length > 0 : Boolean(value?.trim())) ? 1 : 0)
    }, 0),
    [answers, items],
  )
  const unanswered = useMemo(
    () => items.filter((item) => {
      const value = answers[item.question_version_id]
      return Array.isArray(value) ? value.length === 0 : !value?.trim()
    }),
    [answers, items],
  )
  const firstWrittenIndex = useMemo(
    () => items.findIndex((item) => !['single_best_answer', 'true_false', 'multiple_response'].includes(item.question_type)),
    [items],
  )

  useEffect(() => {
    if (confirming) confirmationRef.current?.focus()
  }, [confirming])

  function requestConfirmation(event: FormEvent<HTMLFormElement>) {
    if (confirming) return
    event.preventDefault()
    setConfirming(true)
  }

  return (
    <form action={action} onSubmit={requestConfirmation} className="mx-auto max-w-4xl space-y-5">
      <AssessmentFields>
      <div className="sticky top-3 z-10">
        <ProgressTracker total={items.length} answered={answered} />
      </div>

      {items.map((item, index) => {
        const fieldName = `q_${item.question_version_id}`
        const value = answers[item.question_version_id] ?? (item.question_type === 'multiple_response' ? [] : '')
        const isChoice = item.question_type === 'single_best_answer' || item.question_type === 'true_false'
        const isMultipleResponse = item.question_type === 'multiple_response'
        const isWritten = !isChoice && !isMultipleResponse
        const writtenText = typeof value === 'string' ? value : ''

        return (
          <div key={item.question_version_id} className="space-y-5">
            {index === firstWrittenIndex ? (
              <section className="overflow-hidden rounded-[28px] border border-[#D8A94E] bg-[#17363A] text-white shadow-[0_18px_55px_rgba(23,54,58,0.16)]">
                <div className="h-1.5 bg-[#D8A94E]" />
                <div className="p-5 sm:p-6">
                  <p className="text-xs font-black tracking-[.16em] text-[#F2D99B]">PART II · GENERATE, DON’T RECOGNIZE</p>
                  <h2 className="mt-2 font-serif text-2xl font-bold">Brief clinical-reasoning responses</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#D9E6E3]">The next cases ask you to produce the reasoning yourself. Write the key discriminating features, probability update, next step or safety priorities requested by the prompt. Concise reasoning is better than a long unfocused answer.</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#F2D99B]"><span className="rounded-full border border-white/15 px-3 py-2">4 short cases</span><span className="rounded-full border border-white/15 px-3 py-2">Human-reviewed rubrics</span><span className="rounded-full border border-white/15 px-3 py-2">AI, if used, is advisory only</span></div>
                </div>
              </section>
            ) : null}

            <QuestionCard number={item.position} marks={item.marks} stem={item.stem}>
              {isChoice ? (
                <div className="space-y-3" role="radiogroup" aria-label={`Question ${item.position} options`}>
                  {item.options.map((option) => {
                    const selected = value === option.id
                    return (
                      <AnswerOption
                        key={option.id}
                        name={fieldName}
                        value={option.id}
                        label={String.fromCharCode(64 + option.position)}
                        text={option.text}
                        checked={selected}
                        state={selected ? 'selected' : 'idle'}
                        onChange={() => setAnswers((current) => ({ ...current, [item.question_version_id]: option.id }))}
                      />
                    )
                  })}
                </div>
              ) : isMultipleResponse ? (
                <fieldset className="space-y-3" aria-describedby={`multiple-help-${item.question_version_id}`}>
                  <legend className="sr-only">Question {item.position} options</legend>
                  <p id={`multiple-help-${item.question_version_id}`} className="text-sm font-semibold text-[#426064]">Select all options that apply.</p>
                  {item.options.map((option) => {
                    const selectedIds = Array.isArray(value) ? value : []
                    const selected = selectedIds.includes(option.id)
                    return <AnswerOption
                      key={option.id}
                      type="checkbox"
                      name={fieldName}
                      value={option.id}
                      label={String.fromCharCode(64 + option.position)}
                      text={option.text}
                      checked={selected}
                      state={selected ? 'selected' : 'idle'}
                      onChange={() => setAnswers((current) => ({
                        ...current,
                        [item.question_version_id]: selected
                          ? selectedIds.filter((id) => id !== option.id)
                          : [...selectedIds, option.id],
                      }))}
                    />
                  })}
                </fieldset>
              ) : isWritten ? (
                <div>
                  <div className="mb-2 flex items-end justify-between gap-3">
                    <label htmlFor={fieldName} className="block text-xs font-black tracking-[0.12em] text-[#426064]">YOUR REASONING</label>
                    <span className="text-xs font-semibold text-[#7A837F]" aria-live="polite">{countWords(writtenText)} words</span>
                  </div>
                  <textarea
                    id={fieldName}
                    name={fieldName}
                    rows={6}
                    value={writtenText}
                    onChange={(event) => setAnswers((current) => ({ ...current, [item.question_version_id]: event.target.value }))}
                    className="w-full rounded-[18px] border border-[#CFC2AA] bg-[#FFFDF8] p-4 text-[15px] leading-7 text-[#17363A] outline-none transition placeholder:text-[#8A918C] focus:border-[#1F6668] focus:ring-2 focus:ring-[#1F6668]/15 motion-reduce:transition-none"
                    placeholder="Answer the reasoning task directly. Aim for a few focused sentences, not an essay."
                  />
                  <p className="mt-2 text-xs leading-5 text-[#6B7774]">There is no speed bonus. Use the clinical information given and make your reasoning explicit.</p>
                </div>
              ) : null}
            </QuestionCard>
          </div>
        )
      })}

      {!confirming ? <section className="rounded-[28px] bg-[#17363A] p-5 text-[#FFFDF8] shadow-[0_18px_55px_rgba(23,54,58,0.18)] sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full border border-[#D8A94E]/60 bg-[#D8A94E]/10 text-sm font-black text-[#F2D99B]">!</div>
          <div>
            <h3 className="font-bold">Final submission</h3>
            <p className="mt-1 text-sm leading-6 text-[#D9E6E3]">
              Submitting locks this attempt. Written responses continue into the human-supervised grading workflow; unanswered questions remain unanswered.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setConfirming(true)} className="mt-4 min-h-12 w-full rounded-[16px] bg-[#FFFDF8] px-5 py-3 text-sm font-black text-[#17363A] transition hover:-translate-y-0.5 hover:bg-white motion-reduce:transform-none motion-reduce:transition-none">
          Review and confirm submission
        </button>
      </section> : <section ref={confirmationRef} tabIndex={-1} role="region" aria-labelledby="submission-confirmation-title" aria-describedby="submission-confirmation-summary" className="rounded-[28px] border-2 border-[#D8A94E] bg-[#17363A] p-5 text-[#FFFDF8] shadow-[0_18px_55px_rgba(23,54,58,0.18)] sm:p-6">
        <p className="text-xs font-black tracking-[0.15em] text-[#F2D99B]">FINAL CONFIRMATION</p>
        <h3 id="submission-confirmation-title" className="mt-2 text-xl font-bold">Lock and submit this attempt?</h3>
        <p id="submission-confirmation-summary" className="mt-2 text-sm leading-6 text-[#D9E6E3]">
          You answered {answered} of {items.length} questions. {unanswered.length ? `${unanswered.length} ${unanswered.length === 1 ? 'question is' : 'questions are'} unanswered and will remain unanswered.` : 'Every question has an answer.'} Submitting permanently locks this attempt.
        </p>
        {unanswered.length > 0 ? <p className="mt-3 text-sm font-bold text-[#F2D99B]">Unanswered: {unanswered.map((item) => `Question ${item.position}`).join(', ')}</p> : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <SubmitButton />
          <button type="button" onClick={() => setConfirming(false)} className="min-h-12 rounded-[16px] border border-[#D9E6E3]/50 px-5 py-3 text-sm font-black text-white hover:bg-white/10">Return to answers</button>
        </div>
      </section>}
      </AssessmentFields>
    </form>
  )
}

function countWords(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}
