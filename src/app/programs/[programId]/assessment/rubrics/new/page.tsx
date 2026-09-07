import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { requireUser } from '@/lib/auth/require-user'
import { createRubric } from './actions'

export default async function NewRubricPage({ params, searchParams }: { params: Promise<{ programId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { programId } = await params
  const query = await searchParams
  const { supabase, userId } = await requireUser()
  const [{ data: program }, { data: membership }, { data: platformAdmin }] = await Promise.all([
    supabase.from('programs').select('id, name, code').eq('id', programId).maybeSingle(),
    supabase.from('program_memberships').select('role').eq('program_id', programId).eq('user_id', userId).eq('status', 'active').maybeSingle(),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
  ])
  if (!program) notFound()
  const canManage = Boolean(platformAdmin) || membership?.role === 'program_director' || membership?.role === 'assessment_lead'
  if (!canManage) notFound()

  return (
    <AppShell eyebrow={`${program.code} · RUBRIC`} title="New written-assessment rubric" actions={<Link href={`/programs/${programId}/assessment/rubrics`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium">Back to rubrics</Link>}>
      <form action={createRubric.bind(null, programId)} className="mx-auto max-w-5xl space-y-6">
        {query.error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">Could not create rubric: {query.error.replaceAll('_', ' ')}</p> : null}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Rubric identity</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2"><Input label="Rubric code" name="rubric_code" placeholder="CR-SA-01" /><Input label="Title" name="title" placeholder="Clinical reasoning short-answer rubric" /></div>
          <Textarea label="Description" name="description" placeholder="What construct this rubric is intended to assess." />
          <Textarea label="Scoring instructions" name="instructions" placeholder="General scoring rules applied by both human reviewers and the AI assistant." />
          <Textarea label="Reference answer" name="reference_answer" placeholder="Optional expert reference/model answer. Keep it criterion-aligned." rows={6} />
          <Input label="Automatic moderation threshold (absolute points, optional)" name="moderation_threshold_points" type="number" step="0.001" required={false} placeholder="Leave blank until the program defines a threshold" />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div><h2 className="text-xl font-semibold">Criterion-level scoring</h2><p className="mt-1 text-sm text-slate-500">Add at least one criterion. Each criterion has an explicit maximum and scoring guidance.</p></div>
          <div className="mt-5 space-y-5">{Array.from({ length: 6 }, (_, index) => <CriterionFields key={index} n={index + 1} />)}</div>
        </section>

        <div className="rounded-3xl bg-sky-950 p-6 text-white"><p className="text-sm font-semibold tracking-[0.14em] text-sky-300">GOVERNANCE</p><p className="mt-2 text-sm leading-6 text-sky-100">AI will only propose criterion scores and feedback. A human review is mandatory before any final score can be approved.</p></div>
        <button className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Create rubric version 1</button>
      </form>
    </AppShell>
  )
}

function CriterionFields({ n }: { n: number }) {
  return <div className="rounded-2xl border border-slate-200 p-4"><div className="grid gap-3 md:grid-cols-[120px_1fr_140px]"><Input label="Code" name={`criterion_${n}_code`} required={false} placeholder={`C${n}`} /><Input label={`Criterion ${n}`} name={`criterion_${n}_title`} required={n !== 1} placeholder={n === 1 ? 'Diagnostic reasoning' : 'Optional'} /><Input label="Max score" name={`criterion_${n}_max`} type="number" step="0.001" required={n === 1} placeholder="2" /></div><Textarea label="Description" name={`criterion_${n}_description`} required={false} placeholder="Observable construct or expected evidence." /><Textarea label="Scoring guidance" name={`criterion_${n}_guidance`} required={false} placeholder="Describe what earns partial versus full credit." /></div>
}

function Input({ label, name, type = 'text', step, required = true, placeholder }: { label: string; name: string; type?: string; step?: string; required?: boolean; placeholder?: string }) {
  return <label className="block"><span className="text-sm font-medium text-slate-700">{label}</span><input name={name} type={type} step={step} required={required} placeholder={placeholder} min={type === 'number' ? 0 : undefined} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label>
}
function Textarea({ label, name, placeholder, rows = 3, required = false }: { label: string; name: string; placeholder?: string; rows?: number; required?: boolean }) {
  return <label className="mt-4 block"><span className="text-sm font-medium text-slate-700">{label}</span><textarea name={name} rows={rows} required={required} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label>
}
