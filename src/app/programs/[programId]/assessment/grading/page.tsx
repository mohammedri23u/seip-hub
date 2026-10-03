import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { MetricCard } from '@/components/metric-card'
import { requireProgramRole } from '@/lib/auth/require-program-role'

type Row = {
  response_id: string
  assessment_title: string
  question_code: string
  submitted_at: string
  existing_review_status: string | null
  finalized: boolean
  moderation_required: boolean
  sampled: boolean
  assignment_kind: 'primary' | 'second' | null
  assignment_status: 'assigned' | 'completed' | 'cancelled' | null
  assigned_to_me: boolean
}

export default async function GradingQueuePage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params
  const { supabase, role } = await requireProgramRole(programId, ['program_director', 'assessment_lead', 'reviewer', 'peer_educator'])
  const { data, error } = await supabase.rpc('ten_review_queue', { target_program_id: programId })
  if (error) throw new Error('The grading queue is temporarily unavailable.')
  const rows = (data ?? []) as Row[]
  const pendingAssigned = rows.filter(row => row.assigned_to_me && row.assignment_status === 'assigned' && row.existing_review_status !== 'submitted' && !row.finalized)
  const secondRatings = pendingAssigned.filter(row => row.assignment_kind === 'second')

  return <AppShell eyebrow="THE TEN · WRITTEN GRADING" title="Your scoring queue" actions={<>{["program_director", "assessment_lead"].includes(role) && <Link href={`/programs/${programId}/assessment/grading/students`} className="rounded-xl bg-slate-950 px-4 py-3 text-white">كشف الدرجات حسب اسم الطالب</Link>}<Link href={`/programs/${programId}/pilot/double-rating`}>Second-rating sample</Link></>}>
    <p dir="rtl" className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm">هذه قائمة الإجابات الكتابية فقط. درجات MCQs والمحاولات المنتهية بدون إجابات تظهر في «كشف الدرجات حسب اسم الطالب».</p><p className="mb-5">Learner identities are hidden. Teachers see only responses assigned to them; Assessment Leads and Program Directors retain oversight access. Score each response against the displayed rubric before comparing any AI proposal.</p>
    <section className="grid gap-4 sm:grid-cols-4">
      <MetricCard label="Visible responses" value={rows.length}/>
      <MetricCard label="Awaiting your rating" value={pendingAssigned.length}/>
      <MetricCard label="Second ratings" value={secondRatings.length}/>
      <MetricCard label="Moderation required" value={rows.filter(row => row.moderation_required).length}/>
    </section>
    <section className="mt-6 space-y-3">
      {rows.length ? rows.map(row => {
        const label = row.assignment_kind === 'second' ? 'Second rating' : row.assignment_kind === 'primary' ? 'Primary rating' : 'Oversight'
        const state = row.finalized
          ? 'Finalized'
          : row.moderation_required
            ? 'Moderation required'
            : row.existing_review_status === 'submitted'
              ? 'Your rating committed'
              : row.assignment_status === 'assigned'
                ? 'Awaiting your rating'
                : 'Available for oversight'
        return <Link key={row.response_id} href={`/programs/${programId}/assessment/grading/${row.response_id}`} className="block rounded-2xl border bg-white p-5 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><strong>{row.assessment_title} · {row.question_code}</strong><p className="mt-2 text-sm">Response {row.response_id.slice(0, 8)} · {state}{row.sampled ? ' · Double-rating sample' : ''}</p></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${row.assignment_kind === 'second' ? 'bg-amber-100 text-amber-900' : row.assignment_kind === 'primary' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-600'}`}>{label}</span>
          </div>
        </Link>
      }) : <p>No submitted written responses with a rubric are available.</p>}
    </section>
  </AppShell>
}
