import { programMembership } from '@/lib/auth/program-membership'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { MetricCard } from '@/components/metric-card'
import { requireUser } from '@/lib/auth/require-user'
import { cancelDoubleRating, requireDoubleRating } from './actions'

type ResponseRow = { id: string; attempt_id: string; question_version_id: string; submitted_at: string }
type AttemptRow = { id: string; assessment_id: string; status: string }
type AssessmentRow = { id: string; title: string }
type VersionRow = { id: string; question_id: string }
type QuestionRow = { id: string; question_code: string }
type SampleRow = { response_id: string; required_reviews: number; reason: string; status: string; created_at: string }
type ReviewRow = { response_id: string; status: string; reviewer_id: string }

type QualitySettings = {
  double_rating_required: boolean
  double_rating_target_count: number | null
  double_rating_selection_rule: string | null
}

export default async function DoubleRatingPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>
  searchParams: Promise<{ saved?: string; cancelled?: string; error?: string }>
}) {
  const { programId } = await params
  const query = await searchParams
  const { supabase, userId } = await requireUser()

  const [{ data: program }, { data: membership }, { data: platformAdmin }, { data: qualityData }, { data: sequenceData }] = await Promise.all([
    supabase.from('programs').select('id, code, name').eq('id', programId).maybeSingle(),
    programMembership(supabase, programId, userId),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('program_assessment_quality_settings').select('double_rating_required, double_rating_target_count, double_rating_selection_rule').eq('program_id', programId).maybeSingle(),
    supabase.from('program_assessment_sequences').select('pre_assessment_id, post_assessment_id').eq('program_id', programId).eq('active', true),
  ])
  if (!program) notFound()
  const canManage = Boolean(platformAdmin) || membership?.role === 'program_director' || membership?.role === 'assessment_lead'
  const canView = canManage || membership?.role === 'reviewer'
  if (!canView) notFound()

  const quality = qualityData as QualitySettings | null
  const formIds = [...new Set((sequenceData ?? []).flatMap((row) => [row.pre_assessment_id, row.post_assessment_id]))]
  const { data: assessmentsData } = formIds.length
    ? await supabase.from('assessments').select('id, title').in('id', formIds)
    : { data: [] }
  const assessments = (assessmentsData ?? []) as AssessmentRow[]
  const { data: attemptsData } = formIds.length
    ? await supabase.from('assessment_attempts').select('id, assessment_id, status').in('assessment_id', formIds).in('status', ['submitted', 'late'])
    : { data: [] }
  const attempts = (attemptsData ?? []) as AttemptRow[]
  const attemptIds = attempts.map((attempt) => attempt.id)
  const { data: responsesData } = attemptIds.length
    ? await supabase.from('student_responses').select('id, attempt_id, question_version_id, submitted_at').in('attempt_id', attemptIds).not('text_response', 'is', null).order('submitted_at', { ascending: true })
    : { data: [] }
  const responses = (responsesData ?? []) as ResponseRow[]
  const versionIds = responses.map((response) => response.question_version_id)
  const { data: versionsData } = versionIds.length
    ? await supabase.from('question_versions').select('id, question_id').in('id', versionIds)
    : { data: [] }
  const versions = (versionsData ?? []) as VersionRow[]
  const questionIds = [...new Set(versions.map((version) => version.question_id))]
  const { data: questionsData } = questionIds.length
    ? await supabase.from('questions').select('id, question_code').in('id', questionIds)
    : { data: [] }
  const questions = (questionsData ?? []) as QuestionRow[]
  const responseIds = responses.map((response) => response.id)
  const [{ data: sampleData }, { data: reviewData }] = responseIds.length ? await Promise.all([
    supabase.from('grading_quality_samples').select('response_id, required_reviews, reason, status, created_at').eq('program_id', programId).in('response_id', responseIds),
    supabase.from('human_reviews').select('response_id, status, reviewer_id').in('response_id', responseIds).eq('status', 'submitted'),
  ]) : [{ data: [] }, { data: [] }]

  const samples = (sampleData ?? []) as SampleRow[]
  const reviews = (reviewData ?? []) as ReviewRow[]
  const sampleMap = new Map(samples.map((sample) => [sample.response_id, sample]))
  const reviewCount = new Map<string, number>()
  for (const review of reviews) reviewCount.set(review.response_id, (reviewCount.get(review.response_id) ?? 0) + 1)
  const attemptMap = new Map(attempts.map((attempt) => [attempt.id, attempt]))
  const assessmentMap = new Map(assessments.map((assessment) => [assessment.id, assessment]))
  const versionMap = new Map(versions.map((version) => [version.id, version]))
  const questionMap = new Map(questions.map((question) => [question.id, question]))

  const assignedSamples = samples.filter((sample) => sample.status === 'assigned')
  const completedSamples = samples.filter((sample) => sample.status === 'complete')
  const activeSampleCount = assignedSamples.length + completedSamples.length
  const targetCount = quality?.double_rating_target_count ?? null
  const ruleConfigured = Boolean(quality?.double_rating_required && targetCount && quality?.double_rating_selection_rule?.trim())

  return <AppShell
    eyebrow={`${program.code} · RATER QUALITY`}
    title="Blinded double-rating sample"
    actions={<>
      <Link href={`/programs/${programId}/assessment/grading`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">Grading queue</Link>
      <Link href={`/programs/${programId}/pilot`} className="rounded-xl bg-[#17363A] px-4 py-2.5 text-sm font-semibold text-white">Pilot Readiness</Link>
    </>}
  >
    {query.saved === '1' ? <p role="status" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Response added to the prospective double-rating sample.</p> : null}
    {query.cancelled === '1' ? <p role="status" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">Sample assignment cancelled and preserved in the audit trail.</p> : null}
    {query.error ? <p role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">Action failed: {query.error.replaceAll('_', ' ')}.</p> : null}

    <section className="grid gap-4 md:grid-cols-4">
      <MetricCard label="Eligible written responses" value={responses.length} />
      <MetricCard label="Sample target" value={targetCount ?? 'Not set'} />
      <MetricCard label="Assigned / complete" value={activeSampleCount} />
      <MetricCard label="Completed double ratings" value={completedSamples.length} />
    </section>

    <section className={`mt-7 rounded-[28px] border p-6 ${ruleConfigured ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <p className="text-xs font-black tracking-[.15em] text-slate-500">PROSPECTIVE SAMPLING RULE</p>
      <h2 className={`mt-2 font-serif text-2xl font-bold ${ruleConfigured ? 'text-emerald-900' : 'text-amber-950'}`}>{ruleConfigured ? `${activeSampleCount} of ${targetCount} selected` : 'Selection is locked until the rule is configured'}</h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">{quality?.double_rating_selection_rule?.trim() || 'Set the sample size and prospective selection rule in Pilot Readiness before selecting any responses. The system does not invent a sampling method after seeing learner performance.'}</p>
    </section>

    <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black tracking-[.15em] text-[#8B6A2B]">BLIND REVIEW OPERATIONS</p><h2 className="mt-2 font-serif text-2xl font-bold text-[#17363A]">Form A/B response pool</h2><p className="mt-1 text-sm text-slate-500">No learner name, email or learner ID is shown here. Use response identifiers only.</p></div><span className="text-xs font-bold text-slate-500">Finalization is DB-blocked for assigned samples until 2 submitted human reviews exist.</span></div>

      <div className="mt-5 space-y-3">
        {responses.length ? responses.map((response) => {
          const attempt = attemptMap.get(response.attempt_id)
          const assessment = attempt ? assessmentMap.get(attempt.assessment_id) : undefined
          const version = versionMap.get(response.question_version_id)
          const question = version ? questionMap.get(version.question_id) : undefined
          const sample = sampleMap.get(response.id)
          const submittedReviews = reviewCount.get(response.id) ?? 0
          const canAdd = canManage && ruleConfigured && !sample && (targetCount === null || activeSampleCount < targetCount)
          return <div key={response.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">{assessment?.title ?? 'Form'} · {question?.question_code ?? 'Written task'}</p>
                <p className="mt-1 text-xs text-slate-500">Response {response.id.slice(0, 12)} · submitted {new Date(response.submitted_at).toLocaleString()}</p>
              </div>
              <div className="text-right"><p className="text-sm font-black text-[#17363A]">{submittedReviews} human review{submittedReviews === 1 ? '' : 's'}</p>{sample ? <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wide ${sample.status === 'complete' ? 'bg-emerald-100 text-emerald-800' : sample.status === 'cancelled' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-900'}`}>{sample.status}</span> : null}</div>
            </div>

            {sample ? <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><p><strong>Reason:</strong> {sample.reason}</p><p className="mt-1">Required reviews: {sample.required_reviews}</p>{sample.status === 'assigned' && canManage ? <form action={cancelDoubleRating.bind(null, programId, response.id)}><button className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">Cancel assignment</button></form> : null}</div> : canAdd ? <form action={requireDoubleRating.bind(null, programId, response.id)} className="mt-4 flex flex-col gap-3 md:flex-row"><input name="reason" minLength={10} required placeholder="Why this response is selected under the pre-specified rule" className="min-h-11 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" /><button className="rounded-xl bg-[#17363A] px-4 py-2.5 text-sm font-black text-white">Require double rating</button></form> : null}

            <div className="mt-3"><Link href={`/programs/${programId}/assessment/grading/${response.id}`} className="text-sm font-bold text-[#1F6668]">Open blinded grading record →</Link></div>
          </div>
        }) : <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No submitted Form A/B written responses are available yet.</p>}
      </div>
    </section>
  </AppShell>
}
