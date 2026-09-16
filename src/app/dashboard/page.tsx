import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { MetricCard } from '@/components/metric-card'
import { StatusBadge } from '@/components/status-badge'
import { requireUser } from '@/lib/auth/require-user'

type Program = { id: string; name: string; code: string; status: string }
type ProgramRelation = Program | Program[] | null
type MembershipRow = { role: string; programs: ProgramRelation }
type CohortIdRow = { id: string }

function readProgram(program: ProgramRelation) {
  if (Array.isArray(program)) return program[0] ?? null
  return program
}

export default async function DashboardPage() {
  const { supabase, userId } = await requireUser()

  const [{ data: profile }, { data: memberships }, { data: platformAdmin }, { data: facilitator }] = await Promise.all([
    supabase.from('profiles').select('full_name, status').eq('id', userId).maybeSingle(),
    supabase.from('program_memberships').select('role, programs(id, name, code, status)').eq('user_id', userId).eq('status', 'active'),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('session_facilitators').select('user_id').eq('user_id', userId).limit(1).maybeSingle(),
  ])

  const membershipRows = (memberships ?? []) as MembershipRow[]
  const programs = membershipRows
    .map((membership: MembershipRow) => ({ role: membership.role, program: readProgram(membership.programs) }))
    .filter((entry): entry is { role: string; program: { id: string; name: string; code: string; status: string } } => Boolean(entry.program))

  const canFacilitateTen = Boolean(platformAdmin) || Boolean(facilitator) || programs.some(entry => entry.role === 'program_director')
  const programIds = programs.map((entry) => entry.program.id)
  let cohortCount = 0
  let upcomingSessionCount = 0

  if (programIds.length) {
    const { data: cohorts } = await supabase.from('cohorts').select('id').in('program_id', programIds)
    cohortCount = cohorts?.length ?? 0
    const cohortIds = ((cohorts ?? []) as CohortIdRow[]).map((cohort: CohortIdRow) => cohort.id)
    if (cohortIds.length) {
      const { count } = await supabase.from('sessions').select('id', { count: 'exact', head: true }).in('cohort_id', cohortIds).in('status', ['scheduled', 'live'])
      upcomingSessionCount = count ?? 0
    }
  }

  return (
    <AppShell
      title={`Welcome${profile?.full_name ? `, ${profile.full_name}` : ''}`}
      actions={platformAdmin ? <Link href="/programs/new" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Create program</Link> : null}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Link href="/learner" className="ten-journey-entry"><div><span className="ten-eyebrow">THE TEN · BAGHDAD NEXUS</span><h2>Enter Baghdad</h2><p>Continue the story from your recorded gate, signal, and Codex state.</p></div><span aria-hidden="true">→</span></Link>
        {canFacilitateTen && <Link href="/facilitator/the-ten" className="ten-journey-entry"><div><span className="ten-eyebrow">FACILITATOR CONTROL ROOM</span><h2>Run First Activation</h2><p>Open one of the four prepared mission signals and control the live room.</p></div><span aria-hidden="true">→</span></Link>}
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Active programs" value={programs.length} />
        <MetricCard label="Cohorts" value={cohortCount} />
        <MetricCard label="Upcoming / live sessions" value={upcomingSessionCount} />
        <MetricCard label="Account status" value={profile?.status ?? 'pending'} />
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Your programs</h2><p className="mt-1 text-sm text-slate-500">Program access is enforced by Supabase Row Level Security.</p></div></div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {programs.length ? programs.map(({ program, role }) => <Link key={`${program.id}-${role}`} href={`/programs/${program.id}`} className="group rounded-2xl border border-slate-200 p-5 transition hover:border-slate-300 hover:bg-slate-50"><div className="flex items-start justify-between gap-4"><div><p className="text-lg font-semibold group-hover:text-sky-700">{program.name}</p><p className="mt-1 text-sm text-slate-500">{program.code}</p></div><StatusBadge status={program.status} /></div><div className="mt-5 flex items-center justify-between text-sm"><span className="font-medium capitalize text-slate-600">{role.replaceAll('_', ' ')}</span><span className="text-sky-700">Open program →</span></div></Link>) : <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 lg:col-span-2">No active program membership yet.</div>}
        </div>
      </section>
    </AppShell>
  )
}
