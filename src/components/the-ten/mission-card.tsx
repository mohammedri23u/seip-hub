import Link from 'next/link'
import { StatusBadge } from './status-badge'

type MissionState = 'current' | 'available' | 'completed' | 'locked'

const toneByState = {
  current: 'gold',
  available: 'accent',
  completed: 'success',
  locked: 'neutral',
} as const

export function MissionCard({
  title,
  subtitle,
  href,
  state,
  progress,
  lockedReason,
}: {
  title: string
  subtitle?: string
  href?: string
  state: MissionState
  progress?: number
  lockedReason?: string
}) {
  const safeProgress = Math.max(0, Math.min(progress ?? 0, 100))
  const card = (
    <article className="rounded-[24px] border border-[#D8CCB6] bg-[#FFFDF8] p-5 shadow-[0_12px_40px_rgba(23,54,58,0.06)] transition hover:border-[#AFCAC4] motion-reduce:transition-none">
      <div className="flex items-start justify-between gap-3">
        <StatusBadge tone={toneByState[state]}>{state}</StatusBadge>
        {typeof progress === 'number' ? <span className="text-xs font-black text-[#5B7072]">{safeProgress}%</span> : null}
      </div>
      <h3 className="mt-4 text-lg font-black text-[#17363A]">{title}</h3>
      {subtitle ? <p className="mt-1 text-sm leading-6 text-[#5B7072]">{subtitle}</p> : null}
      {typeof progress === 'number' ? (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E8DDC8]">
          <div className="h-full rounded-full bg-[#1F6668]" style={{ width: `${safeProgress}%` }} />
        </div>
      ) : null}
      {state === 'locked' && lockedReason ? <p className="mt-4 text-xs font-semibold leading-5 text-[#756E62]">{lockedReason}</p> : null}
    </article>
  )

  return href && state !== 'locked' ? <Link href={href} className="block rounded-[24px]">{card}</Link> : card
}
