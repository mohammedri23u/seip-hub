import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { requireUser } from '@/lib/auth/require-user'
import { createQuestion } from './actions'

export default async function NewQuestionPage({ params, searchParams }: { params: Promise<{ programId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { programId } = await params
  const query = await searchParams
  const { supabase, userId } = await requireUser()
  const [{ data: program }, { data: membership }, { data: platformAdmin }, { data: objectives }] = await Promise.all([
    supabase.from('programs').select('name, code').eq('id', programId).maybeSingle(),
    supabase.from('program_memberships').select('role').eq('program_id', programId).eq('user_id', userId).eq('status', 'active').maybeSingle(),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('learning_objectives').select('id, code, title').eq('program_id', programId).eq('status', 'active').order('code'),
  ])
  if (!program) notFound()
  const canManage = Boolean(platformAdmin) || membership?.role === 'program_director' || membership?.role === 'assessment_lead'
  if (!canManage) notFound()

  return (
    <AppShell eyebrow={`${program.code} · QUESTION BANK`} title="Author question" actions={<Link href={`/programs/${programId}/assessment`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium">Back to Assessment Center</Link>}>
      <form action={createQuestion.bind(null, programId)} className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Question content</h2>
          {query.error ? <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">Question could not be created. Review the fields and try again.</p> : null}
          <div className="mt-5 space-y-4">
            <Input label="Question code" name="code" placeholder="CR-001" />
            <label className="block"><span className="text-sm font-medium text-slate-700">Question type</span><select name="question_type" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="single_best_answer">Single Best Answer</option><option value="short_answer">Short Answer</option><option value="structured_written">Structured Written</option></select></label>
            <label className="block"><span className="text-sm font-medium text-slate-700">Stem</span><textarea name="stem" rows={8} required className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" placeholder="Write the clinical scenario or question prompt..." /></label>
            <label className="block"><span className="text-sm font-medium text-slate-700">Explanation / model answer</span><textarea name="explanation" rows={5} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Metadata</h2>
            <div className="mt-5 space-y-4">
              <label className="block"><span className="text-sm font-medium text-slate-700">Learning objective</span><select name="learning_objective_id" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="">Not mapped yet</option>{(objectives ?? []).map((objective) => <option key={objective.id} value={objective.id}>{objective.code} — {objective.title}</option>)}</select></label>
              <label className="block"><span className="text-sm font-medium text-slate-700">Difficulty target</span><select name="difficulty_target" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="moderate">Moderate</option><option value="easy">Easy</option><option value="hard">Hard</option><option value="expert">Expert</option></select></label>
              <Input label="Default marks" name="marks" type="number" defaultValue="1" />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">SBA options</h2>
            <p className="mt-1 text-sm text-slate-500">Used when Question Type is Single Best Answer.</p>
            <div className="mt-5 space-y-3">{['a', 'b', 'c', 'd'].map((letter) => <Input key={letter} label={`Option ${letter.toUpperCase()}`} name={`option_${letter}`} required={false} />)}</div>
            <label className="mt-4 block"><span className="text-sm font-medium text-slate-700">Correct option</span><select name="correct_option" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option>A</option><option>B</option><option>C</option><option>D</option></select></label>
          </section>
          <button className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Create draft question</button>
        </div>
      </form>
    </AppShell>
  )
}

function Input({ label, name, placeholder, type = 'text', required = true, defaultValue }: { label: string; name: string; placeholder?: string; type?: string; required?: boolean; defaultValue?: string }) {
  return <label className="block"><span className="text-sm font-medium text-slate-700">{label}</span><input name={name} type={type} placeholder={placeholder} required={required} defaultValue={defaultValue} min={type === 'number' ? 0.001 : undefined} step={type === 'number' ? '0.001' : undefined} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
}
