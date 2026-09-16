'use client'
import type { CasePhase } from '@/lib/the-ten/case-flow'

export type CaseStepStatus = { id: string; phase: CasePhase; completed: boolean; lockedReason?: string }

export function CaseProgressTracker({ steps, activeId, onNavigate, busy = false }: { steps: CaseStepStatus[]; activeId: string; onNavigate: (id: string) => void; busy?: boolean }) {
  return <nav aria-label="Case sections" className="ten-case-progress"><ol>{steps.map((step, index) => <li key={step.id}>
    <button type="button" disabled={busy || Boolean(step.lockedReason)} aria-current={step.id === activeId ? 'step' : undefined} aria-describedby={step.lockedReason ? `lock-${step.id}` : undefined} onClick={() => onNavigate(step.id)}>
      <span className="ten-case-step-index" aria-hidden="true">{step.completed ? '✓' : index + 1}</span><span>{step.phase}<small>{step.lockedReason ? 'Locked' : step.completed ? 'Completed' : step.id === activeId ? 'Current' : 'Available'}</small></span>
    </button>{step.lockedReason && <p id={`lock-${step.id}`} className="ten-lock-reason">{step.lockedReason}</p>}
  </li>)}</ol></nav>
}
