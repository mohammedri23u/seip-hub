'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { finalizeTimedAssessment } from '@/app/assessments/[assessmentId]/take/timed-actions'
import { AnswerOption } from './answer-option'
import type { ProgressiveDeliveryStep } from './progressive-assessment-step'

export type MicroDeliveryStep = ProgressiveDeliveryStep & {
  micro_assessment: boolean
  deadline_at: string
  server_now: string
  instrument_version?: string
}

function SubmitButton({ ready, final, expired }: { ready: boolean; final: boolean; expired: boolean }) {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={!ready || pending || expired}
    className="min-h-12 w-full rounded-[16px] bg-[#D8A94E] px-6 py-3 text-sm font-black text-[#17363A] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
    {pending ? 'Saving…' : final ? 'Submit final answer →' : 'Save answer & next →'}
  </button>
}

/** Mounted by question version so answers cannot carry into the next question. */
export function MicroAssessmentStep({ step, action }: {
  step: MicroDeliveryStep
  action: (formData: FormData) => Promise<void>
}) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const initialMs = Math.max(0, Date.parse(step.deadline_at) - Date.parse(step.server_now))
  const [remainingMs, setRemainingMs] = useState(Number.isFinite(initialMs) ? initialMs : 0)
  const [finalizeError, setFinalizeError] = useState(false)
  const finalizing = useRef(false)
  const written = step.item.question_type === 'short_answer'
  const expired = remainingMs <= 0
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  const finalize = useCallback(async () => {
    if (finalizing.current) return
    finalizing.current = true
    setFinalizeError(false)
    try {
      const result = await finalizeTimedAssessment(step.attempt_id)
      if (result.completed) {
        router.replace('/learner')
        router.refresh()
      } else {
        // Server time wins if a browser clock runs ahead.
        finalizing.current = false
        router.refresh()
      }
    } catch {
      finalizing.current = false
      setFinalizeError(true)
    }
  }, [router, step.attempt_id])

  useEffect(() => {
    const initial = Math.max(0, Date.parse(step.deadline_at) - Date.parse(step.server_now))
    const wallStart = Date.now()
    const monotonicStart = performance.now()
    const tick = () => {
      const elapsed = Math.max(Date.now() - wallStart, performance.now() - monotonicStart)
      const remaining = Number.isFinite(initial) ? Math.max(0, initial - elapsed) : 0
      setRemainingMs(remaining)
    }
    tick()
    const timer = window.setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [step.deadline_at, step.server_now])

  useEffect(() => {
    if (expired && !finalizeError) void finalize()
  }, [expired, finalizeError, finalize])

  return <div className="mx-auto max-w-3xl space-y-4">
    <section className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#CFC2AA] bg-[#FFFDF8] px-5 py-4 shadow-sm">
      <div>
        <p className="text-xs font-black tracking-[0.12em] text-[#1F6668]">5-MINUTE CHECKPOINT</p>
        <h2 className="mt-1 text-lg font-bold text-[#17363A]">Question {step.position} of {step.total}</h2>
      </div>
      <div className="text-right">
        <p role="timer" aria-label="Time remaining" className={`font-mono text-3xl font-bold tabular-nums ${seconds <= 60 ? 'text-[#8C403A]' : 'text-[#17363A]'}`}>{clock}</p>
        <p className="text-xs text-[#526C6E]">total time remaining</p>
      </div>
    </section>

    <p aria-live="polite" className="text-sm font-semibold text-[#526C6E]">
      {expired ? 'Time ended. Your committed answers are retained.' : seconds <= 60 ? 'Less than one minute remains. Save your current answer before time ends.' : '3 MCQs + 1 very short answer. The timer does not reset between questions.'}
    </p>

    {finalizeError ? <div role="alert" className="rounded-[16px] border border-[#E4B9B4] bg-[#FCEFED] p-4 text-sm text-[#8C403A]">
      <p>Time has ended, but the connection could not confirm submission. Your committed answers remain stored. Reopening this checkpoint also finalizes it.</p>
      <button type="button" onClick={() => void finalize()} className="mt-3 min-h-11 rounded-lg border border-current px-4 font-bold">Retry submission</button>
    </div> : null}

    <form action={action} className="space-y-4">
      <fieldset disabled={expired} className="rounded-[24px] border border-[#CFC2AA] bg-[#FFFDF8] p-5 sm:p-7">
        <legend className="sr-only">Question {step.position}</legend>
        <p className="text-xs font-bold tracking-[0.1em] text-[#8B6A2B]">{written ? 'VERY SHORT ANSWER' : 'SELECT ONE BEST ANSWER'} · {step.item.marks} mark</p>
        <p className="mt-3 whitespace-pre-wrap text-[16px] font-semibold leading-7 text-[#17363A]">{step.item.stem}</p>
        {step.item.hint_ar ? <aside lang="ar" dir="rtl" aria-label="توضيح المطلوب بالعربي" className="mt-4 rounded-[16px] border border-[#D8A94E]/55 bg-[#FFF8E7] px-4 py-3 text-right">
          <p className="text-sm font-black text-[#8B6A2B]">توضيح المطلوب</p>
          <p className="mt-1 text-[14px] font-semibold leading-7 text-[#526064]">{step.item.hint_ar}</p>
        </aside> : null}
        <div className="mt-5">
          {written ? <div>
            <label htmlFor="micro-response" className="mb-2 block text-sm font-bold text-[#426064]">Your answer · aim for 1–5 words</label>
            <textarea id="micro-response" name="response" rows={2} maxLength={500} autoComplete="off" value={value} onChange={(event) => setValue(event.target.value)} placeholder="One short answer; no explanation needed."
              className="w-full rounded-[14px] border border-[#CFC2AA] bg-white p-3 text-[16px] leading-7 text-[#17363A] outline-none focus:border-[#1F6668] focus:ring-2 focus:ring-[#1F6668]/15" />
          </div> : <div role="radiogroup" aria-label={`Question ${step.position} options`} className="space-y-2">
            {step.item.options.map((option) => <AnswerOption key={option.id} name="response" value={option.id} label={String.fromCharCode(64 + option.position)} text={option.text} checked={value === option.id} state={value === option.id ? 'selected' : 'idle'} onChange={() => setValue(option.id)} />)}
          </div>}
        </div>
      </fieldset>
      <div className="rounded-[20px] bg-[#17363A] p-4 text-[#FFFDF8] sm:p-5">
        <p className="mb-3 text-sm leading-6">Saving locks this answer and opens the next question. Only answers committed before the deadline are retained; an unsent draft is not submitted automatically.</p>
        <p lang="ar" dir="rtl" className="mb-4 text-sm leading-7 text-[#D9E6E3]">اضغط حفظ قبل انتهاء الوقت. الجواب المثبّت ما تگدر تغيّره، والجواب الذي لم تضغط حفظه لا يُرسل تلقائيًا.</p>
        <SubmitButton ready={value.trim().length > 0} final={step.position === step.total} expired={expired} />
      </div>
    </form>
  </div>
}
