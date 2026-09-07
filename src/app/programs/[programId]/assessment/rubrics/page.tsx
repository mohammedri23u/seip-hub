import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { MetricCard } from '@/components/metric-card'
import { StatusBadge } from '@/components/status-badge'
import { requireUser } from '@/lib/auth/require-user'

type RubricRow = { id: string; rubric_code: string; title: string; description: string | null; status: string; created_at: string }

export default async function RubricsPage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params
  const { supabase, userId } = await requireUser()
  const [{ data: program }, { data: membership }, { data: platformAdmin }, { data: rubrics }] = await Promise.all([
    supabase.from('programs').select('id, code').eq('id', programId).maybeSingle(),
    supabase.from('program_memberships').select('role').eq('program_id', programId).eq('user_id', userId).eq('status', 'active').maybeSingle(),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('rubrics').select('id, rubric_code, title, description, status, created_at').eq('program_id', programId).order('created_at', { ascending: false }),
  ])
  if (!program) notFound()
  const canManage = Boolean(platformAdmin) || membership?.role === 'program_director' || membership?.role === 'assessment_lead'
  const rows = (rubrics ?? []) as RubricRow[]

  return <AppShell eyebrow={`${program.code} · ASSESSMENT`} title="Rubrics" actions={<><Link href={`/programs/${programId}/assessment`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium">Assessment Center</Link>{canManage ? <Link href={`/programs/${programId}/assessment/rubrics/new`} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">New rubric</Link> : null}</>}>
    <section className="grid gap-4 md:grid-cols-3"><MetricCard label="Rubrics" value={rows.length} /><MetricCard label="Approved" value={rows.filter((r) => r.status === 'approved').length} /><MetricCard label="Draft" value={rows.filter((r) => r.status === 'draft').length} /></section>
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div><h2 className="text-xl font-semibold">Criterion-based written assessment</h2><p className="mt-1 text-sm text-slate-500">Rubric versions are the shared scoring contract for human review and AI-assisted proposals.</p></div><div className="mt-5 space-y-3">{rows.length ? rows.map((rubric) => <Link key={rubric.id} href={`/programs/${programId}/assessment/rubrics/${rubric.id}`} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50"><div><p className="font-semibold">{rubric.rubric_code} · {rubric.title}</p>{rubric.description ? <p className="mt-1 text-sm text-slate-600">{rubric.description}</p> : null}</div><StatusBadge status={rubric.status} /></Link>) : <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No rubrics yet.</p>}</div></section>
  </AppShell>
}
