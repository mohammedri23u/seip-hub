'use client'
import { useI18n } from '@/components/i18n-provider'
/** An informational register, never a navigation control or an optimistic progress meter. */
export function SignalRegister({ completed, reachable, total = 10 }: { completed: number; reachable: number; total?: number }) {
  const { tr } = useI18n()
  const count = Math.max(total, reachable)
  return <div className="ten-signal-register" role="img" aria-label={tr(`${completed} Signals restored; ${reachable} reachable of ${count} in THE TEN`, `تمت استعادة ${completed} إشارة؛ ${reachable} متاحة من أصل ${count} في THE TEN`)}>
    {Array.from({ length: count }, (_, index) => <span key={index} data-state={index < completed ? 'restored' : index < reachable ? 'reachable' : 'unrevealed'} aria-hidden="true"><i />{String(index + 1).padStart(2, '0')}</span>)}
  </div>
}
