import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { MetricCard } from '@/components/metric-card'
import { StatusBadge } from '@/components/status-badge'
import { requireUser } from '@/lib/auth/require-user'
import { createCohort } from './actions'

export default async function ProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { programId } = await params
  const query = await searchParams
  const { supabase, userId } = await requireUser()

  const [{ data: program }, { data: membership }, { data: platformAdmin }, { data: cohorts }, { count: loCount }] = await Promise.all([
    supabase.from('programs').select('id, name, code, description, status').eq('id', programId).maybeSingle(),
    supabase.from('program_memberships').select('role').eq('program_id', programId).eq('user_id', userId).eq('status', 'active').maybeSingle(),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('cohorts').select('id, name, start_date, end_date, status').eq('program_id', programId).order('start_date', { ascending: false }),
    supabase.from('learning_objectives').select('id', { count: 'exact', head: true }).eq('program_id', programId).eq('status', 'active'),
  ])

  if (!program) notFound()

  const canManage = membership?.role === 'program_director' || Boolean(platformAdmin)
  const cohortRows = (cohorts ?? []) as Array<{ id: string; name: string; start_date: string | null; end_date: string | null; status: string }>
  const cohortIds = cohortRows.map((cohort) => cohort.id)
  let sessionCount = 0
  if (cohortIds.length) {
    const { count } = await supabase.from('sessions').select('id', { count: 'exact', head: true }).in('cohort_id', cohortIds)
    sessionCount = count ?? 0
  }

  return (
    <AppShell
      eyebrow={`${program.code} · PROGRAM`}
      title={program.name}
      actions={<Link href="/dashboard" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium">Back to dashboard</Link>}
    >
      {program.description ? <p className="mb-7 max-w-3xl text-slate-600">{program.description}</p> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Cohorts" value={cohortRows.length} />
        <MetricCard label="Sessions" value={sessionCount} />
        <MetricCard label="Active learning objectives" value={loCount ?? 0} />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Cohorts</h2>
              <p className="mt-1 text-sm text-slate-500">Each cohort owns its groups, sessions, and learner roster.</p>
            </div>
            <StatusBadge status={program.status} />
          </div>

          <div className="mt-5 space-y-3">
            {cohortRows.length ? cohortRows.map((cohort) => (
              <Link key={cohort.id} href={`/programs/${programId}/cohorts/${cohort.id}`} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-4 hover:bg-slate-50">
                <div>
                  <p className="font-semibold">{cohort.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{formatDateRange(cohort.start_date, cohort.end_date)}</p>
                </div>
                <StatusBadge status={cohort.status} />
              </Link>
            )) : <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">No cohorts yet.</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Create cohort</h2>
          <p className="mt-1 text-sm text-slate-500">Program Director only.</p>
          {query.error ? <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">Cohort creation failed.</p> : null}

          {canManage ? (
            <form action={createCohort.bind(null, programId)} className="mt-5 space-y-4">
              <Input label="Cohort name" name="name" placeholder="SEIP 2026-A" />
              <Input label="Start date" name="start_date" type="date" />
              <Input label="End date" name="end_date" type="date" />
              <button className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Create cohort</button>
            </form>
          ) : (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Your role does not allow cohort management.</div>
          )}
        </div>
      </section>
    </AppShell>
  )
}

function Input({ label, name, placeholder, type = 'text' }: { label: string; name: string; placeholder?: string; type?: string }) {
  return <label className="block"><span className="text-sm font-medium text-slate-700">{label}</span><input name={name} type={type} placeholder={placeholder} required={name === 'name'} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label>
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return 'Dates not set'
  if (start && !end) return `Starts ${start}`
  if (!start && end) return `Ends ${end}`
  return `${start} → ${end}`
}
