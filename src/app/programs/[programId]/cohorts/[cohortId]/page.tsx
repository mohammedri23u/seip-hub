import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { MetricCard } from '@/components/metric-card'
import { StatusBadge } from '@/components/status-badge'
import { requireUser } from '@/lib/auth/require-user'
import { createSession } from './actions'

export default async function CohortPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string; cohortId: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { programId, cohortId } = await params
  const query = await searchParams
  const { supabase, userId } = await requireUser()

  const [{ data: cohort }, { data: program }, { data: membership }, { data: platformAdmin }, { data: sessions }, { count: learnerCount }] = await Promise.all([
    supabase.from('cohorts').select('id, name, start_date, end_date, status, program_id').eq('id', cohortId).eq('program_id', programId).maybeSingle(),
    supabase.from('programs').select('name, code').eq('id', programId).maybeSingle(),
    supabase.from('program_memberships').select('role').eq('program_id', programId).eq('user_id', userId).eq('status', 'active').maybeSingle(),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('sessions').select('id, title, scheduled_at, duration_minutes, status, join_code').eq('cohort_id', cohortId).order('scheduled_at', { ascending: true, nullsFirst: false }),
    supabase.from('cohort_memberships').select('id', { count: 'exact', head: true }).eq('cohort_id', cohortId).eq('member_type', 'learner').eq('status', 'active'),
  ])

  if (!cohort || !program) notFound()
  const canManage = membership?.role === 'program_director' || Boolean(platformAdmin)
  const sessionRows = (sessions ?? []) as Array<{ id: string; title: string; scheduled_at: string | null; duration_minutes: number | null; status: string; join_code: string | null }>
  const liveOrScheduled = sessionRows.filter((session) => session.status === 'live' || session.status === 'scheduled').length

  return (
    <AppShell
      eyebrow={`${program.code} · COHORT`}
      title={cohort.name}
      actions={<Link href={`/programs/${programId}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium">Back to program</Link>}
    >
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Learners" value={learnerCount ?? 0} />
        <MetricCard label="Sessions" value={sessionRows.length} />
        <MetricCard label="Upcoming / live" value={liveOrScheduled} />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="text-xl font-semibold">Sessions</h2><p className="mt-1 text-sm text-slate-500">Teaching schedule for this cohort.</p></div>
            <StatusBadge status={cohort.status} />
          </div>
          <div className="mt-5 space-y-3">
            {sessionRows.length ? sessionRows.map((session) => (
              <Link key={session.id} href={`/sessions/${session.id}`} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-4 hover:bg-slate-50">
                <div>
                  <p className="font-semibold">{session.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{formatDateTime(session.scheduled_at)}{session.duration_minutes ? ` · ${session.duration_minutes} min` : ''}</p>
                </div>
                <StatusBadge status={session.status} />
              </Link>
            )) : <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">No sessions yet.</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Create session</h2>
          <p className="mt-1 text-sm text-slate-500">A unique join code is generated automatically.</p>
          {query.error ? <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">Session creation failed.</p> : null}

          {canManage ? (
            <form action={createSession.bind(null, programId, cohortId)} className="mt-5 space-y-4">
              <Input label="Session title" name="title" placeholder="Clinical Reasoning 01" />
              <Input label="Scheduled time" name="scheduled_at" type="datetime-local" />
              <Input label="Duration (minutes)" name="duration_minutes" type="number" placeholder="60" />
              <button className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Create session</button>
            </form>
          ) : <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Your role does not allow session creation.</div>}
        </div>
      </section>
    </AppShell>
  )
}

function Input({ label, name, placeholder, type = 'text' }: { label: string; name: string; placeholder?: string; type?: string }) {
  return <label className="block"><span className="text-sm font-medium text-slate-700">{label}</span><input name={name} type={type} placeholder={placeholder} required={name === 'title'} min={type === 'number' ? 1 : undefined} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label>
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
