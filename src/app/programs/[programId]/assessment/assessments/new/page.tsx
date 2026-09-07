import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { requireUser } from '@/lib/auth/require-user'
import { createAssessment } from './actions'

export default async function NewAssessmentPage({ params, searchParams }: { params: Promise<{ programId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { programId } = await params
  const query = await searchParams
  const { supabase, userId } = await requireUser()
  const [{ data: program }, { data: membership }, { data: platformAdmin }, { data: cohorts }] = await Promise.all([
    supabase.from('programs').select('name, code').eq('id', programId).maybeSingle(),
    supabase.from('program_memberships').select('role').eq('program_id', programId).eq('user_id', userId).eq('status', 'active').maybeSingle(),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('cohorts').select('id, name, status').eq('program_id', programId).order('created_at', { ascending: false }),
  ])
  if (!program) notFound()
  const canManage = Boolean(platformAdmin) || membership?.role === 'program_director' || membership?.role === 'assessment_lead'
  if (!canManage) notFound()

  return (
    <AppShell eyebrow={`${program.code} · ASSESSMENT`} title="Create assessment" actions={<Link href={`/programs/${programId}/assessment`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium">Back to Assessment Center</Link>}>
      <form action={createAssessment.bind(null, programId)} className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {query.error ? <p className="mb-5 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">Assessment could not be created.</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2 block"><span className="text-sm font-medium text-slate-700">Title</span><input name="title" required placeholder="SEIP Formative Assessment 01" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          <label className="block"><span className="text-sm font-medium text-slate-700">Cohort</span><select name="cohort_id" required className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="">Select cohort</option>{(cohorts ?? []).map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</select></label>
          <label className="block"><span className="text-sm font-medium text-slate-700">Assessment type</span><select name="assessment_type" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="formative">Formative</option><option value="diagnostic">Diagnostic</option><option value="session_quiz">Session Quiz</option><option value="progress">Progress</option><option value="final">Final</option></select></label>
          <label className="block"><span className="text-sm font-medium text-slate-700">Duration (minutes)</span><input name="duration_minutes" type="number" min="1" placeholder="30" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
          <label className="md:col-span-2 block"><span className="text-sm font-medium text-slate-700">Description</span><textarea name="description" rows={4} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
        </div>
        <button className="mt-6 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Create draft assessment</button>
      </form>
    </AppShell>
  )
}
