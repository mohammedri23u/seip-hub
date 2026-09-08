'use client'

import { useMemo, useState } from 'react'
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

function SubmitButton({ answered, total }: { answered: number; total: number }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 min-h-12 w-full rounded-[16px] bg-[#FFFDF8] px-5 py-3 text-sm font-black text-[#17363A] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-wait disabled:opacity-60 motion-reduce:transform-none motion-reduce:transition-none"
    >
      {pending ? 'Submitting securely…' : answered < total ? `Submit ${answered}/${total} answered` : 'Submit assessment'}
    </button>
  )
}

export function AssessmentExperience({
  items,
  action,
}: {
  items: DeliveryItem[]
  action: (formData: FormData) => Promise<void>
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const answered = useMemo(
    () => items.reduce((count, item) => count + (answers[item.question_version_id]?.trim() ? 1 : 0), 0),
    [answers, items],
  )

  return (
    <form action={action} className="mx-auto max-w-4xl space-y-5">
      <div className="sticky top-3 z-10">
        <ProgressTracker total={items.length} answered={answered} />
      </div>

      {items.map((item) => {
        const fieldName = `q_${item.question_version_id}`
        const value = answers[item.question_version_id] ?? ''
        const isChoice = item.question_type === 'single_best_answer' || item.question_type === 'true_false'

        return (
          <QuestionCard key={item.question_version_id} number={item.position} marks={item.marks} stem={item.stem}>
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
            ) : (
              <div>
                <label htmlFor={fieldName} className="mb-2 block text-xs font-black tracking-[0.12em] text-[#426064]">
                  YOUR REASONING
                </label>
                <textarea
                  id={fieldName}
                  name={fieldName}
                  rows={6}
                  value={value}
                  onChange={(event) => setAnswers((current) => ({ ...current, [item.question_version_id]: event.target.value }))}
                  className="w-full rounded-[18px] border border-[#CFC2AA] bg-[#FFFDF8] p-4 text-[15px] leading-7 text-[#17363A] outline-none transition placeholder:text-[#8A918C] focus:border-[#1F6668] focus:ring-2 focus:ring-[#1F6668]/15 motion-reduce:transition-none"
                  placeholder="Write your clinical reasoning…"
                />
              </div>
            )}
          </QuestionCard>
        )
      })}

      <section className="rounded-[28px] bg-[#17363A] p-5 text-[#FFFDF8] shadow-[0_18px_55px_rgba(23,54,58,0.18)] sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full border border-[#D8A94E]/60 bg-[#D8A94E]/10 text-sm font-black text-[#F2D99B]">!</div>
          <div>
            <h3 className="font-bold">Final submission</h3>
            <p className="mt-1 text-sm leading-6 text-[#D9E6E3]">
              Submitting locks this attempt. Written responses continue into the human-supervised grading workflow; unanswered questions remain unanswered.
            </p>
          </div>
        </div>
        <SubmitButton answered={answered} total={items.length} />
      </section>
    </form>
  )
}
