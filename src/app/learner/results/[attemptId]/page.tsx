import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { FeedbackPanel } from '@/components/the-ten/feedback-panel'
import { CharacterGuide } from '@/components/the-ten/character-guide'
import { feedbackPresentation, releasedScoreOutcome } from '@/lib/the-ten/feedback'

type MachineScore = { score: number; max_score: number }
type FinalScore = { final_score: number; max_score: number }
type Response = { id: string; text_response: string | null; machine_scores: MachineScore | MachineScore[] | null; final_score_decisions: FinalScore | FinalScore[] | null }
function one<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] ?? null : value }

export default async function LearnerResult({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params
  const { supabase, userId } = await requireUser()
  const attempt = await supabase.from('assessment_attempts').select('id, assessment_id, status').eq('id', attemptId).eq('learner_id', userId).maybeSingle()
  if (attempt.error) throw new Error('Could not load your attempt.')
  if (!attempt.data) notFound()
  const assessment = await supabase.from('assessments').select('title, status').eq('id', attempt.data.assessment_id).maybeSingle()
  if (assessment.error) throw new Error('Could not load your checkpoint.')
  if (!assessment.data) notFound()
  // Gate before reading scores, including for a learner who also has a staff role.
  if (assessment.data.status !== 'released' || !['submitted', 'late'].includes(attempt.data.status)) {
    return <LearnerShell active="/learner/progress" title={assessment.data.title}><section className="ten-panel"><h2>Results are not available</h2><p>{attempt.data.status === 'invalidated' ? 'This attempt was invalidated. Contact your facilitator.' : 'Results can be reviewed after a submitted attempt is released.'}</p><Link className="ten-text-link" href="/learner/progress">Return to progress →</Link></section></LearnerShell>
  }
  const result = await supabase.from('student_responses').select('id, text_response, machine_scores(score, max_score), final_score_decisions(final_score, max_score)').eq('attempt_id', attemptId).order('submitted_at').order('id')
  if (result.error) throw new Error('Could not load released results.')
  const responses = (result.data ?? []) as unknown as Response[]
  return <LearnerShell active="/learner/progress" title={assessment.data.title} intro="Released response scores. Written responses use the final human-governed decision; objective responses use the recorded score.">
    <Link className="ten-text-link" href="/learner/progress">← Back to progress</Link>
    <div className="ten-notice ten-spaced">Scores are shown for recorded responses only. This view does not calculate an overall grade or reveal assessment answer keys.</div>
    <div className="ten-result-list">{responses.length ? responses.map((response, index) => {
      const final = one(response.final_score_decisions)
      const machine = one(response.machine_scores)
      const score = final ? Number(final.final_score) : machine ? Number(machine.score) : null
      const maximum = Number(final?.max_score ?? machine?.max_score ?? 0)
      const outcome = score === null ? null : releasedScoreOutcome(score, maximum)
      return <section className="ten-panel" key={response.id}><h2>Recorded response {index + 1}</h2>{response.text_response && <details className="ten-response-review"><summary>Review your written response</summary><p className="whitespace-pre-wrap">{response.text_response}</p></details>}
        {outcome ? <FeedbackPanel state={outcome} title={`${score} / ${maximum} · ${feedbackPresentation[outcome].title}`}><p>{final ? 'Final reviewed score.' : 'Recorded objective score.'} {outcome === 'correct' ? 'Full credit awarded for this response.' : outcome === 'partial' ? 'Some credit awarded. Revisit the learning objectives and discuss the missing reasoning with your facilitator.' : 'No credit awarded for this response. Discuss the reasoning with your facilitator before your next checkpoint.'}</p></FeedbackPanel> : <p>A released score is not available for this response yet.</p>}
      </section>
    }) : <div className="ten-empty">No responses were recorded for this attempt.</div>}</div>
    <CharacterGuide character="al-razi" reaction="guide" message="Pause with the feedback. Identify one reasoning step you want to explore with your facilitator." />
  </LearnerShell>
}
