import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { requireUser } from '@/lib/auth/require-user'

type ObjectiveSignal = {
  code: string
  title: string
  entry_mean: number | null
  exit_mean: number | null
  delta: number | null
  entry_n: number
  exit_n: number
}

type MissionSignal = {
  mission_id: string
  completers: number
  participants: number
  completed_runs: number
  initial_confidence_mean: number | null
  revote_confidence_mean: number | null
  changed_count: number
  revote_count: number
  changed_percent: number | null
}

type AnalyticsPayload = {
  program_id: string
  cohorts: number
  active_learners: number
  assessment: {
    entry_results: number
    exit_results: number
    entry_mean_percent: number | null
    exit_mean_percent: number | null
    delta_percent: number | null
  }
  objectives: ObjectiveSignal[]
  missions: MissionSignal[]
  feedback: { n: number; relevance_mean: number | null; learning_design_mean: number | null }
  research_consent: { consented: number; declined: number; withdrawn: number; unknown: number }
}

export default async function ProgramAnalyticsPage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params
  const { supabase, userId } = await requireUser()

  const [{ data: program }, { data: membership }, { data: platformAdmin }] = await Promise.all([
    supabase.from('programs').select('id, name, code').eq('id', programId).maybeSingle(),
    supabase.from('program_memberships').select('role').eq('program_id', programId).eq('user_id', userId).eq('status', 'active').maybeSingle(),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
  ])
  if (!program) notFound()
  const canView = Boolean(platformAdmin) || membership?.role === 'program_director' || membership?.role === 'assessment_lead'
  if (!canView) notFound()

  const { data, error } = await supabase.rpc('ten_program_analytics', { target_program_id: programId })
  if (error) throw new Error('Could not load THE TEN analytics.')
  const analytics = data as unknown as AnalyticsPayload
  const entry = analytics.assessment.entry_mean_percent
  const exit = analytics.assessment.exit_mean_percent
  const delta = analytics.assessment.delta_percent

  return (
    <AppShell
      eyebrow={`${program.code} · THE TEN ANALYTICS`}
      title="Reasoning Signals"
      actions={<>
        <Link href={`/programs/${programId}/assessment`} className="rounded-xl border border-[#CFC2AA] bg-[#FFFDF8] px-4 py-2.5 text-sm font-semibold text-[#17363A]">Assessment Center</Link>
        <Link href={`/programs/${programId}`} className="rounded-xl bg-[#17363A] px-4 py-2.5 text-sm font-semibold text-white">Back to program</Link>
      </>}
    >
      <section className="overflow-hidden rounded-[32px] border border-[#D8CCB6] bg-[#F7F0DF] shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.25fr_.75fr] lg:p-8">
          <div>
            <p className="text-xs font-black tracking-[.18em] text-[#8B6A2B]">THE TEN — BAGHDAD NEXUS</p>
            <h2 className="mt-3 max-w-3xl font-serif text-3xl font-bold text-[#17363A]">A programmatic view of clinical-reasoning evidence.</h2>
            <p className="mt-3 max-w-3xl leading-7 text-[#526C6E]">This page triangulates matched Entry/Exit checkpoints, objective-level scoring, mission completion, confidence/revote telemetry and learner feedback. Treat these as formative program signals, not diagnoses of individual clinical competence.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SignalMetric label="Active learners" value={analytics.active_learners} />
            <SignalMetric label="Cohorts" value={analytics.cohorts} />
            <SignalMetric label="Entry results" value={analytics.assessment.entry_results} />
            <SignalMetric label="Exit results" value={analytics.assessment.exit_results} />
          </div>
        </div>
      </section>

      <section className="mt-7 grid gap-4 md:grid-cols-3">
        <ScoreCard label="Entry checkpoint" value={formatPercent(entry)} caption="Released results only" />
        <ScoreCard label="Exit transfer check" value={formatPercent(exit)} caption="Released results only" />
        <ScoreCard label="Observed change" value={delta === null ? '—' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pp`} caption="Descriptive pre/post difference" emphasis />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-[28px] border border-[#D8CCB6] bg-[#FFFDF8] p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-black tracking-[.15em] text-[#8B6A2B]">OBJECTIVE-LEVEL EVIDENCE</p><h2 className="mt-2 font-serif text-2xl font-bold text-[#17363A]">Entry → Exit reasoning signals</h2></div>
            <span className="text-xs font-semibold text-[#6B7774]">Mean performance · available released results</span>
          </div>
          <div className="mt-5 space-y-3">
            {analytics.objectives.map((objective) => <ObjectiveRow key={objective.code} objective={objective} />)}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-[#D8CCB6] bg-[#17363A] p-6 text-white shadow-sm">
            <p className="text-xs font-black tracking-[.15em] text-[#F2D99B]">RESEARCH GOVERNANCE</p>
            <h2 className="mt-2 font-serif text-2xl font-bold">Consent status</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <ConsentCell label="Consented" value={analytics.research_consent.consented} />
              <ConsentCell label="Unknown" value={analytics.research_consent.unknown} />
              <ConsentCell label="Declined" value={analytics.research_consent.declined} />
              <ConsentCell label="Withdrawn" value={analytics.research_consent.withdrawn} />
            </div>
            <p className="mt-4 text-xs leading-5 text-[#D9E6E3]">Analytics may support program evaluation. Research use still requires the applicable ethics/consent pathway; this interface intentionally does not expose a one-click identifiable research export.</p>
          </div>

          <div className="rounded-[28px] border border-[#D8CCB6] bg-[#FFFDF8] p-6 shadow-sm">
            <p className="text-xs font-black tracking-[.15em] text-[#8B6A2B]">LEARNER FEEDBACK</p>
            <h2 className="mt-2 font-serif text-2xl font-bold text-[#17363A]">Experience signals</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <MetricLine label="Responses" value={String(analytics.feedback.n)} />
              <MetricLine label="Relevance" value={analytics.feedback.relevance_mean === null ? '—' : `${analytics.feedback.relevance_mean.toFixed(2)} / 5`} />
              <MetricLine label="Learning design" value={analytics.feedback.learning_design_mean === null ? '—' : `${analytics.feedback.learning_design_mean.toFixed(2)} / 5`} />
            </dl>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[28px] border border-[#D8CCB6] bg-[#FFFDF8] p-6 shadow-sm">
        <div><p className="text-xs font-black tracking-[.15em] text-[#8B6A2B]">LIVE-MISSION TELEMETRY</p><h2 className="mt-2 font-serif text-2xl font-bold text-[#17363A]">Completion, confidence and peer revision</h2></div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {analytics.missions.map((mission) => <MissionRow key={mission.mission_id} mission={mission} />)}
        </div>
      </section>

      <section className="mt-8 rounded-[28px] border border-[#C7DAD5] bg-[#EDF7F4] p-6 text-[#17363A]">
        <h2 className="font-serif text-xl font-bold">Interpretation boundary</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-[#426064]">Clinical reasoning is context- and content-dependent. Use longitudinal patterns, multiple assessment formats, transfer tasks and faculty judgment together. A single objective percentage, mission completion count or confidence value should never be treated as a standalone competence decision.</p>
      </section>
    </AppShell>
  )
}

function SignalMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-[#D8CCB6] bg-[#FFFDF8]/80 p-4"><p className="text-xs font-bold text-[#6B7774]">{label}</p><p className="mt-1 font-serif text-2xl font-bold text-[#17363A]">{value}</p></div>
}

function ScoreCard({ label, value, caption, emphasis = false }: { label: string; value: string; caption: string; emphasis?: boolean }) {
  return <div className={`rounded-[24px] border p-5 shadow-sm ${emphasis ? 'border-[#D8A94E] bg-[#FFF4CF]' : 'border-[#D8CCB6] bg-[#FFFDF8]'}`}><p className="text-xs font-black tracking-[.12em] text-[#8B6A2B]">{label.toUpperCase()}</p><p className="mt-2 font-serif text-3xl font-bold text-[#17363A]">{value}</p><p className="mt-1 text-xs text-[#6B7774]">{caption}</p></div>
}

function ObjectiveRow({ objective }: { objective: ObjectiveSignal }) {
  const entry = objective.entry_mean
  const exit = objective.exit_mean
  return <div className="rounded-2xl border border-[#E4D8C3] bg-[#FFFEFB] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black tracking-[.1em] text-[#1F6668]">{objective.code}</p><p className="mt-1 font-semibold text-[#17363A]">{objective.title}</p></div><div className="text-right text-xs text-[#6B7774]">n {objective.entry_n} → {objective.exit_n}</div></div>
    <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-4">
      <div className="space-y-2">
        <Bar label="Entry" value={entry} />
        <Bar label="Exit" value={exit} />
      </div>
      <div className="min-w-20 text-right"><p className="text-xs font-bold text-[#6B7774]">Δ</p><p className="font-serif text-xl font-bold text-[#17363A]">{objective.delta === null ? '—' : `${objective.delta >= 0 ? '+' : ''}${objective.delta.toFixed(1)}`}</p></div>
    </div>
  </div>
}

function Bar({ label, value }: { label: string; value: number | null }) {
  const width = value === null ? 0 : Math.max(0, Math.min(100, value))
  return <div className="grid grid-cols-[44px_1fr_52px] items-center gap-2"><span className="text-xs font-bold text-[#6B7774]">{label}</span><div className="h-2.5 overflow-hidden rounded-full bg-[#E9E0D0]"><div className="h-full rounded-full bg-[#1F6668]" style={{ width: `${width}%` }} /></div><span className="text-right text-xs font-bold text-[#17363A]">{value === null ? '—' : `${value.toFixed(0)}%`}</span></div>
}

function MissionRow({ mission }: { mission: MissionSignal }) {
  return <div className="rounded-2xl border border-[#E4D8C3] bg-[#FFFEFB] p-5">
    <div className="flex items-center justify-between"><p className="font-serif text-xl font-bold text-[#17363A]">{mission.mission_id}</p><span className="rounded-full bg-[#EDF7F4] px-3 py-1 text-xs font-black text-[#1F6668]">{mission.completers} complete</span></div>
    <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
      <MetricLine label="Participants" value={String(mission.participants)} />
      <MetricLine label="Completed runs" value={String(mission.completed_runs)} />
      <MetricLine label="Initial confidence" value={formatConfidence(mission.initial_confidence_mean)} />
      <MetricLine label="Revote confidence" value={formatConfidence(mission.revote_confidence_mean)} />
      <MetricLine label="Changed after discussion" value={mission.changed_percent === null ? '—' : `${mission.changed_percent.toFixed(1)}%`} />
      <MetricLine label="Revotes" value={String(mission.revote_count)} />
    </dl>
  </div>
}

function ConsentCell({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/15 bg-white/5 p-3"><p className="text-xs text-[#D9E6E3]">{label}</p><p className="mt-1 font-serif text-2xl font-bold">{value}</p></div>
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><dt className="text-[#6B7774]">{label}</dt><dd className="font-semibold text-[#17363A]">{value}</dd></div>
}

function formatPercent(value: number | null) { return value === null ? '—' : `${value.toFixed(1)}%` }
function formatConfidence(value: number | null) { return value === null ? '—' : `${value.toFixed(1)} / 100` }
