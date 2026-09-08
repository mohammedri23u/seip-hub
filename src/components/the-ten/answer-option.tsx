'use client'

import { useId } from 'react'
import type { TheTenFeedbackState } from '@/lib/the-ten/tokens'

type Props = {
  name: string
  value: string
  label: string
  text: string
  state?: TheTenFeedbackState
  checked?: boolean
  disabled?: boolean
  onChange?: () => void
}

const stateClasses: Record<TheTenFeedbackState, string> = {
  idle: 'border-[#D8CCB6] bg-[#FFFDF8] hover:-translate-y-0.5 hover:border-[#46B9BD] hover:shadow-[0_10px_30px_rgba(23,54,58,0.08)]',
  selected: 'border-[#1F6668] bg-[#EEF8F5] ring-2 ring-[#1F6668]/15',
  submitting: 'border-[#D8A94E] bg-[#FFF9E8] opacity-80',
  correct: 'border-[#2F8A72] bg-[#EAF7F1] ring-2 ring-[#2F8A72]/15',
  incorrect: 'border-[#C76057] bg-[#FCEFED] ring-2 ring-[#C76057]/15',
  partial: 'border-[#C58A3E] bg-[#FFF7E8] ring-2 ring-[#C58A3E]/15',
  disabled: 'border-[#DED7C9] bg-[#F3EEE5] opacity-60',
}

export function AnswerOption({ name, value, label, text, state = 'idle', checked, disabled, onChange }: Props) {
  const id = useId()
  const effectiveState = disabled ? 'disabled' : state

  return (
    <label
      htmlFor={id}
      className={`group flex min-h-14 cursor-pointer items-start gap-3 rounded-[18px] border px-4 py-3.5 transition duration-200 motion-reduce:transform-none motion-reduce:transition-none ${stateClasses[effectiveState]}`}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border text-xs font-black transition ${checked ? 'border-[#1F6668] bg-[#1F6668] text-white' : 'border-[#BFAF95] bg-white text-[#17363A]'}`}>
        {label}
      </span>
      <span className="min-w-0 pt-0.5 text-[15px] font-medium leading-6 text-[#17363A]">{text}</span>
    </label>
  )
}
