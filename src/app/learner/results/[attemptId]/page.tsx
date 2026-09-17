import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { FeedbackPanel } from '@/components/the-ten/feedback-panel'
import { CharacterGuide } from '@/components/the-ten/character-guide'
import { feedbackPresentation, releasedScoreOutcome } from '@/lib/the-ten/feedback'
import { getLocale, localize } from '@/lib/i18n'

type MachineScore = { score: number; max_score: number }
type FinalScore = { final_score: number; max_score: number }
type Response = { id: string; text_response: string | null; machine_scores: MachineScore | MachineScore[] | null; final_score_decisions: FinalScore | FinalScore[] | null }
type ObjectiveResult = { objective_code: string; objective_title: string; performance_percent: number | string; evidence_count: number }
function one<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] ?? null : value }

export default async function LearnerResult({ params }: { params: Promise<{ attemptId: string }> }) {
  const locale = await getLocale()
  const tr = (english: string, arabic: string) => localize(locale, english, arabic)
  const { attemptId } = await params
  const { supabase, userId } = await requireUser()
  const attempt = await supabase.from('assessment_attempts').select('id, assessment_id, status').eq('id', attemptId).eq('learner_id', userId).maybeSingle()
  if (attempt.error) throw new Error(tr('Could not load your attempt.', 'تعذّر تحميل محاولتك.'))
  if (!attempt.data) notFound()
  const assessment = await supabase.from('assessments').select('title, status').eq('id', attempt.data.assessment_id).maybeSingle()
  if (assessment.error) throw new Error(tr('Could not load your checkpoint.', 'تعذّر تحميل نقطة التحقّق.'))
  if (!assessment.data) notFound()
  // Gate before reading scores, including for a learner who also has a staff role.
  if (assessment.data.status !== 'released' || !['submitted', 'late'].includes(attempt.data.status)) {
    return <LearnerShell active="/learner/progress" title={assessment.data.title}><section className="ten-panel"><h2>{tr('Results are not available', 'النتائج غير متاحة')}</h2><p>{attempt.data.status === 'invalidated' ? tr('This attempt was invalidated. Contact your facilitator.', 'أُبطلت هذه المحاولة. تواصل مع الميسّر.') : tr('Results can be reviewed after a submitted attempt is released.', 'يمكن مراجعة النتائج بعد اعتماد المحاولة المرسلة ونشرها.')}</p><Link className="ten-text-link" href="/learner/progress">{tr('Return to progress →', '← العودة إلى التقدّم')}</Link></section></LearnerShell>
  }

  const [result, assessmentResult] = await Promise.all([
    supabase.from('student_responses').select('id, text_response, machine_scores(score, max_score), final_score_decisions(final_score, max_score)').eq('attempt_id', attemptId).order('submitted_at').order('id'),
    supabase.from('learner_assessment_results').select('id, total_score, max_score, scored_items, total_items').eq('attempt_id', attemptId).eq('learner_id', userId).maybeSingle(),
  ])
  if (result.error) throw new Error(tr('Could not load released results.', 'تعذّر تحميل النتائج المنشورة.'))
  if (assessmentResult.error) throw new Error(tr('Could not load your released assessment summary.', 'تعذّر تحميل ملخص التقييم المنشور.'))

  const responses = (result.data ?? []) as unknown as Response[]
  let objectiveResults: ObjectiveResult[] = []
  if (assessmentResult.data?.id) {
    const objectiveQuery = await supabase
      .from('learner_objective_results')
      .select('objective_code, objective_title, performance_percent, evidence_count')
      .eq('assessment_result_id', assessmentResult.data.id)
      .order('objective_code')
    if (objectiveQuery.error) throw new Error(tr('Could not load your reasoning-objective results.', 'تعذّر تحميل نتائج أهداف الاستدلال.'))
    objectiveResults = (objectiveQuery.data ?? []) as ObjectiveResult[]
  }

  return <LearnerShell active="/learner/progress" title={assessment.data.title} intro={tr('Released response scores. Written responses use the final human-governed decision; objective responses use the recorded score.', 'درجات الإجابات المنشورة. تعتمد الإجابات الكتابية القرار البشري النهائي، بينما تعتمد الإجابات الموضوعية الدرجة المسجّلة.')}>
    <Link className="ten-text-link" href="/learner/progress">{tr('← Back to progress', 'العودة إلى التقدّم →')}</Link>
    <div className="ten-notice ten-spaced">{tr('Scores are shown only after release. Reasoning-objective percentages are formative signals from this checkpoint, not a diagnosis of clinical competence.', 'لا تظهر الدرجات إلا بعد نشرها. نسب أهداف الاستدلال مؤشرات تكوينية من نقطة التحقّق هذه، وليست تشخيصاً للكفاءة السريرية.')}</div>

    {objectiveResults.length ? <section className="ten-panel ten-spaced" aria-labelledby="reasoning-objectives-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.15em] text-[#1F6668]">{tr('REASONING SIGNALS', 'مؤشرات الاستدلال')}</p>
          <h2 id="reasoning-objectives-title" className="mt-1">{tr('Performance by learning objective', 'الأداء حسب هدف التعلّم')}</h2>
        </div>
        {assessmentResult.data ? <p className="text-sm font-bold text-[#5D7172]">{tr(`${assessmentResult.data.scored_items} / ${assessmentResult.data.total_items} items scored`, `تم تصحيح ${assessmentResult.data.scored_items} من ${assessmentResult.data.total_items} عناصر`)}</p> : null}
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5D7172]">{tr('Use these results to identify reasoning processes worth revisiting. Compare patterns across checkpoints and discuss them with your facilitator rather than treating one percentage as a stable trait.', 'استخدم هذه النتائج لتحديد عمليات الاستدلال التي تستحق المراجعة. قارن الأنماط عبر نقاط التحقّق وناقشها مع الميسّر، ولا تتعامل مع نسبة واحدة بوصفها سمة ثابتة.')}</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {objectiveResults.map((objective) => {
          const percent = Number(objective.performance_percent)
          const safePercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0
          return <article key={objective.objective_code} className="rounded-[18px] border border-[#D8CCB6] bg-[#FFFDF8] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="ten-clinical-content" lang="en"><p className="text-xs font-black tracking-[0.12em] text-[#1F6668]">{objective.objective_code}</p><h3 className="mt-1 text-sm font-black text-[#17363A]">{objective.objective_title}</h3></div>
              <p className="shrink-0 text-lg font-black text-[#17363A]">{safePercent.toFixed(0)}%</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E7DFD0]" aria-hidden="true"><div className="h-full rounded-full bg-[#1F6668]" style={{ width: `${safePercent}%` }} /></div>
            <p className="mt-2 text-xs font-semibold text-[#6C7B79]">{tr(`Evidence from ${objective.evidence_count} scored ${objective.evidence_count === 1 ? 'item' : 'items'}.`, `الدليل مستمد من ${objective.evidence_count} ${objective.evidence_count === 1 ? 'عنصر مصحّح' : 'عناصر مصحّحة'}.`)}</p>
          </article>
        })}
      </div>
    </section> : null}

    <div className="ten-result-list">{responses.length ? responses.map((response, index) => {
      const final = one(response.final_score_decisions)
      const machine = one(response.machine_scores)
      const score = final ? Number(final.final_score) : machine ? Number(machine.score) : null
      const maximum = Number(final?.max_score ?? machine?.max_score ?? 0)
      const outcome = score === null ? null : releasedScoreOutcome(score, maximum)
      const outcomeTitle = outcome === 'correct' ? tr(feedbackPresentation.correct.title, 'إجابة صحيحة') : outcome === 'partial' ? tr(feedbackPresentation.partial.title, 'إجابة صحيحة جزئياً') : tr(feedbackPresentation.incorrect.title, 'إجابة غير صحيحة')
      return <section className="ten-panel" key={response.id}><h2>{tr(`Recorded response ${index + 1}`, `الإجابة المسجّلة ${index + 1}`)}</h2>{response.text_response && <details className="ten-response-review"><summary>{tr('Review your written response', 'مراجعة إجابتك الكتابية')}</summary><p className="ten-clinical-content whitespace-pre-wrap" lang="en">{response.text_response}</p></details>}
        {outcome ? <FeedbackPanel state={outcome} title={`${score} / ${maximum} · ${outcomeTitle}`}><p>{final ? tr('Final reviewed score.', 'الدرجة النهائية بعد المراجعة.') : tr('Recorded objective score.', 'الدرجة الموضوعية المسجّلة.')} {outcome === 'correct' ? tr('Full credit awarded for this response.', 'مُنحت الدرجة كاملة لهذه الإجابة.') : outcome === 'partial' ? tr('Some credit awarded. Revisit the learning objectives and discuss the missing reasoning with your facilitator.', 'مُنحت درجة جزئية. راجع أهداف التعلّم وناقش جوانب الاستدلال الناقصة مع الميسّر.') : tr('No credit awarded for this response. Discuss the reasoning with your facilitator before your next checkpoint.', 'لم تُمنح درجة لهذه الإجابة. ناقش الاستدلال مع الميسّر قبل نقطة التحقّق التالية.')}</p></FeedbackPanel> : <p>{tr('A released score is not available for this response yet.', 'لا تتوفر درجة منشورة لهذه الإجابة بعد.')}</p>}
      </section>
    }) : <div className="ten-empty">{tr('No responses were recorded for this attempt.', 'لم تُسجّل إجابات لهذه المحاولة.')}</div>}</div>
    <CharacterGuide character="al-razi" reaction="guide" name={tr('Al-Razi', 'الرازي')} message={tr('Pause with the feedback. Identify one reasoning step you want to explore with your facilitator.', 'تأنَّ مع التغذية الراجعة، وحدّد خطوة استدلال واحدة تريد استكشافها مع الميسّر.')} />
  </LearnerShell>
}
