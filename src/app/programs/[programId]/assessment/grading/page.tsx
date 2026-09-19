import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { MetricCard } from '@/components/metric-card'
import { requireProgramRole } from '@/lib/auth/require-program-role'

type Row = { response_id: string; assessment_title: string; question_code: string; existing_review_status: string | null; finalized: boolean; moderation_required: boolean; sampled: boolean }

export default async function GradingQueuePage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params
  const { supabase } = await requireProgramRole(programId, ['program_director', 'assessment_lead', 'reviewer'])
  const { data, error } = await supabase.rpc('ten_review_queue', { target_program_id: programId })
  if (error) throw new Error('The grading queue is temporarily unavailable.')
  const rows = (data ?? []) as Row[]
  return <AppShell eyebrow="THE TEN · WRITTEN GRADING" title="Human scoring queue" actions={<Link href={`/programs/${programId}/pilot/double-rating`}>Second-rating sample</Link>}>
    <p className="mb-5">Learner identities are hidden. Submit your independent rubric rating before comparing scores. Only human review or resolved moderation can release a grade.</p>
    <section className="grid gap-4 sm:grid-cols-3"><MetricCard label="Written responses" value={rows.length}/><MetricCard label="Awaiting your rating" value={rows.filter(r => r.existing_review_status !== 'submitted' && !r.finalized).length}/><MetricCard label="Moderation required" value={rows.filter(r => r.moderation_required).length}/></section>
    <section className="mt-6 space-y-3">{rows.length ? rows.map(r => <Link key={r.response_id} href={`/programs/${programId}/assessment/grading/${r.response_id}`} className="block rounded-2xl border bg-white p-5"><strong>{r.assessment_title} · {r.question_code}</strong><p className="mt-2 text-sm">Response {r.response_id.slice(0, 8)} · {r.finalized ? 'Finalized' : r.moderation_required ? 'Moderation required' : r.existing_review_status === 'submitted' ? 'Your rating committed' : 'Awaiting your rating'}{r.sampled ? ' · Second-rating sample' : ''}</p></Link>) : <p>No submitted written responses with a rubric are available.</p>}</section>
  </AppShell>
}
