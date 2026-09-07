import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { MetricCard } from '@/components/metric-card'
import { StatusBadge } from '@/components/status-badge'
import { requireUser } from '@/lib/auth/require-user'
import { aiGradingConfigured, aiGradingModel } from '@/lib/ai/grading'
import { approveHumanFinalScore, resolveModeration, runAIGrading, submitHumanReview } from './actions'

type Criterion = { id: string; criterion_code: string; title: string; description: string | null; scoring_guidance: string | null; max_score: number; position: number }
type AIScore = { criterion_id: string; proposed_score: number; rationale: string; confidence: number | null; missing_concepts: string[]; errors: string[] }
type HumanScore = { human_review_id: string; criterion_id: string; score: number; feedback: string | null }
type AIRun = { id: string; status: string; provider: string; model: string; prompt_version: string; proposed_total_score: number | null; max_score: number; confidence: number | null; summary: string | null; uncertainty: string | null; input_tokens: number | null; output_tokens: number | null; error_message: string | null; created_at: string; completed_at: string | null }
type HumanReview = { id: string; response_id: string; reviewer_id: string; ai_grading_run_id: string | null; status: string; total_score: number; max_score: number; general_feedback: string | null; submitted_at: string | null; updated_at: string }
type Moderation = { id: string; response_id: string; ai_grading_run_id: string | null; human_review_id: string | null; trigger_type: string; status: string; reason: string; resolved_score: number | null; resolution_note: string | null; created_at: string; resolved_at: string | null }

export default async function GradingResponsePage({ params, searchParams }: { params: Promise<{ programId: string; responseId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { programId, responseId } = await params
  const query = await searchParams
  const { supabase, userId } = await requireUser()
  const [{ data: program }, { data: membership }, { data: platformAdmin }, { data: response }] = await Promise.all([
    supabase.from('programs').select('id, code').eq('id', programId).maybeSingle(),
    supabase.from('program_memberships').select('role').eq('program_id', programId).eq('user_id', userId).eq('status', 'active').maybeSingle(),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('student_responses').select('id, attempt_id, question_version_id, text_response, submitted_at').eq('id', responseId).maybeSingle(),
  ])
  if (!program || !response || response.text_response === null) notFound()
  const role = membership?.role
  const canGrade = Boolean(platformAdmin) || role === 'program_director' || role === 'assessment_lead' || role === 'reviewer'
  const canFinalize = Boolean(platformAdmin) || role === 'program_director' || role === 'assessment_lead'
  if (!canGrade) notFound()

  const [{ data: attempt }, { data: questionVersion }, { data: mapping }] = await Promise.all([
    supabase.from('assessment_attempts').select('id, assessment_id, learner_id, status, submitted_at').eq('id', response.attempt_id).maybeSingle(),
    supabase.from('question_versions').select('id, question_id, stem, version_number').eq('id', response.question_version_id).maybeSingle(),
    supabase.from('question_rubrics').select('rubric_version_id').eq('question_version_id', response.question_version_id).maybeSingle(),
  ])
  if (!attempt || !questionVersion || !mapping) notFound()

  const [{ data: assessment }, { data: question }, { data: rubricVersion }] = await Promise.all([
    supabase.from('assessments').select('id, title, status').eq('id', attempt.assessment_id).maybeSingle(),
    supabase.from('questions').select('id, question_code, question_type').eq('id', questionVersion.question_id).maybeSingle(),
    supabase.from('rubric_versions').select('id, rubric_id, version_number, instructions, reference_answer, moderation_threshold_points').eq('id', mapping.rubric_version_id).maybeSingle(),
  ])
  if (!assessment || !question || !rubricVersion) notFound()

  const [{ data: rubric }, { data: criteriaData }, { data: aiRunsData }, { data: reviewsData }, { data: moderationData }, { data: finalDecision }] = await Promise.all([
    supabase.from('rubrics').select('id, rubric_code, title, status').eq('id', rubricVersion.rubric_id).maybeSingle(),
    supabase.from('rubric_criteria').select('id, criterion_code, title, description, scoring_guidance, max_score, position').eq('rubric_version_id', rubricVersion.id).order('position'),
    supabase.from('ai_grading_runs').select('id, status, provider, model, prompt_version, proposed_total_score, max_score, confidence, summary, uncertainty, input_tokens, output_tokens, error_message, created_at, completed_at').eq('response_id', responseId).order('created_at', { ascending: false }),
    supabase.from('human_reviews').select('id, response_id, reviewer_id, ai_grading_run_id, status, total_score, max_score, general_feedback, submitted_at, updated_at').eq('response_id', responseId).order('updated_at', { ascending: false }),
    supabase.from('moderation_cases').select('id, response_id, ai_grading_run_id, human_review_id, trigger_type, status, reason, resolved_score, resolution_note, created_at, resolved_at').eq('response_id', responseId).order('created_at', { ascending: false }),
    supabase.from('final_score_decisions').select('id, decision_source, human_review_id, moderation_case_id, final_score, max_score, rationale, decided_by, created_at').eq('response_id', responseId).maybeSingle(),
  ])
  if (!rubric) notFound()
  const criteria = (criteriaData ?? []) as Criterion[]
  const aiRuns = (aiRunsData ?? []) as AIRun[]
  const latestCompletedAI = aiRuns.find((run) => run.status === 'completed') ?? null
  const latestFailedAI = aiRuns.find((run) => run.status === 'failed') ?? null
  const aiScoresData = latestCompletedAI ? (await supabase.from('ai_criterion_scores').select('criterion_id, proposed_score, rationale, confidence, missing_concepts, errors').eq('grading_run_id', latestCompletedAI.id)).data : []
  const aiScores = (aiScoresData ?? []) as AIScore[]
  const aiScoreMap = new Map(aiScores.map((score) => [score.criterion_id, score]))
  const reviews = (reviewsData ?? []) as HumanReview[]
  const reviewIds = reviews.map((review) => review.id)
  const humanScoresData = reviewIds.length ? (await supabase.from('human_criterion_scores').select('human_review_id, criterion_id, score, feedback').in('human_review_id', reviewIds)).data : []
  const humanScores = (humanScoresData ?? []) as HumanScore[]
  const ownReview = reviews.find((review) => review.reviewer_id === userId) ?? null
  const ownScoreMap = new Map(humanScores.filter((score) => score.human_review_id === ownReview?.id).map((score) => [score.criterion_id, score]))
  const moderations = (moderationData ?? []) as Moderation[]
  const openModeration = moderations.find((moderation) => moderation.status === 'open' || moderation.status === 'in_review') ?? null
  const maxScore = criteria.reduce((sum, criterion) => sum + Number(criterion.max_score), 0)
  const hasSubmittedHumanReview = reviews.some((review) => review.status === 'submitted')

  return <AppShell eyebrow={`${program.code} · WRITTEN GRADING`} title={`${assessment.title} · ${question.question_code}`} actions={<Link href={`/programs/${programId}/assessment/grading`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium">Back to queue</Link>}>
    {query.error ? <p className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">Action failed: {query.error.replaceAll('_', ' ')}</p> : null}
    <section className="grid gap-4 md:grid-cols-4"><MetricCard label="Rubric" value={rubric.rubric_code} /><MetricCard label="Max score" value={maxScore} /><MetricCard label="AI proposal" value={latestCompletedAI ? 'Available' : '—'} /><MetricCard label="Final score" value={finalDecision ? `${Number(finalDecision.final_score)} / ${Number(finalDecision.max_score)}` : 'Pending'} /></section>

    <section className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Question</p><p className="mt-3 text-base leading-7 text-slate-800">{questionVersion.stem}</p><div className="mt-5 border-t border-slate-200 pt-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Learner response</p><p className="mt-3 whitespace-pre-wrap text-base leading-7 text-slate-800">{response.text_response || '— No written response submitted —'}</p></div></div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div><h2 className="text-xl font-semibold">Independent human rubric review</h2><p className="mt-1 text-sm text-slate-500">Human fields are not prefilled from AI. Score the response against the rubric, then compare if useful.</p></div>
          <form action={submitHumanReview.bind(null, programId, responseId)} className="mt-5 space-y-4">
            <input type="hidden" name="ai_grading_run_id" value={latestCompletedAI?.id ?? ''} />
            {criteria.map((criterion) => { const existing = ownScoreMap.get(criterion.id); return <div key={criterion.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{criterion.criterion_code} · {criterion.title}</p>{criterion.description ? <p className="mt-1 text-sm text-slate-600">{criterion.description}</p> : null}</div><span className="text-sm font-semibold">max {Number(criterion.max_score)}</span></div>{criterion.scoring_guidance ? <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{criterion.scoring_guidance}</p> : null}<div className="mt-4 grid gap-3 md:grid-cols-[140px_1fr]"><label><span className="text-sm font-medium text-slate-700">Human score</span><input name={`criterion_${criterion.id}`} type="number" min="0" max={Number(criterion.max_score)} step="0.001" required defaultValue={existing ? String(existing.score) : ''} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label><label><span className="text-sm font-medium text-slate-700">Criterion feedback</span><input name={`feedback_${criterion.id}`} defaultValue={existing?.feedback ?? ''} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label></div></div> })}
            <label className="block"><span className="text-sm font-medium text-slate-700">General feedback</span><textarea name="general_feedback" rows={4} defaultValue={ownReview?.general_feedback ?? ''} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4"><input type="checkbox" name="send_to_moderation" value="yes" className="mt-1" /><span><span className="block text-sm font-semibold">Send to moderation</span><span className="mt-1 block text-sm text-slate-500">Use when the response is ambiguous, high-stakes, or needs a second human judgment.</span></span></label>
            <button className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Submit human review</button>
          </form>
        </div>

        {reviews.length ? <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Submitted human reviews</h2><div className="mt-5 space-y-3">{reviews.filter((review) => review.status === 'submitted').map((review) => <div key={review.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">Human review · {review.id.slice(0, 8)}</p><p className="mt-1 text-sm text-slate-500">Reviewer {review.reviewer_id === userId ? 'you' : review.reviewer_id.slice(0, 8)}</p></div><p className="font-semibold">{Number(review.total_score)} / {Number(review.max_score)}</p></div>{review.general_feedback ? <p className="mt-3 text-sm text-slate-600">{review.general_feedback}</p> : null}{canFinalize && !finalDecision && !openModeration ? <form action={approveHumanFinalScore.bind(null, programId, responseId, review.id)}><button className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">Approve as final score</button></form> : null}</div>)}</div></div> : null}
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">AI proposed grading</h2><p className="mt-1 text-sm text-slate-500">Advisory only · never a final grade.</p></div>{latestCompletedAI ? <StatusBadge status="completed" /> : null}</div>{aiGradingConfigured() ? <form action={runAIGrading.bind(null, programId, responseId)}><button className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold">{latestCompletedAI ? 'Run a new AI proposal' : `Run AI proposal · ${aiGradingModel()}`}</button></form> : <p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">AI provider is not configured on this server. Human grading remains fully functional.</p>}{latestFailedAI ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">Latest AI run failed: {latestFailedAI.error_message ?? 'Unknown error'}</p> : null}
          {latestCompletedAI && hasSubmittedHumanReview ? <details className="mt-5 rounded-2xl border border-slate-200"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Open AI proposal after independent review</summary><div className="border-t border-slate-200 p-4"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">Proposed total</span><span className="font-semibold">{Number(latestCompletedAI.proposed_total_score)} / {Number(latestCompletedAI.max_score)}</span></div><p className="mt-3 text-sm text-slate-700">{latestCompletedAI.summary}</p><p className="mt-2 text-xs text-slate-500">Self-reported confidence: {latestCompletedAI.confidence === null ? '—' : Number(latestCompletedAI.confidence).toFixed(2)}. This is not a calibrated probability.</p>{latestCompletedAI.uncertainty ? <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Uncertainty: {latestCompletedAI.uncertainty}</p> : null}<div className="mt-4 space-y-3">{criteria.map((criterion) => { const ai = aiScoreMap.get(criterion.id); return <div key={criterion.id} className="rounded-xl bg-slate-50 p-3"><div className="flex justify-between gap-3"><span className="text-sm font-semibold">{criterion.criterion_code}</span><span className="text-sm font-semibold">{ai ? Number(ai.proposed_score) : '—'} / {Number(criterion.max_score)}</span></div>{ai ? <><p className="mt-2 text-xs leading-5 text-slate-600">{ai.rationale}</p>{ai.errors.length ? <p className="mt-2 text-xs text-rose-700">Errors: {ai.errors.join('; ')}</p> : null}{ai.missing_concepts.length ? <p className="mt-1 text-xs text-amber-700">Missing: {ai.missing_concepts.join('; ')}</p> : null}</> : null}</div> })}</div><p className="mt-4 text-xs text-slate-400">{latestCompletedAI.model} · {latestCompletedAI.prompt_version} · {latestCompletedAI.input_tokens ?? '—'} input / {latestCompletedAI.output_tokens ?? '—'} output tokens</p></div></details> : latestCompletedAI ? <p className="mt-4 rounded-xl bg-sky-50 p-3 text-xs text-sky-800">AI proposal is stored but hidden until at least one human review is submitted, reducing anchoring during first-pass scoring.</p> : null}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Moderation</h2>{openModeration ? <><StatusBadge status="moderation" /><p className="mt-3 text-sm text-slate-700">{openModeration.reason}</p>{canFinalize ? <form action={resolveModeration.bind(null, programId, responseId, openModeration.id)} className="mt-5 space-y-3"><label className="block"><span className="text-sm font-medium text-slate-700">Moderator final score</span><input name="resolved_score" type="number" min="0" max={maxScore} step="0.001" required className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label><label className="block"><span className="text-sm font-medium text-slate-700">Resolution note</span><textarea name="resolution_note" rows={4} required className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label><button className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Resolve moderation and approve score</button></form> : <p className="mt-3 text-sm text-slate-500">Assessment Lead / Program Director resolution required.</p>}</> : <p className="mt-3 text-sm text-slate-500">No open moderation case.</p>}</div>

        <div className="rounded-3xl bg-sky-950 p-6 text-white"><p className="text-sm font-semibold tracking-[0.14em] text-sky-300">FINAL AUTHORITY</p>{finalDecision ? <><p className="mt-3 text-3xl font-semibold">{Number(finalDecision.final_score)} / {Number(finalDecision.max_score)}</p><p className="mt-2 text-sm text-sky-100">Finalized by human {finalDecision.decision_source === 'moderation' ? 'moderation' : 'review'}.</p></> : <><h2 className="mt-2 text-xl font-semibold">No final score yet.</h2><p className="mt-3 text-sm leading-6 text-sky-100">The database rejects AI-only finalization. A submitted human review or resolved moderation case is required.</p></>}</div>
      </div>
    </section>
  </AppShell>
}
