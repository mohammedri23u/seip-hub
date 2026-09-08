import type { ReactNode } from 'react'
import type { TheTenFeedbackState } from '@/lib/the-ten/tokens'

const styles: Record<Exclude<TheTenFeedbackState, 'idle' | 'selected' | 'submitting' | 'disabled'>, string> = {
  correct: 'border-[#2F8A72] bg-[#EAF7F1] text-[#1E604F]',
  incorrect: 'border-[#C76057] bg-[#FCEFED] text-[#8C403A]',
  partial: 'border-[#C58A3E] bg-[#FFF7E8] text-[#86602B]',
}

export function FeedbackPanel({
  state,
  title,
  children,
}: {
  state: 'correct' | 'incorrect' | 'partial'
  title: string
  children: ReactNode
}) {
  return (
    <div aria-live="polite" className={`rounded-[20px] border p-4 motion-safe:animate-[theTenFeedbackIn_280ms_ease-out] ${styles[state]}`}>
      <p className="text-sm font-black tracking-wide">{title}</p>
      <div className="mt-1 text-sm leading-6">{children}</div>
    </div>
  )
}
