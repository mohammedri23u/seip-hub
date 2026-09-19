'use client'

import { useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { AnswerOption } from './answer-option'

export type ProgressiveDeliveryItem = {
  question_version_id: string
  position: number
  marks: number
  question_type: string
  stem: string
  options: Array<{ id: string; text: string; position: number }>
}

export type ProgressiveDeliveryStep = {
  assessment_id: string
  attempt_id: string
  title: string
  description: string | null
  duration_minutes: number | null
  answered: number
  total: number
  position: number
  item: ProgressiveDeliveryItem
}

function CommitButton({ ready, finalStage }: { ready: boolean; finalStage: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={!ready || pending}
      className="min-h-12 rounded-[16px] bg-[#D8A94E] px-6 py-3 text-sm font-black text-[#17363A] shadow-[0_12px_30px_rgba(216,169,78,0.18)] transition hover:-translate-y-0.5 hover:bg-[#F2D99B] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none"
    >
      {pending ? 'Committing securely…' : finalStage ? 'Commit final stage →' : 'Commit this stage →'}
    </button>
  )
}

export function ProgressiveAssessmentStep({
  step,
  action,
}: {
  step: ProgressiveDeliveryStep
  action: (formData: FormData) => Promise<void>
}) {
  const [value, setValue] = useState<string | string[]>(step.item.question_type === 'multiple_response' ? [] : '')
  const [confirmed, setConfirmed] = useState(false)
  const isChoice = step.item.question_type === 'single_best_answer' || step.item.question_type === 'true_false'
  const isMultiple = step.item.question_type === 'multiple_response'
  const isWritten = !isChoice && !isMultiple
  const ready = useMemo(() => Array.isArray(value) ? value.length > 0 : value.trim().length > 0, [value])
  const finalStage = step.position === step.total
  const progress = Math.round((step.answered / step.total) * 100)

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-[#CFC2AA] bg-[#FFFDF8] shadow-[0_18px_55px_rgba(23,54,58,0.08)]">
        <div className="h-1.5 bg-[#D8A94E]" />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-[#1F6668]">PROGRESSIVE DISCLOSURE · LOCKED SEQUENCE</p>
              <h2 className="mt-2 font-serif text-2xl font-bold text-[#17363A]">Stage {step.position} of {step.total}</h2>
            </div>
            <span className="rounded-full border border-[#D8CCB6] bg-white px-3 py-2 text-xs font-black text-[#526C6E]">{step.item.marks} marks</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E7DED0]" aria-label={`${step.answered} of ${step.total} stages committed`}>
            <div className="h-full rounded-full bg-[#1F6668] transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-sm leading-6 text-[#5D7172]">{step.answered} stage{step.answered === 1 ? '' : 's'} committed. Future information remains hidden until you submit this response.</p>
        </div>
      </section>

      <form action={action} className="space-y-5">
        <section className="rounded-[30px] border border-[#CFC2AA] bg-[#FFFDF8] p-6 shadow-[0_18px_55px_rgba(23,54,58,0.08)] sm:p-8">
          <p className="text-xs font-black tracking-[0.14em] text-[#8B6A2B]">CURRENT STAGE</p>
          <p className="mt-3 whitespace-pre-wrap text-[17px] font-semibold leading-8 text-[#17363A]">{step.item.stem}</p>

          <div className="mt-6 border-t border-[#E5DCCB] pt-6">
            {isChoice ? (
              <div className="space-y-3" role="radiogroup" aria-label={`Stage ${step.position} options`}>
                {step.item.options.map((option) => {
                  const selected = value === option.id
                  return <AnswerOption
                    key={option.id}
                    name="response"
                    value={option.id}
                    label={String.fromCharCode(64 + option.position)}
                    text={option.text}
                    checked={selected}
                    state={selected ? 'selected' : 'idle'}
                    onChange={() => { setValue(option.id); setConfirmed(false) }}
                  />
                })}
              </div>
            ) : isMultiple ? (
              <fieldset className="space-y-3">
                <legend className="mb-3 text-sm font-bold text-[#426064]">Select all that apply.</legend>
                {step.item.options.map((option) => {
                  const selectedIds = Array.isArray(value) ? value : []
                  const selected = selectedIds.includes(option.id)
                  return <AnswerOption
                    key={option.id}
                    type="checkbox"
                    name="response"
                    value={option.id}
                    label={String.fromCharCode(64 + option.position)}
                    text={option.text}
                    checked={selected}
                    state={selected ? 'selected' : 'idle'}
                    onChange={() => {
                      setValue(selected ? selectedIds.filter((id) => id !== option.id) : [...selectedIds, option.id])
                      setConfirmed(false)
                    }}
                  />
                })}
              </fieldset>
            ) : isWritten ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="progressive-response" className="text-xs font-black tracking-[0.12em] text-[#426064]">YOUR COMMITTED REASONING</label>
                  <span className="text-xs font-semibold text-[#7A837F]">{typeof value === 'string' && value.trim() ? value.trim().split(/\s+/).length : 0} words</span>
                </div>
                <textarea
                  id="progressive-response"
                  name="response"
                  rows={7}
                  value={typeof value === 'string' ? value : ''}
                  onChange={(event) => { setValue(event.target.value); setConfirmed(false) }}
                  className="w-full rounded-[18px] border border-[#CFC2AA] bg-white p-4 text-[15px] leading-7 text-[#17363A] outline-none transition placeholder:text-[#8A918C] focus:border-[#1F6668] focus:ring-2 focus:ring-[#1F6668]/15 motion-reduce:transition-none"
                  placeholder="Answer only the current reasoning task. Future information is intentionally hidden."
                />
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-[28px] bg-[#17363A] p-5 text-[#FFFDF8] shadow-[0_18px_55px_rgba(23,54,58,0.18)] sm:p-6">
          <p className="text-xs font-black tracking-[0.15em] text-[#F2D99B]">COMMIT BEFORE REVEAL</p>
          <h3 className="mt-2 text-xl font-bold">Once committed, this stage cannot be edited.</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#D9E6E3]">Submitting locks this response permanently and releases only the next stage. You will not be able to return and change earlier answers after seeing new information.</p>

          {!confirmed ? (
            <button
              type="button"
              disabled={!ready}
              onClick={() => setConfirmed(true)}
              className="mt-5 min-h-12 rounded-[16px] border border-[#D8A94E] bg-[#FFFDF8] px-6 py-3 text-sm font-black text-[#17363A] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none"
            >
              Review commitment →
            </button>
          ) : (
            <div className="mt-5 rounded-[20px] border border-white/15 bg-white/5 p-4">
              <p className="text-sm font-bold text-[#F2D99B]">Confirm: lock Stage {step.position}{finalStage ? ' and submit the assessment' : ' and reveal the next stage'}?</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <CommitButton ready={ready} finalStage={finalStage} />
                <button type="button" onClick={() => setConfirmed(false)} className="min-h-12 rounded-[16px] border border-white/30 px-5 py-3 text-sm font-black text-white hover:bg-white/10">Return to response</button>
              </div>
            </div>
          )}
        </section>
      </form>
    </div>
  )
}
