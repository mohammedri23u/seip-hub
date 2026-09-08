'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { TheTenCharacter } from '@/lib/the-ten/assets'
import type { FormativeFeedback } from '@/lib/the-ten/case-flow'
import { CaseProgressTracker, type CaseStepStatus } from './case-progress-tracker'
import { FormativeQuestion, type FormativeQuestionData } from './formative-question'
import { CharacterGuide } from '../character-guide'
import { motionStyles, motionTokens } from '@/lib/the-ten/motion'

export type FormativeCase = {
  id: string; title: string; character?: TheTenCharacter; completed: boolean
  steps: (CaseStepStatus & { title: string; content: string; question?: FormativeQuestionData })[]
}

/** Completion and section access are supplied by the case adapter, never inferred from clicks. */
export function CaseExperience({ learningCase, submitAnswer }: {
  learningCase: FormativeCase
  submitAnswer: (questionId: string, optionId: string) => Promise<FormativeFeedback>
}) {
  const [activeId, setActiveId] = useState(learningCase.steps.find(s => !s.lockedReason && !s.completed)?.id ?? learningCase.steps[0]?.id)
  const [busy, setBusy] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [leaving, setLeaving] = useState(false)
  const transition = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (transition.current) clearTimeout(transition.current) }, [])
  const [feedback, setFeedback] = useState<Record<string, FormativeFeedback>>({})
  const panel = useRef<HTMLElement>(null)
  const activeIndex = learningCase.steps.findIndex(s => s.id === activeId)
  const active = learningCase.steps[activeIndex]
  const next = learningCase.steps[activeIndex + 1]

  function navigate(id: string) {
    const target = learningCase.steps.findIndex(s => s.id === id)
    if (busy || transition.current || target < 0 || learningCase.steps[target].lockedReason || id === activeId) return
    setDirection(target < activeIndex ? 'back' : 'forward')
    const enter = () => {
      setActiveId(id)
      setLeaving(false)
      transition.current = null
      panel.current?.focus({ preventScroll: true })
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) enter()
    else {
      setLeaving(true)
      transition.current = setTimeout(enter, motionTokens.instant)
    }
  }

  if (!active) return <div className="ten-empty">This case has no published sections yet.</div>
  return <div className="ten-case-experience" style={motionStyles}>
    <CaseProgressTracker steps={learningCase.steps} activeId={active.id} onNavigate={navigate} busy={busy || leaving} />
    <section ref={panel} tabIndex={-1} aria-label={`${active.phase}: ${active.title}`} className="ten-panel ten-spaced">
      <div key={active.id} inert={leaving} className={`ten-case-transition ten-case-${leaving ? 'exit-' : ''}${direction}`}>
        <p className="ten-eyebrow">{active.phase} · {activeIndex + 1} of {learningCase.steps.length}</p><h2>{active.title}</h2>
        {active.lockedReason ? <p className="ten-notice">Locked: {active.lockedReason}</p> : <><p className="ten-case-content">{active.content}</p>{active.question && <FormativeQuestion key={active.question.id} question={{ ...active.question, feedback: active.question.feedback ?? feedback[active.question.id] }} character={learningCase.character} submitAnswer={submitAnswer} onBusy={setBusy} onFeedback={result => setFeedback(current => ({ ...current, [result.questionId]: result }))} />}</>}
      </div>
    </section>
    <div className="ten-case-navigation"><button className="ten-action ten-action-secondary" type="button" disabled={busy || leaving || activeIndex === 0 || Boolean(learningCase.steps[activeIndex - 1]?.lockedReason)} onClick={() => navigate(learningCase.steps[activeIndex - 1].id)}>Previous section</button>{next && <button className="ten-action" type="button" disabled={busy || leaving || Boolean(next.lockedReason)} onClick={() => navigate(next.id)}>Continue to {next.phase}</button>}</div>
    {next?.lockedReason && <p className="ten-notice">Next section locked: {next.lockedReason}</p>}
    {learningCase.completed && <section className="ten-panel ten-spaced"><h2>Case completed</h2><p>Your completion has been confirmed. Take a moment to reflect on the reasoning you will carry forward.</p>{learningCase.character && <CharacterGuide character={learningCase.character} reaction="celebrate" message="Carry one useful insight into your next session." />}<Link className="ten-text-link" href="/learner/progress">View progress →</Link></section>}
  </div>
}
