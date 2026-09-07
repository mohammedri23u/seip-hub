import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { MetricCard } from '@/components/metric-card'
import { StatusBadge } from '@/components/status-badge'
import { requireUser } from '@/lib/auth/require-user'
import { approveRubric, assignRubricToQuestion } from './actions'

type Criterion = { id: string; criterion_code: string; title: string; description: string | null; scoring_guidance: string | null; max_score: number; position: number }
type WrittenQuestion = { id: string; question_code: string; question_type: string }
type Assignment = { question_version_id: string; rubric_version_id: string }

export default async function RubricDetailPage({ params, searchParams }: { params: Promise<{ programId: string; rubricId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { programId, rubricId } = await params
  const query = await searchParams
  const { supabase, userId } = await requireUser()
  const [{ data: program }, { data: rubric }, { data: membership }, { data: platformAdmin }] = await Promise.all([
    supabase.from('programs').select('id, code').eq('id', programId).maybeSingle(),
    supabase.from('rubrics').select('id, rubric_code, title, description, status').eq('id', rubricId).eq('program_id', programId).maybeSingle(),
    supabase.from('program_memberships').select('role').eq('program_id', programId).eq('user_id', userId).eq('status', 'active').maybeSingle(),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
  ])
  if (!program || !rubric) notFound()
  const canManage = Boolean(platformAdmin) || membership?.role === 'program_director' || membership?.role === 'assessment_lead'

  const { data: versions } = await supabase.from('rubric_versions').select('id, version_number, instructions, reference_answer, moderation_threshold_points, created_at').eq('rubric_id', rubricId).order('version_number', { ascending: false })
  const latest = versions?.[0]
  if (!latest) notFound()
  const [{ data: criteria }, { data: writtenQuestions }, { data: assignments }] = await Promise.all([
    supabase.from('rubric_criteria').select('id, criterion_code, title, description, scoring_guidance, max_score, position').eq('rubric_version_id', latest.id).order('position'),
    supabase.from('questions').select('id, question_code, question_type').eq('program_id', programId).in('question_type', ['short_answer', 'structured_written']).order('question_code'),
    supabase.from('question_rubrics').select('question_version_id, rubric_version_id').eq('rubric_version_id', latest.id),
  ])
  const writtenQuestionRows = (writtenQuestions ?? []) as WrittenQuestion[]
  const assignmentRows = (assignments ?? []) as Assignment[]
  const questionIds = writtenQuestionRows.map((q) => q.id)
  const { data: questionVersions } = questionIds.length ? await supabase.from('question_versions').select('id, question_id, version_number, stem').in('question_id', questionIds).order('version_number', { ascending: false }) : { data: [] }
  const latestByQuestion = new Map<string, { id: string; question_id: string; version_number: number; stem: string }>()
  for (const version of questionVersions ?? []) if (!latestByQuestion.has(version.question_id)) latestByQuestion.set(version.question_id, version)
  const assignedIds = new Set(assignmentRows.map((a) => a.question_version_id))
  const criterionRows = (criteria ?? []) as Criterion[]
  const maxScore = criterionRows.reduce((sum, criterion) => sum + Number(criterion.max_score), 0)

  return <AppShell eyebrow={`${program.code} · RUBRIC`} title={`${rubric.rubric_code} — ${rubric.title}`} actions={<Link href={`/programs/${programId}/assessment/rubrics`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium">Back to rubrics</Link>}>
    {query.error ? <p className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">Action failed: {query.error.replaceAll('_', ' ')}</p> : null}
    <section className="grid gap-4 md:grid-cols-4"><MetricCard label="Version" value={`v${latest.version_number}`} /><MetricCard label="Criteria" value={criterionRows.length} /><MetricCard label="Max score" value={maxScore} /><MetricCard label="Question links" value={assignedIds.size} /></section>
    <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Criterion map</h2><p className="mt-1 text-sm text-slate-500">The same explicit rubric is used for AI proposals and human review.</p></div><StatusBadge status={rubric.status} /></div><div className="mt-5 space-y-3">{criterionRows.map((criterion) => <div key={criterion.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{criterion.criterion_code} · {criterion.title}</p>{criterion.description ? <p className="mt-1 text-sm text-slate-600">{criterion.description}</p> : null}</div><span className="font-semibold">{Number(criterion.max_score)}</span></div>{criterion.scoring_guidance ? <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{criterion.scoring_guidance}</p> : null}</div>)}</div></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Reference standard</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{latest.reference_answer || 'No reference answer supplied. The criterion guidance remains the scoring authority.'}</p>{latest.instructions ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{latest.instructions}</p> : null}</div>
      </div>
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Question assignment</h2><p className="mt-1 text-sm text-slate-500">Attach this immutable rubric version to a written question version.</p>{rubric.status !== 'approved' ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Approve the rubric before assigning it to a question.</p> : null}<div className="mt-5 space-y-3">{writtenQuestionRows.map((question) => { const version = latestByQuestion.get(question.id); if (!version) return null; const assigned = assignedIds.has(version.id); return <div key={question.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{question.question_code} · v{version.version_number}</p><p className="mt-1 line-clamp-2 text-sm text-slate-600">{version.stem}</p></div>{assigned ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Assigned</span> : null}</div>{canManage && rubric.status === 'approved' && !assigned ? <form action={assignRubricToQuestion.bind(null, programId, rubricId)} className="mt-3"><input type="hidden" name="question_version_id" value={version.id} /><input type="hidden" name="rubric_version_id" value={latest.id} /><button className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">Assign rubric</button></form> : null}</div>})}</div></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Moderation rule</h2><p className="mt-2 text-sm text-slate-600">{latest.moderation_threshold_points === null ? 'No automatic disagreement threshold configured. Reviewers can still send a response to moderation manually.' : `Open moderation when the absolute AI–human difference reaches ${latest.moderation_threshold_points} points.`}</p>{canManage && rubric.status === 'draft' ? <form action={approveRubric.bind(null, programId, rubricId)}><button className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Approve rubric</button></form> : null}</div>
      </div>
    </section>
  </AppShell>
}
