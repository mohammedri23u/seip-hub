import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { StatusBadge } from '@/components/status-badge'
import { requireUser } from '@/lib/auth/require-user'

export default async function LearnerAssessmentsPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const query = await searchParams
  const { supabase, userId } = await requireUser()
  const { data: memberships } = await supabase.from('cohort_memberships').select('cohort_id').eq('user_id', userId).eq('member_type', 'learner').eq('status', 'active')
  const cohortIds = (memberships ?? []).map((membership) => membership.cohort_id)
  const { data: assessments } = cohortIds.length ? await supabase.from('assessments').select('id, title, assessment_type, status, opens_at, closes_at, duration_minutes').in('cohort_id', cohortIds).in('status', ['scheduled', 'live', 'released']).order('opens_at') : { data: [] }
  return <AppShell eyebrow="LEARNER" title="Assessments" actions={<Link href="/dashboard" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium">Dashboard</Link>}>
    {query.submitted ? <p className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Assessment submitted successfully.</p> : null}
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="space-y-3">{(assessments ?? []).length ? (assessments ?? []).map((assessment) => <div key={assessment.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"><div><p className="font-semibold">{assessment.title}</p><p className="mt-1 text-sm capitalize text-slate-500">{assessment.assessment_type.replaceAll('_', ' ')}{assessment.duration_minutes ? ` · ${assessment.duration_minutes} min` : ''}</p></div><div className="flex items-center gap-3"><StatusBadge status={assessment.status} />{assessment.status === 'live' ? <Link href={`/assessments/${assessment.id}/take`} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Open</Link> : null}</div></div>) : <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No available assessments.</p>}</div></section>
  </AppShell>
}
