'use client'

import { useFormStatus } from 'react-dom'
import type { ReactNode } from 'react'

/** Native server-action forms keep their existing action and acquire a pending state. */
export function PendingButton({ children, pendingLabel = 'Recording…', className = 'ten-scene-action' }: { children: ReactNode; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={pending} aria-disabled={pending} className={className}>{pending ? pendingLabel : children}</button>
}
