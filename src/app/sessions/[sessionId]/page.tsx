import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { MetricCard } from '@/components/metric-card'
import { StatusBadge } from '@/components/status-badge'
import { requireUser } from '@/lib/auth/require-user'

type ObjectiveRelation = { code?: string; title?: string; domain?: string | null } | Array<{ code?: string; title?: string; domain?: string | null }> | null

type ObjectiveMapRow = {
  weight: number | null
  learning_objectives: ObjectiveRelation
}

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const { supabase, userId } = await requireUser()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, cohort_id, title, description, scheduled_at, duration_minutes, status, join_code')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session) notFound()

  const { data: cohort } = await supabase.from('cohorts').select('id, name, program_id').eq('id', session.cohort_id).maybeSingle()
  if (!cohort) notFound()

  const [{ data: program }, { data: membership }, { data: platformAdmin }, { data: ownFacilitator }, { data: facilitators }, { data: objectives }] = await Promise.all([
    supabase.from('programs').select('name, code').eq('id', cohort.program_id).maybeSingle(),
    supabase.from('program_memberships').select('role').eq('program_id', cohort.program_id).eq('user_id', userId).eq('status', 'active').maybeSingle(),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('session_facilitators').select('user_id').eq('session_id', sessionId).eq('user_id', userId).maybeSingle(),
    supabase.from('session_facilitators').select('user_id, facilitator_role').eq('session_id', sessionId),
    supabase.from('session_learning_objectives').select('weight, learning_objectives(code, title, domain)').eq('session_id', sessionId),
  ])

  const canManageSession = Boolean(platformAdmin) || membership?.role === 'program_director' || Boolean(ownFacilitator)
  let attendanceMetricLabel = 'My attendance'
  let attendanceMetricValue: string | number = 'Not recorded'

  if (canManageSession) {
    const { count } = await supabase.from('attendance_records').select('id', { count: 'exact', head: true }).eq('session_id', sessionId).in('status', ['present', 'late'])
    attendanceMetricLabel = 'Attendance so far'
    attendanceMetricValue = count ?? 0
  } else {
    const { data: ownAttendance } = await supabase.from('attendance_records').select('status').eq('session_id', sessionId).eq('learner_id', userId).maybeSingle()
    attendanceMetricValue = ownAttendance?.status ? ownAttendance.status.replaceAll('_', ' ') : 'Not recorded'
  }

  const objectiveRows = (objectives ?? []) as ObjectiveMapRow[]

  return (
    <AppShell
      eyebrow={`${program?.code ?? 'SEIP'} · SESSION`}
      title={session.title}
      actions={<Link href={`/programs/${cohort.program_id}/cohorts/${cohort.id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium">Back to cohort</Link>}
    >
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={session.status} />
        <span className="text-sm text-slate-500">{formatDateTime(session.scheduled_at)}</span>
        {session.duration_minutes ? <span className="text-sm text-slate-500">{session.duration_minutes} min</span> : null}
      </div>

      <section className="mt-7 grid gap-4 md:grid-cols-3">
        <MetricCard label={attendanceMetricLabel} value={attendanceMetricValue} />
        <MetricCard label="Facilitators" value={facilitators?.length ?? 0} />
        <MetricCard label="Mapped learning objectives" value={objectiveRows.length} />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Live session access</h2>
          <p className="mt-1 text-sm text-slate-500">Live interactions arrive in the next build stage.</p>
          <div className="mt-5 rounded-2xl bg-slate-950 p-6 text-white">
            <p className="text-xs font-semibold tracking-[0.18em] text-sky-300">JOIN CODE</p>
            <p className="mt-2 font-mono text-3xl font-semibold tracking-wider">{session.join_code ?? 'NOT SET'}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Learning objectives</h2>
          <div className="mt-5 space-y-3">
            {objectiveRows.length ? objectiveRows.map((item: ObjectiveMapRow, index: number) => {
              const objective = readObjective(item.learning_objectives)
              return <div key={index} className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-semibold tracking-wide text-sky-700">{objective?.code ?? 'LO'}</p><p className="mt-1 font-medium">{objective?.title ?? 'Learning objective'}</p>{objective?.domain ? <p className="mt-1 text-sm text-slate-500">{objective.domain}</p> : null}</div>
            }) : <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">No learning objectives mapped yet.</p>}
          </div>
        </div>
      </section>
    </AppShell>
  )
}

function readObjective(value: ObjectiveRelation): { code?: string; title?: string; domain?: string | null } | null {
  if (Array.isArray(value)) return value[0] ?? null
  if (value && typeof value === 'object') return value
  return null
}

function formatDateTime(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat('en', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value))
}
