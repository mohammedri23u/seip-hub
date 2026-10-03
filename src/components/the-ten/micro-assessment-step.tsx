'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { AnswerOption } from './answer-option'
import type { ProgressiveDeliveryStep } from './progressive-assessment-step'

export type MicroDeliveryStep = ProgressiveDeliveryStep & {
  micro_assessment?: boolean
  compact_assessment?: boolean
  timing_mode?: string
  reopened_at?: string | null
  deadline_at?: string | null
  server_now?: string
  instrument_version?: string
}

function SubmitButton({ ready, final }: { ready: boolean; final: boolean }) {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={!ready || pending}
    className="min-h-12 w-full rounded-[16px] bg-[#D8A94E] px-6 py-3 text-sm font-black text-[#17363A] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
    {pending ? 'Saving…' : final ? 'Submit final answer →' : 'Save answer & next →'}
  </button>
}

/** Self-paced; remount per question so a previous selection cannot leak forward. */
export function MicroAssessmentStep({ step, action }: {
  step: MicroDeliveryStep
  action: (formData: FormData) => Promise<void>
}) {
  const [value, setValue] = useState('')
  const written = step.item.question_type === 'short_answer'

  return <div className="mx-auto max-w-3xl space-y-4">
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#CFC2AA] bg-[#FFFDF8] px-5 py-4 shadow-sm">
      <div>
        <p className="text-xs font-black tracking-[0.12em] text-[#1F6668]">SELF-PACED CHECKPOINT</p>
        <h2 className="mt-1 text-lg font-bold text-[#17363A]">Question {step.position} of {step.total}</h2>
      </div>
      <p lang="ar" dir="rtl" className="rounded-full border border-[#CFC2AA] px-4 py-2 text-sm font-bold text-[#1F6668]">بدون توقيت إجباري</p>
    </section>
    <p lang="ar" dir="rtl" className="text-sm font-semibold leading-7 text-[#526C6E]">خذ وقتك بالإجابة. تگدر تحفظ وترجع لاحقًا لتكمل من أول سؤال متبقّي؛ ماكو إغلاق تلقائي بسبب الوقت.</p>
    {step.reopened_at ? <p role="status" lang="ar" dir="rtl" className="rounded-[16px] border border-[#CFE1DC] bg-[#EAF7F1] p-4 text-sm leading-7 text-[#1F6668]">أُعيد فتح محاولتك بعد انتهاء المؤقّت سابقًا. إجاباتك المثبّتة محفوظة؛ أكمل الأسئلة المتبقية بدون توقيت.</p> : null}
    <form action={action} className="space-y-4">
      <fieldset className="rounded-[24px] border border-[#CFC2AA] bg-[#FFFDF8] p-5 sm:p-7">
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
        <p className="mb-3 text-sm leading-6">There is no time limit. Saving locks this answer and opens the next question. You can return later to continue. Unsent text is not saved automatically.</p>
        <p lang="ar" dir="rtl" className="mb-4 text-sm leading-7 text-[#D9E6E3]">قبل الخروج، اضغط حفظ لتثبيت إجابتك. الجواب المثبّت يبقى محفوظًا وما تگدر تغيّره؛ النص الذي لم تضغط حفظه لا يُرسل تلقائيًا.</p>
        <div className="flex flex-wrap items-center gap-3"><SubmitButton ready={value.trim().length > 0} final={step.position === step.total} /><Link href="/learner" className="inline-flex min-h-12 items-center rounded-xl border border-white/40 px-4 py-3 text-sm font-bold">العودة إلى الرحلة</Link></div>
      </div>
    </form>
  </div>
}
