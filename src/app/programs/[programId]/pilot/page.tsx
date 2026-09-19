import { programMembership } from '@/lib/auth/program-membership'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { MetricCard } from '@/components/metric-card'
import { requireUser } from '@/lib/auth/require-user'
import { saveAssessmentQuality, saveDataGovernance } from './actions'

type Readiness = {
  program_id: string
  education_ready: boolean
  research_ready: boolean
  active_learners: number
  assessment: { sequence_rows: number; unassigned_learners: number; forms: number; live_forms: number; form_items: number; rubric_mappings: number }
  staff: { reviewers: number; assessment_leads: number }
  missions: { sessions: number; prepared_runs: number; prepared_activities: number }
  quality: null | { blind_scoring: boolean; rater_calibration_required: boolean; double_rating_required: boolean; double_rating_target_count: number | null; double_rating_selection_rule: string | null }
  governance: null | { policy_version: string; explicit_consent: boolean; export_approval: boolean; retention_days: number | null; aggregate_min_cell_n: number; exclude_free_text_from_exports: boolean; data_controller_contact: string | null; privacy_notice_url: string | null; consent_version: string | null }
  consent: { granted: number; declined: number; withdrawn: number; unknown: number }
  blockers: string[]
}

type ExportRequest = { id: string; purpose: string; dataset_key: string; status: string; requested_at: string; decided_at: string | null }

export default async function PilotReadinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>
  searchParams: Promise<{ saved?: string; error?: string }>
}) {
  const { programId } = await params
  const query = await searchParams
  const { supabase, userId } = await requireUser()

  const [{ data: program }, { data: membership }, { data: platformAdmin }] = await Promise.all([
    supabase.from('programs').select('id, name, code').eq('id', programId).maybeSingle(),
    programMembership(supabase, programId, userId),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
  ])
  if (!program) notFound()

  const role = membership?.role
  const canView = Boolean(platformAdmin) || role === 'program_director' || role === 'assessment_lead' || role === 'reviewer'
  const canEditGovernance = Boolean(platformAdmin) || role === 'program_director'
  const canEditQuality = Boolean(platformAdmin) || role === 'program_director' || role === 'assessment_lead'
  if (!canView) notFound()

  const [{ data: readinessData, error: readinessError }, { data: exportData }] = await Promise.all([
    supabase.rpc('ten_pilot_readiness', { target_program_id: programId }),
    supabase.from('research_export_requests').select('id, purpose, dataset_key, status, requested_at, decided_at').eq('program_id', programId).order('requested_at', { ascending: false }).limit(8),
  ])
  if (readinessError || !readinessData) throw new Error('Could not load pilot readiness.')

  const readiness = readinessData as Readiness
  const exportRequests = (exportData ?? []) as ExportRequest[]

  return <AppShell
    eyebrow={`${program.code} · PILOT CONTROL`}
    title="First Activation readiness"
    actions={<>
      <Link href={`/programs/${programId}/pilot/operations`} className="ten-text-link">Program operations</Link>
      <Link href={`/programs/${programId}/pilot/governance`} className="ten-text-link">Research governance</Link>
      <Link href={`/programs/${programId}/pilot/fce`} className="ten-text-link">Focused Clinical Encounter</Link>
      <Link href={`/programs/${programId}/assessment/grading`} className="rounded-xl border border-[#CFC2AA] bg-[#FFFDF8] px-4 py-2.5 text-sm font-semibold text-[#17363A]">Grading operations</Link>
      <Link href={`/programs/${programId}/analytics`} className="rounded-xl border border-[#CFC2AA] bg-[#FFFDF8] px-4 py-2.5 text-sm font-semibold text-[#17363A]">Reasoning Signals</Link>
      <Link href={`/programs/${programId}`} className="rounded-xl bg-[#17363A] px-4 py-2.5 text-sm font-semibold text-white">Back to program</Link>
    </>}
  >
    {query.saved ? <p role="status" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Configuration saved. Readiness has been recalculated.</p> : null}
    {query.error ? <p role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">That configuration change was not saved. Review the values and role permissions.</p> : null}

    <section className="overflow-hidden rounded-[32px] border border-[#D8CCB6] bg-[#F7F0DF] shadow-sm">
      <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_.8fr] lg:p-8">
        <div>
          <p className="text-xs font-black tracking-[.18em] text-[#8B6A2B]">THE TEN — BAGHDAD NEXUS</p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-[#17363A]">Separate educational launch readiness from research readiness.</h2>
          <p className="mt-3 max-w-3xl leading-7 text-[#526C6E]">The educational experience may operate only when its assessment, staffing and live-session controls are ready. Research use has additional governance requirements and never becomes valid merely because the educational program is running.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ReadinessCard label="Education" ready={readiness.education_ready} />
          <ReadinessCard label="Research" ready={readiness.research_ready} />
        </div>
      </div>
    </section>

    <section className="mt-7 grid gap-4 md:grid-cols-4">
      <MetricCard label="Active learners" value={readiness.active_learners} />
      <MetricCard label="Form tasks mapped" value={`${readiness.assessment.rubric_mappings}/${readiness.assessment.form_items}`} />
      <MetricCard label="Prepared live activities" value={readiness.missions.prepared_activities} />
      <MetricCard label="Active reviewers" value={readiness.staff.reviewers} />
    </section>

    <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <div className="space-y-6">
        <Panel title="Assessment & live delivery" eyebrow="EDUCATIONAL LAUNCH">
          <dl className="grid gap-3 sm:grid-cols-2">
            <DataCell label="Counterbalance configurations" value={String(readiness.assessment.sequence_rows)} ok={readiness.assessment.sequence_rows >= 2} />
            <DataCell label="Unassigned learners" value={String(readiness.assessment.unassigned_learners)} ok={readiness.assessment.unassigned_learners === 0} />
            <DataCell label="Live Form A/B" value={`${readiness.assessment.live_forms}/${readiness.assessment.forms}`} ok={readiness.assessment.forms === 2 && readiness.assessment.live_forms === 2} />
            <DataCell label="Rubric mappings" value={`${readiness.assessment.rubric_mappings}/${readiness.assessment.form_items}`} ok={readiness.assessment.form_items === 30 && readiness.assessment.rubric_mappings === 30} />
            <DataCell label="Mission sessions" value={String(readiness.missions.sessions)} ok={readiness.missions.sessions >= 4} />
            <DataCell label="Prepared mission runs" value={String(readiness.missions.prepared_runs)} ok={readiness.missions.prepared_runs >= 4} />
            <DataCell label="Assessment Leads" value={String(readiness.staff.assessment_leads)} ok={readiness.staff.assessment_leads >= 1} />
            <DataCell label="Reviewers" value={String(readiness.staff.reviewers)} ok={readiness.staff.reviewers >= 2} />
          </dl>
        </Panel>

        <Panel title="Assessment quality controls" eyebrow="RATER GOVERNANCE">
          <p className="text-sm leading-6 text-slate-600">Blind scoring, calibration and double-rating are operational controls. A response designated for double-rating cannot be finalized until the required number of submitted human reviews exists.</p>
          <form action={saveAssessmentQuality.bind(null, programId)} className="mt-5 space-y-4">
            <Toggle label="Blind scoring required" name="blind_scoring" checked={readiness.quality?.blind_scoring ?? true} disabled={!canEditQuality} />
            <Toggle label="Rater calibration required" name="rater_calibration_required" checked={readiness.quality?.rater_calibration_required ?? true} disabled={!canEditQuality} />
            <Toggle label="Double-rating required" name="double_rating_required" checked={readiness.quality?.double_rating_required ?? true} disabled={!canEditQuality} />
            <label className="block"><span className="text-sm font-medium text-slate-700">Double-rating target count</span><input name="double_rating_target_count" type="number" min="1" defaultValue={readiness.quality?.double_rating_target_count ?? ''} disabled={!canEditQuality} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 disabled:bg-slate-100" /></label>
            <label className="block"><span className="text-sm font-medium text-slate-700">Selection rule</span><textarea name="double_rating_selection_rule" rows={3} defaultValue={readiness.quality?.double_rating_selection_rule ?? ''} disabled={!canEditQuality} placeholder="Define the prospective sampling rule before pilot responses are selected." className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 disabled:bg-slate-100" /></label>
            {canEditQuality ? <button className="rounded-xl bg-[#17363A] px-4 py-2.5 text-sm font-black text-white">Save assessment quality controls</button> : <p className="text-sm text-slate-500">View-only for your current role.</p>}
          </form>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="Research data governance" eyebrow="RESEARCH READINESS">
          <div className="grid grid-cols-2 gap-3">
            <ConsentCell label="Granted" value={readiness.consent.granted} />
            <ConsentCell label="Unknown" value={readiness.consent.unknown} />
            <ConsentCell label="Declined" value={readiness.consent.declined} />
            <ConsentCell label="Withdrawn" value={readiness.consent.withdrawn} />
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <Line label="Governance policy" value={readiness.governance?.policy_version ?? 'Missing'} />
            <Line label="Consent version" value={readiness.governance?.consent_version ?? 'Missing'} />
            <Line label="Explicit consent" value={readiness.governance?.explicit_consent ? 'Required' : 'Not enforced'} />
            <Line label="Export approval" value={readiness.governance?.export_approval ? 'Required' : 'Not enforced'} />
            <Line label="Free text in exports" value={readiness.governance?.exclude_free_text_from_exports ? 'Excluded' : 'Not excluded'} />
            <Line label="Minimum aggregate cell" value={String(readiness.governance?.aggregate_min_cell_n ?? '—')} />
          </dl>
        </Panel>

        <Panel title="Local governance fields" eyebrow="DIRECTOR INPUT REQUIRED">
          <p className="text-sm leading-6 text-slate-600">These fields are intentionally not guessed. Enter the locally approved retention period, data-controller contact and published privacy notice when they exist.</p>
          <form action={saveDataGovernance.bind(null, programId)} className="mt-5 space-y-4">
            <label className="block"><span className="text-sm font-medium text-slate-700">Retention period (days)</span><input name="retention_days" type="number" min="1" defaultValue={readiness.governance?.retention_days ?? ''} disabled={!canEditGovernance} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 disabled:bg-slate-100" /></label>
            <label className="block"><span className="text-sm font-medium text-slate-700">Data-controller contact</span><input name="data_controller_contact" type="text" defaultValue={readiness.governance?.data_controller_contact ?? ''} disabled={!canEditGovernance} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 disabled:bg-slate-100" /></label>
            <label className="block"><span className="text-sm font-medium text-slate-700">Privacy notice URL</span><input name="privacy_notice_url" type="url" defaultValue={readiness.governance?.privacy_notice_url ?? ''} disabled={!canEditGovernance} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 disabled:bg-slate-100" /></label>
            {canEditGovernance ? <button className="rounded-xl bg-[#17363A] px-4 py-2.5 text-sm font-black text-white">Save governance fields</button> : <p className="text-sm text-slate-500">Only the Program Director can change research governance fields.</p>}
          </form>
        </Panel>
      </div>
    </section>

    <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <Panel title="Open readiness controls" eyebrow="DO NOT SILENCE THESE">
        {readiness.blockers.length ? <ul className="space-y-3">{readiness.blockers.map((blocker) => <li key={blocker} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">{blocker}</li>)}</ul> : <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">No open readiness controls were detected.</p>}
      </Panel>

      <Panel title="Research export requests" eyebrow="APPROVAL GATE">
        <p className="mb-4 text-sm leading-6 text-slate-600">This page does not expose learner free text or a direct research download. Requests remain separately approved and auditable.</p>
        <div className="space-y-3">{exportRequests.length ? exportRequests.map((request) => <div key={request.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-900">{request.dataset_key}</p><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">{request.status}</span></div><p className="mt-2 text-sm text-slate-600">{request.purpose}</p><p className="mt-2 text-xs text-slate-400">Requested {new Date(request.requested_at).toLocaleString()}</p></div>) : <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">No research export requests have been created.</p>}</div>
      </Panel>
    </section>
  </AppShell>
}

function ReadinessCard({ label, ready }: { label: string; ready: boolean }) {
  return <div className={`rounded-2xl border p-4 ${ready ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><p className="text-xs font-black tracking-[.12em] text-slate-500">{label.toUpperCase()}</p><p className={`mt-1 font-serif text-2xl font-bold ${ready ? 'text-emerald-800' : 'text-amber-900'}`}>{ready ? 'Ready' : 'Open controls'}</p></div>
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-black tracking-[.15em] text-[#8B6A2B]">{eyebrow}</p><h2 className="mt-2 font-serif text-2xl font-bold text-[#17363A]">{title}</h2><div className="mt-5">{children}</div></section>
}

function DataCell({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <div className={`rounded-2xl border p-4 ${ok ? 'border-emerald-100 bg-emerald-50/60' : 'border-amber-200 bg-amber-50'}`}><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className={`mt-1 text-xl font-black ${ok ? 'text-emerald-800' : 'text-amber-900'}`}>{value}</dd></div>
}

function Toggle({ label, name, checked, disabled }: { label: string; name: string; checked: boolean; disabled: boolean }) {
  return <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3"><span className="text-sm font-semibold text-slate-700">{label}</span><input type="checkbox" name={name} defaultChecked={checked} disabled={disabled} className="size-5" /></label>
}

function ConsentCell({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-[#D8CCB6] bg-[#FFFDF8] p-3"><p className="text-xs font-bold text-[#6B7774]">{label}</p><p className="mt-1 font-serif text-2xl font-bold text-[#17363A]">{value}</p></div>
}

function Line({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="text-right font-semibold text-slate-800">{value}</dd></div>
}
