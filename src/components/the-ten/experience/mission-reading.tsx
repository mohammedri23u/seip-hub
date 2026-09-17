'use client'
import { useI18n } from '@/components/i18n-provider'

/** Presentation consumes only the stage already delivered by the authoritative snapshot. */
export type ReadingStage = { label?: string; pptText?: string; studentTask?: string; answer?: unknown; feedback?: string; expectedReasoning?: string; options?: string[] }

export function MissionSteps({ current, total }: { current: number; total: number }) {
  const { tr } = useI18n()
  return <div className="ten-mission-steps" aria-label={tr(`Stage ${Math.min(current + 1,total)} of ${total}`, `المرحلة ${Math.min(current + 1,total)} من ${total}`)}><span>{tr('Stage', 'المرحلة')} {Math.min(current + 1,total)} <small>/ {total}</small></span><div aria-hidden="true">{Array.from({length:total},(_,i)=><i key={i} data-state={i<current?'passed':i===current?'current':'future'}/>)}</div></div>
}

export function MissionEvidence({ stage, phase }: { stage: ReadingStage; phase: string }) {
  const { tr } = useI18n()
  return <section className="ten-mission-evidence" aria-labelledby="stage-label"><p className="ten-eyebrow">{tr('RELEASED OBSERVATIONS', 'الملاحظات المكشوفة')}</p><div className="ten-clinical-content" lang="en"><h2 id="stage-label">{stage.label ?? 'The available evidence'}</h2><p className="ten-clinical-text">{stage.pptText}</p><div className="ten-reasoning-task"><p className="ten-eyebrow">{phase==='reveal'?'THE REASONING TASK':'YOUR REASONING TASK'}</p><p>{stage.studentTask}</p></div></div></section>
}

export function MissionReveal({ stage, distribution }: { stage: ReadingStage; distribution?: Record<string, number> }) {
  const { tr } = useI18n()
  return <section className="ten-mission-reveal" aria-labelledby="reveal-title"><p className="ten-eyebrow">{tr('THE FACILITATOR’S REVEAL', 'كشف الميسّر')}</p><h2 id="reveal-title">{tr('Return to the evidence.', 'عُد إلى الدليل.')}</h2>
    <div className="ten-clinical-content" lang="en">{stage.answer !== undefined && <div className="ten-reveal-anchor"><p className="ten-eyebrow">EXPECTED RESPONSE</p><p>{formatAnswer(stage.answer,stage.options)}</p></div>}
    {stage.feedback && <p className="ten-reveal-feedback">{stage.feedback}</p>}
    {stage.expectedReasoning && <section><h3>The reasoning behind it</h3><p>{stage.expectedReasoning}</p></section>}</div>
    {distribution && Object.keys(distribution).length>0 && <details><summary>{tr('See how the room responded', 'شاهد كيف أجابت الغرفة')}</summary><dl className="ten-clinical-content" lang="en">{Object.entries(distribution).map(([key,n])=><div key={key}><dt>{distributionLabel(key,stage.options)}</dt><dd>{n}</dd></div>)}</dl></details>}
    <p className="ten-reveal-reflection">{tr('Look back at your reasoning: which observation carried the most weight?', 'راجع استدلالك: أي ملاحظة كان لها الوزن الأكبر؟')}</p>
  </section>
}

function formatAnswer(answer: unknown, options?: string[]): string {
  if (typeof answer==='number') return options?.[answer] ?? `Choice ${answer+1}`
  if (typeof answer==='boolean') return answer ? 'True' : 'False'
  if (Array.isArray(answer)) return answer.map(value=>formatAnswer(value,options)).join(' · ')
  if (answer && typeof answer==='object') return Object.entries(answer).map(([key,value])=>`${key.replaceAll('_',' ')}: ${String(value)}`).join(' · ')
  return String(answer)
}
function distributionLabel(key: string, options?: string[]) {
  if (key==='true') return 'True'
  if (key==='false') return 'False'
  const index=Number(key)
  return Number.isInteger(index) && index>=0 ? options?.[index] ?? `Choice ${index+1}` : key
}
