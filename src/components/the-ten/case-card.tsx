import Link from 'next/link'

type CaseState = 'available' | 'in_progress' | 'completed' | 'locked' | 'bonus'

const stateStyles: Record<CaseState, string> = {
  available: 'border-[#D8CCB6] bg-[#FFFDF8]',
  in_progress: 'border-[#46B9BD] bg-[#F2FBF9]',
  completed: 'border-[#9BC9B9] bg-[#EEF8F5]',
  locked: 'border-[#DDD3C0] bg-[#F1ECE3] opacity-75',
  bonus: 'border-[#D8A94E] bg-[#FFF8E8]',
}

export function CaseCard({
  title,
  description,
  href,
  state = 'available',
  badge,
  meta,
  lockedReason,
}: {
  title: string
  description?: string
  href?: string
  state?: CaseState
  badge?: string
  meta?: string
  lockedReason?: string
}) {
  const content = (
    <article className={`group rounded-[26px] border p-5 shadow-[0_12px_38px_rgba(23,54,58,0.06)] transition duration-200 motion-reduce:transform-none motion-reduce:transition-none ${stateStyles[state]} ${href && state !== 'locked' ? 'hover:-translate-y-1 hover:shadow-[0_18px_46px_rgba(23,54,58,0.10)]' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        {badge ? <span className="rounded-full bg-[#17363A] px-3 py-1.5 text-[11px] font-black tracking-[0.12em] text-[#FFFDF8]">{badge}</span> : <span />}
        <span className="text-xs font-black uppercase tracking-[0.1em] text-[#637779]">{state.replace('_', ' ')}</span>
      </div>
      <h3 className="mt-4 text-lg font-black text-[#17363A]">{title}</h3>
      {description ? <p className="mt-2 text-sm leading-6 text-[#5B7072]">{description}</p> : null}
      {meta ? <p className="mt-4 text-xs font-bold text-[#1F6668]">{meta}</p> : null}
      {state === 'locked' && lockedReason ? <p className="mt-4 rounded-[14px] bg-white/65 px-3 py-2 text-xs font-semibold leading-5 text-[#716A5E]">{lockedReason}</p> : null}
    </article>
  )

  if (href && state !== 'locked') {
    return <Link href={href} className="block rounded-[26px] focus-visible:outline-none">{content}</Link>
  }

  return content
}
