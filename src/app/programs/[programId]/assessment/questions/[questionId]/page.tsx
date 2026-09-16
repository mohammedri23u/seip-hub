import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { StatusBadge } from '@/components/status-badge'
import { requireUser } from '@/lib/auth/require-user'
import { setQuestionStatus } from './actions'

export default async function QuestionDetailPage({ params, searchParams }: { params: Promise<{ programId: string; questionId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { programId, questionId } = await params
  const query = await searchParams
  const { supabase, userId } = await requireUser()
  const [{ data: program }, { data: question }, { data: membership }, { data: platformAdmin }] = await Promise.all([
    supabase.from('programs').select('name, code').eq('id', programId).maybeSingle(),
    supabase.from('questions').select('id, question_code, question_type, status').eq('id', questionId).eq('program_id', programId).maybeSingle(),
    supabase.from('program_memberships').select('role').eq('program_id', programId).eq('user_id', userId).eq('status', 'active').maybeSingle(),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
  ])
  if (!program || !question) notFound()
  const canManage = Boolean(platformAdmin) || membership?.role === 'program_director' || membership?.role === 'assessment_lead'
  const { data: versions } = await supabase.from('question_versions').select('id, version_number, stem, explanation, difficulty_target, marks, created_at').eq('question_id', questionId).order('version_number', { ascending: false })
  const version = versions?.[0]
  const [{ data: options }, { data: mappings }, { data: rubricMapping }] = version ? await Promise.all([
    supabase.from('question_options').select('id, option_text, is_correct, position').eq('question_version_id', version.id).order('position'),
    supabase.from('question_learning_objectives').select('learning_objective_id, weight').eq('question_version_id', version.id),
    supabase.from('question_rubrics').select('rubric_version_id').eq('question_version_id', version.id).maybeSingle(),
  ]) : [{ data: [] }, { data: [] }, { data: null }]
  const objectiveIds = (mappings ?? []).map((mapping) => mapping.learning_objective_id)
  const { data: objectives } = objectiveIds.length ? await supabase.from('learning_objectives').select('id, code, title').in('id', objectiveIds) : { data: [] }

  let linkedRubric: { code: string; title: string; version: number } | null = null
  if (rubricMapping?.rubric_version_id) {
    const { data: rubricVersion } = await supabase.from('rubric_versions').select('rubric_id, version_number').eq('id', rubricMapping.rubric_version_id).maybeSingle()
    if (rubricVersion) {
      const { data: rubric } = await supabase.from('rubrics').select('rubric_code, title').eq('id', rubricVersion.rubric_id).maybeSingle()
      if (rubric) linkedRubric = { code: rubric.rubric_code, title: rubric.title, version: rubricVersion.version_number }
    }
  }

  return (
    <AppShell eyebrow={`${program.code} · QUESTION`} title={question.question_code} actions={<Link href={`/programs/${programId}/assessment`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium">Back to Assessment Center</Link>}>
      {query.error ? <p className="mb-5 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">Question update failed.</p> : null}
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm capitalize text-slate-500">{question.question_type.replaceAll('_', ' ')} · Version {version?.version_number ?? '—'}</p><h2 className="mt-3 text-xl font-semibold leading-relaxed">{version?.stem ?? 'No version found'}</h2></div><StatusBadge status={question.status} /></div>
          {(options ?? []).length ? <div className="mt-6 space-y-3">{(options ?? []).map((option) => <div key={option.id} className={`rounded-2xl border p-4 ${option.is_correct ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}><span className="mr-3 text-sm font-semibold text-slate-500">{String.fromCharCode(64 + option.position)}.</span>{option.option_text}{option.is_correct ? <span className="ml-3 text-xs font-semibold text-emerald-700">CORRECT</span> : null}</div>)}</div> : null}
          {version?.explanation ? <div className="mt-6 rounded-2xl bg-slate-50 p-5"><p className="text-sm font-semibold">Explanation / model answer</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{version.explanation}</p></div> : null}
        </div>
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Metadata</h2><dl className="mt-5 space-y-4 text-sm"><Row label="Difficulty" value={version?.difficulty_target ?? 'Not set'} /><Row label="Marks" value={String(version?.marks ?? '—')} /><Row label="Mapped objectives" value={String((objectives ?? []).length)} /><Row label="Linked rubric" value={linkedRubric ? linkedRubric.code : 'Not linked'} /></dl>{(objectives ?? []).map((objective) => <div key={objective.id} className="mt-3 rounded-xl bg-slate-50 p-3 text-sm"><span className="font-semibold">{objective.code}</span><span className="ml-2 text-slate-600">{objective.title}</span></div>)}{linkedRubric ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"><p className="font-semibold text-amber-950">{linkedRubric.code} · v{linkedRubric.version}</p><p className="mt-1 text-amber-900">{linkedRubric.title}</p></div> : null}</div>
          {canManage ? <form action={setQuestionStatus.bind(null, programId, questionId)} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Item lifecycle</h2><p className="mt-1 text-sm text-slate-500">Only approved items can be added to an assessment.</p><select name="status" defaultValue={question.status} className="mt-5 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="draft">Draft</option><option value="review">Review</option><option value="approved">Approved</option><option value="retired">Retired</option></select><button className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Update status</button></form> : null}
        </div>
      </section>
    </AppShell>
  )
}

function Row({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4"><dt className="text-slate-500">{label}</dt><dd className="font-medium capitalize">{value.replaceAll('_', ' ')}</dd></div> }
