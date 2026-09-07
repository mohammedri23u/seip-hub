import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { MetricCard } from '@/components/metric-card'
import { StatusBadge } from '@/components/status-badge'
import { requireUser } from '@/lib/auth/require-user'
import { addAssessmentItem, addBlueprintRow, advanceAssessment, scheduleAssessment } from './actions'

type ObjectiveRow = { id: string; code: string; title: string }
type BlueprintRow = { id: string; learning_objective_id: string; target_weight: number | string | null; target_marks: number | string | null }
type ItemRow = { question_version_id: string; position: number; marks: number | string }
type VersionRow = { id: string; question_id: string; stem: string; version_number: number }
type QuestionRow = { id: string; question_code: string; question_type: string }
type ApprovedVersionRow = { id: string; question_id: string; version_number: number; marks: number }

export default async function AssessmentDetailPage({ params, searchParams }: { params: Promise<{ assessmentId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { assessmentId } = await params
  const query = await searchParams
  const { supabase, userId } = await requireUser()
  const { data: assessment } = await supabase.from('assessments').select('id, cohort_id, title, description, assessment_type, status, opens_at, closes_at, duration_minutes').eq('id', assessmentId).maybeSingle()
  if (!assessment) notFound()
  const { data: cohort } = await supabase.from('cohorts').select('id, name, program_id').eq('id', assessment.cohort_id).maybeSingle()
  if (!cohort) notFound()
  const [{ data: program }, { data: membership }, { data: platformAdmin }, { data: objectives }, { data: blueprint }, { data: items }] = await Promise.all([
    supabase.from('programs').select('name, code').eq('id', cohort.program_id).maybeSingle(),
    supabase.from('program_memberships').select('role').eq('program_id', cohort.program_id).eq('user_id', userId).eq('status', 'active').maybeSingle(),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('learning_objectives').select('id, code, title').eq('program_id', cohort.program_id).eq('status', 'active').order('code'),
    supabase.from('assessment_blueprint').select('id, learning_objective_id, target_weight, target_marks').eq('assessment_id', assessmentId),
    supabase.from('assessment_items').select('question_version_id, position, marks').eq('assessment_id', assessmentId).order('position'),
  ])
  if (!program) notFound()
  const canManage = Boolean(platformAdmin) || membership?.role === 'program_director' || membership?.role === 'assessment_lead'
  if (!canManage) notFound()

  const objectiveRows = (objectives ?? []) as ObjectiveRow[]
  const blueprintRows = (blueprint ?? []) as BlueprintRow[]
  const itemRows = (items ?? []) as ItemRow[]
  const itemVersionIds = itemRows.map((item) => item.question_version_id)
  const { data: itemVersions } = itemVersionIds.length ? await supabase.from('question_versions').select('id, question_id, stem, version_number').in('id', itemVersionIds) : { data: [] }
  const itemVersionRows = (itemVersions ?? []) as VersionRow[]
  const itemQuestionIds = itemVersionRows.map((version) => version.question_id)
  const { data: itemQuestions } = itemQuestionIds.length ? await supabase.from('questions').select('id, question_code, question_type').in('id', itemQuestionIds) : { data: [] }
  const itemQuestionRows = (itemQuestions ?? []) as QuestionRow[]

  const { data: approvedQuestions } = await supabase.from('questions').select('id, question_code, question_type').eq('program_id', cohort.program_id).eq('status', 'approved').order('question_code')
  const approvedQuestionRows = (approvedQuestions ?? []) as QuestionRow[]
  const approvedIds = approvedQuestionRows.map((question) => question.id)
  const { data: approvedVersions } = approvedIds.length ? await supabase.from('question_versions').select('id, question_id, version_number, marks').in('question_id', approvedIds).order('version_number', { ascending: false }) : { data: [] }
  const approvedVersionRows = (approvedVersions ?? []) as ApprovedVersionRow[]
  const latestVersionByQuestion = new Map<string, ApprovedVersionRow>()
  for (const version of approvedVersionRows) if (!latestVersionByQuestion.has(version.question_id)) latestVersionByQuestion.set(version.question_id, version)

  const objectiveMap = new Map(objectiveRows.map((objective) => [objective.id, objective]))
  const versionMap = new Map(itemVersionRows.map((version) => [version.id, version]))
  const questionMap = new Map(itemQuestionRows.map((question) => [question.id, question]))
  const totalMarks = itemRows.reduce((sum, item) => sum + Number(item.marks), 0)
  const totalBlueprintWeight = blueprintRows.reduce((sum, row) => sum + Number(row.target_weight ?? 0), 0)
  const transitionLabel: Record<string, string> = { draft: 'Send to review', review: 'Approve assessment', approved: 'Mark scheduled', scheduled: 'Go live', live: 'Close assessment', closed: 'Start grading' }

  return (
    <AppShell eyebrow={`${program.code} · ${cohort.name}`} title={assessment.title} actions={<Link href={`/programs/${cohort.program_id}/assessment`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium">Back to Assessment Center</Link>}>
      {query.error ? <p className="mb-5 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">Action failed: {query.error.replaceAll('_', ' ')}</p> : null}
      <section className="grid gap-4 md:grid-cols-4"><MetricCard label="Items" value={itemRows.length} /><MetricCard label="Total marks" value={totalMarks} /><MetricCard label="Blueprint weight" value={`${totalBlueprintWeight}%`} /><MetricCard label="Duration" value={assessment.duration_minutes ? `${assessment.duration_minutes} min` : '—'} /></section>
      <section className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.75fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Assessment items</h2><p className="mt-1 text-sm text-slate-500">Only approved, versioned questions can enter the exam.</p></div><StatusBadge status={assessment.status} /></div>
            <div className="mt-5 space-y-3">{itemRows.length ? itemRows.map((item) => { const version = versionMap.get(item.question_version_id); const question = version ? questionMap.get(version.question_id) : undefined; return <div key={item.question_version_id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{item.position}. {question?.question_code ?? 'Question'}</p><p className="mt-1 line-clamp-2 text-sm text-slate-600">{version?.stem}</p></div><span className="text-sm font-semibold">{Number(item.marks)} marks</span></div></div> }) : <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">No assessment items yet.</p>}</div>
            <form action={addAssessmentItem.bind(null, assessmentId)} className="mt-6 grid gap-3 border-t border-slate-200 pt-6 md:grid-cols-[1fr_140px_auto]">
              <select name="question_version_id" required className="rounded-xl border border-slate-300 px-3 py-2.5"><option value="">Select approved question</option>{approvedQuestionRows.map((question) => { const version = latestVersionByQuestion.get(question.id); return version ? <option key={version.id} value={version.id}>{question.question_code} · v{version.version_number} · {question.question_type.replaceAll('_', ' ')}</option> : null })}</select>
              <input name="marks" type="number" min="0.001" step="0.001" defaultValue="1" className="rounded-xl border border-slate-300 px-3 py-2.5" />
              <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Add item</button>
            </form>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Blueprint</h2><p className="mt-1 text-sm text-slate-500">Explicitly define intended coverage before release.</p>
            <div className="mt-5 space-y-3">{blueprintRows.map((row) => { const objective = objectiveMap.get(row.learning_objective_id); return <div key={row.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"><div><p className="font-semibold">{objective?.code ?? 'LO'}</p><p className="mt-1 text-sm text-slate-600">{objective?.title}</p></div><div className="text-right text-sm"><p className="font-semibold">{row.target_weight ?? '—'}%</p><p className="text-slate-500">{row.target_marks ?? '—'} marks</p></div></div> })}</div>
            <form action={addBlueprintRow.bind(null, assessmentId)} className="mt-6 grid gap-3 border-t border-slate-200 pt-6 md:grid-cols-[1fr_120px_120px_auto]"><select name="learning_objective_id" required className="rounded-xl border border-slate-300 px-3 py-2.5"><option value="">Learning objective</option>{objectiveRows.map((objective) => <option key={objective.id} value={objective.id}>{objective.code} — {objective.title}</option>)}</select><input name="target_weight" type="number" min="0" max="100" step="0.1" placeholder="Weight %" className="rounded-xl border border-slate-300 px-3 py-2.5" /><input name="target_marks" type="number" min="0" step="0.1" placeholder="Marks" className="rounded-xl border border-slate-300 px-3 py-2.5" /><button className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold">Add / update</button></form>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Delivery window</h2><p className="mt-1 text-sm text-slate-500">Times are stored in UTC after submission.</p><form action={scheduleAssessment.bind(null, assessmentId)} className="mt-5 space-y-4"><Input label="Opens" name="opens_at" type="datetime-local" defaultValue={toLocalInput(assessment.opens_at)} /><Input label="Closes" name="closes_at" type="datetime-local" defaultValue={toLocalInput(assessment.closes_at)} /><Input label="Duration (minutes)" name="duration_minutes" type="number" defaultValue={assessment.duration_minutes ? String(assessment.duration_minutes) : ''} /><button className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold">Save delivery settings</button></form></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Written grading</h2><p className="mt-1 text-sm text-slate-500">Rubric-based human review with optional AI proposals and moderation.</p><Link href={`/programs/${cohort.program_id}/assessment/grading`} className="mt-5 block rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold">Open grading queue</Link></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Lifecycle</h2><p className="mt-1 text-sm text-slate-500">Draft → Review → Approved → Scheduled → Live → Closed → Grading.</p><div className="mt-5"><StatusBadge status={assessment.status} /></div>{transitionLabel[assessment.status] ? <form action={advanceAssessment.bind(null, assessmentId)}><button className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">{transitionLabel[assessment.status]}</button></form> : <p className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No Stage 3 transition available from this state.</p>}</div>
          <div className="rounded-3xl bg-sky-950 p-6 text-white"><p className="text-sm font-semibold tracking-[0.14em] text-sky-300">LEARNER DELIVERY</p><h2 className="mt-2 text-xl font-semibold">Secure delivery is separated from the question bank.</h2><p className="mt-3 text-sm leading-6 text-sky-100">Learners receive stems and option text through a restricted RPC. Correct-answer flags and explanations are never exposed to the learner client.</p></div>
        </div>
      </section>
    </AppShell>
  )
}

function Input({ label, name, type = 'text', defaultValue = '' }: { label: string; name: string; type?: string; defaultValue?: string }) { return <label className="block"><span className="text-sm font-medium text-slate-700">{label}</span><input name={name} type={type} defaultValue={defaultValue} min={type === 'number' ? 1 : undefined} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label> }
function toLocalInput(value: string | null) { if (!value) return ''; const d = new Date(value); const offset = d.getTimezoneOffset(); return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16) }
