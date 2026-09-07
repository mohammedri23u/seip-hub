import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { MetricCard } from '@/components/metric-card'
import { StatusBadge } from '@/components/status-badge'
import { requireUser } from '@/lib/auth/require-user'

type ResponseRow = { id: string; attempt_id: string; question_version_id: string; text_response: string | null; submitted_at: string }
type AttemptRow = { id: string; assessment_id: string; learner_id: string; status: string }
type AssessmentRow = { id: string; title: string; cohort_id: string; status: string }
type VersionRow = { id: string; question_id: string; stem: string }
type QuestionRow = { id: string; question_code: string; question_type: string }
type CohortRow = { id: string; name: string }
type MappingRow = { question_version_id: string; rubric_version_id: string }
type ReviewRow = { id: string; response_id: string; status: string; total_score: number; max_score: number }
type ModerationRow = { id: string; response_id: string; status: string }
type FinalRow = { id: string; response_id: string; final_score: number; max_score: number }

export default async function GradingQueuePage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params
  const { supabase, userId } = await requireUser()
  const [{ data: program }, { data: membership }, { data: platformAdmin }, { data: cohorts }] = await Promise.all([
    supabase.from('programs').select('id, code').eq('id', programId).maybeSingle(),
    supabase.from('program_memberships').select('role').eq('program_id', programId).eq('user_id', userId).eq('status', 'active').maybeSingle(),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('cohorts').select('id, name').eq('program_id', programId),
  ])
  if (!program) notFound()
  const role = membership?.role
  const canGrade = Boolean(platformAdmin) || role === 'program_director' || role === 'assessment_lead' || role === 'reviewer'
  if (!canGrade) notFound()

  const cohortRows = (cohorts ?? []) as CohortRow[]
  const cohortIds = cohortRows.map((cohort) => cohort.id)
  const { data: assessmentsData } = cohortIds.length ? await supabase.from('assessments').select('id, title, cohort_id, status').in('cohort_id', cohortIds) : { data: [] }
  const assessments = (assessmentsData ?? []) as AssessmentRow[]
  const assessmentIds = assessments.map((assessment) => assessment.id)
  const { data: attemptsData } = assessmentIds.length ? await supabase.from('assessment_attempts').select('id, assessment_id, learner_id, status').in('assessment_id', assessmentIds).in('status', ['submitted', 'late']) : { data: [] }
  const attempts = (attemptsData ?? []) as AttemptRow[]
  const attemptIds = attempts.map((attempt) => attempt.id)
  const { data: responsesData } = attemptIds.length ? await supabase.from('student_responses').select('id, attempt_id, question_version_id, text_response, submitted_at').in('attempt_id', attemptIds).not('text_response', 'is', null).order('submitted_at', { ascending: true }) : { data: [] }
  const responses = (responsesData ?? []) as ResponseRow[]

  const versionIds = responses.map((response) => response.question_version_id)
  const [{ data: mappingsData }, { data: versionsData }] = versionIds.length ? await Promise.all([
    supabase.from('question_rubrics').select('question_version_id, rubric_version_id').in('question_version_id', versionIds),
    supabase.from('question_versions').select('id, question_id, stem').in('id', versionIds),
  ]) : [{ data: [] }, { data: [] }]
  const mappings = (mappingsData ?? []) as MappingRow[]
  const mappedVersionIds = new Set(mappings.map((mapping) => mapping.question_version_id))
  const gradableResponses = responses.filter((response) => mappedVersionIds.has(response.question_version_id))
  const versions = (versionsData ?? []) as VersionRow[]
  const questionIds = versions.map((version) => version.question_id)
  const { data: questionsData } = questionIds.length ? await supabase.from('questions').select('id, question_code, question_type').in('id', questionIds) : { data: [] }
  const questions = (questionsData ?? []) as QuestionRow[]
  const responseIds = gradableResponses.map((response) => response.id)
  const [{ data: reviewsData }, { data: moderationData }, { data: finalData }] = responseIds.length ? await Promise.all([
    supabase.from('human_reviews').select('id, response_id, status, total_score, max_score').in('response_id', responseIds),
    supabase.from('moderation_cases').select('id, response_id, status').in('response_id', responseIds),
    supabase.from('final_score_decisions').select('id, response_id, final_score, max_score').in('response_id', responseIds),
  ]) : [{ data: [] }, { data: [] }, { data: [] }]

  const assessmentMap = new Map(assessments.map((row) => [row.id, row]))
  const attemptMap = new Map(attempts.map((row) => [row.id, row]))
  const versionMap = new Map(versions.map((row) => [row.id, row]))
  const questionMap = new Map(questions.map((row) => [row.id, row]))
  const reviews = (reviewsData ?? []) as ReviewRow[]
  const moderations = (moderationData ?? []) as ModerationRow[]
  const finals = (finalData ?? []) as FinalRow[]
  const reviewByResponse = new Map(reviews.map((row) => [row.response_id, row]))
  const moderationByResponse = new Map(moderations.filter((row) => row.status === 'open' || row.status === 'in_review').map((row) => [row.response_id, row]))
  const finalByResponse = new Map(finals.map((row) => [row.response_id, row]))
  const finalizedCount = finalByResponse.size
  const moderationCount = moderationByResponse.size
  const pendingCount = gradableResponses.filter((response) => !finalByResponse.has(response.id)).length

  return <AppShell eyebrow={`${program.code} · GRADING`} title="Written grading queue" actions={<Link href={`/programs/${programId}/assessment`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium">Assessment Center</Link>}>
    <section className="grid gap-4 md:grid-cols-4"><MetricCard label="Gradable responses" value={gradableResponses.length} /><MetricCard label="Pending final" value={pendingCount} /><MetricCard label="Moderation" value={moderationCount} /><MetricCard label="Finalized" value={finalizedCount} /></section>
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div><h2 className="text-xl font-semibold">Human-governed grading workflow</h2><p className="mt-1 text-sm text-slate-500">AI proposals can support review, but only human review or resolved moderation can produce a final score.</p></div><div className="mt-5 space-y-3">{gradableResponses.length ? gradableResponses.map((response) => {
      const attempt = attemptMap.get(response.attempt_id)
      const assessment = attempt ? assessmentMap.get(attempt.assessment_id) : undefined
      const version = versionMap.get(response.question_version_id)
      const question = version ? questionMap.get(version.question_id) : undefined
      const review = reviewByResponse.get(response.id)
      const moderation = moderationByResponse.get(response.id)
      const finalDecision = finalByResponse.get(response.id)
      const status = finalDecision ? 'approved_results' : moderation ? 'moderation' : review?.status === 'submitted' ? 'grading' : 'review'
      return <Link key={response.id} href={`/programs/${programId}/assessment/grading/${response.id}`} className="block rounded-2xl border border-slate-200 p-4 hover:bg-slate-50"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{assessment?.title ?? 'Assessment'} · {question?.question_code ?? 'Written item'}</p><p className="mt-1 line-clamp-2 text-sm text-slate-600">{version?.stem}</p><p className="mt-2 text-xs text-slate-400">Response {response.id.slice(0, 8)}</p></div><div className="text-right"><StatusBadge status={status} />{finalDecision ? <p className="mt-2 text-sm font-semibold">{Number(finalDecision.final_score)} / {Number(finalDecision.max_score)}</p> : null}</div></div></Link>
    }) : <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No submitted written responses with an assigned rubric yet.</p>}</div></section>
  </AppShell>
}
