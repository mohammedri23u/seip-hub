'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Phase = 'waiting' | 'commit_open' | 'commit_locked' | 'discussion' | 'revote_open' | 'reveal' | 'transfer' | 'debrief' | 'completed'

type Metrics = {
  participants: number
  completion_ready: number
  completion_incomplete: number
  initial_distribution: Record<string, number>
  revote_distribution: Record<string, number>
  initial_confidence_distribution: Record<string, number>
  revote_confidence_distribution: Record<string, number>
  changed_count: number
  revote_count: number
  changed_percent: number
  initial_confidence: number | null
  revote_confidence: number | null
}

type SnapshotLite = {
  phase: Phase
  closeout_saved?: boolean
  stage?: { options?: string[] }
  notes?: { options?: string[] }
}

export function FacilitatorRoomIntelligence({
  runId,
  initialPhase,
  initialCloseoutSaved = false,
}: {
  runId: string
  initialPhase: Phase
  initialCloseoutSaved?: boolean
}) {
  const supabase = useMemo(() => createClient(), [])
  const [phase, setPhase] = useState<Phase>(initialPhase)
  const [expanded, setExpanded] = useState(initialPhase === 'debrief' || initialPhase === 'completed')
  const [closeoutSaved, setCloseoutSaved] = useState(initialCloseoutSaved)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [options, setOptions] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    const [metricResult, snapshotResult] = await Promise.all([
      supabase.rpc('ten_facilitator_metrics', { target_run_id: runId }),
      supabase.rpc('ten_api', { operation: 'snapshot', payload: { run_id: runId } }),
    ])
    if (metricResult.error) {
      setError(metricResult.error.message)
      return
    }
    if (snapshotResult.error) {
      setError(snapshotResult.error.message)
      return
    }
    setError(null)
    setMetrics(metricResult.data as Metrics)
    const snapshot = snapshotResult.data as SnapshotLite
    setPhase(snapshot.phase)
    setCloseoutSaved(Boolean(snapshot.closeout_saved))
    setOptions(snapshot.stage?.options ?? snapshot.notes?.options ?? [])
  }, [runId, supabase])

  useEffect(() => {
    if (phase === 'debrief' || phase === 'completed') setExpanded(true)
  }, [phase])

  useEffect(() => {
    void refresh()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session?.access_token) supabase.realtime.setAuth(data.session.access_token)
      if (cancelled) return
      channel = supabase.channel(`ten:${runId}`, { config: { private: true } })
        .on('broadcast', { event: 'state' }, () => { void refresh() })
        .on('broadcast', { event: 'responses' }, () => { void refresh() })
        .subscribe()
    })()
    const fallback = window.setInterval(() => { void refresh() }, 20000)
    return () => {
      cancelled = true
      window.clearInterval(fallback)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [refresh, runId, supabase])

  async function saveCloseout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaving(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('ten_api', {
      operation: 'closeout',
      payload: {
        run_id: runId,
        fidelity: {
          individual_before_discussion: form.get('individual_before_discussion') === 'on',
          answer_withheld: form.get('answer_withheld') === 'on',
          rationale_elicited: form.get('rationale_elicited') === 'on',
          debrief_completed: form.get('debrief_completed') === 'on',
        },
        notes: String(form.get('notes') ?? ''),
      },
    })
    setSaving(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setCloseoutSaved(true)
    await refresh()
  }

  const initialEntries = Object.entries(metrics?.initial_distribution ?? {})
  const revoteEntries = Object.entries(metrics?.revote_distribution ?? {})
  const initialConfidenceEntries = orderedConfidence(metrics?.initial_confidence_distribution ?? {})
  const revoteConfidenceEntries = orderedConfidence(metrics?.revote_confidence_distribution ?? {})

  return <aside className="fixed bottom-4 right-4 z-[70] w-[min(27rem,calc(100vw-2rem))] rounded-[1.5rem] border-2 border-[#d8a94e] bg-[#fff8df]/98 shadow-[0_24px_75px_rgba(23,54,58,.24)] backdrop-blur-md" aria-label="Facilitator room intelligence">
    <details open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-bold marker:hidden">
        <span><span className="block text-[10px] font-black tracking-[.14em] text-[#8b6a2b]">ROOM INTELLIGENCE</span><span className="font-serif text-lg capitalize">{phase.replaceAll('_',' ')}</span></span>
        <span className="rounded-full bg-[#17363a] px-3 py-2 text-xs font-black text-[#f2d99b]">{metrics?.participants ?? 0} joined</span>
      </summary>

      <div className="max-h-[70vh] overflow-y-auto border-t border-[#d8ccb6] p-4">
        {error && <p role="alert" className="mb-3 rounded-xl border border-[#c76057] bg-[#fcefed] p-3 text-sm font-bold text-[#8c403a]">{error}</p>}

        <div className="grid grid-cols-3 gap-2">
          <Metric label="Ready" value={String(metrics?.completion_ready ?? 0)} />
          <Metric label="Incomplete" value={String(metrics?.completion_incomplete ?? 0)} />
          <Metric label="Changed" value={metrics?.revote_count ? `${metrics.changed_percent}%` : '—'} />
        </div>

        {(metrics?.initial_confidence != null || metrics?.revote_confidence != null) && <div className="mt-2 grid grid-cols-2 gap-2">
          <Metric label="Initial confidence" value={metrics?.initial_confidence == null ? '—' : `${metrics.initial_confidence}%`} />
          <Metric label="Revote confidence" value={metrics?.revote_confidence == null ? '—' : `${metrics.revote_confidence}%`} />
        </div>}

        {(initialEntries.length > 0 || revoteEntries.length > 0) && <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Distribution title="Initial vote" entries={initialEntries} options={options} />
          <Distribution title="Revote" entries={revoteEntries} options={options} />
        </div>}

        {(initialConfidenceEntries.length > 0 || revoteConfidenceEntries.length > 0) && <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ConfidenceDistribution title="Initial confidence" entries={initialConfidenceEntries} />
          <ConfidenceDistribution title="Revote confidence" entries={revoteConfidenceEntries} />
        </div>}

        {phase === 'debrief' && <div className={`mt-4 rounded-xl border p-3 text-sm leading-6 ${metrics?.completion_incomplete ? 'border-[#c58a3e] bg-[#fff1cf]' : 'border-[#9bc9b9] bg-[#edf7f4]'}`}>
          <strong>{metrics?.completion_incomplete ? `${metrics.completion_incomplete} learner(s) are not completion-ready.` : 'All joined learners are completion-ready.'}</strong>
          <p className="mt-1">Completing the room does not fabricate credit: only learners with every required stage plus the transfer response receive a Signal/My Codex completion record.</p>
        </div>}

        {phase === 'completed' && <div className="mt-4">
          {closeoutSaved ? <div role="status" className="rounded-xl border border-[#9bc9b9] bg-[#edf7f4] p-4 text-sm"><strong>Fidelity closeout saved.</strong><p className="mt-1 leading-6">The session delivery record is complete.</p></div> : <form onSubmit={saveCloseout} className="rounded-xl border border-[#d8ccb6] bg-white/75 p-4">
            <p className="text-xs font-black tracking-[.12em] text-[#8b6a2b]">FIDELITY CLOSEOUT</p>
            <p className="mt-2 text-sm leading-6 text-[#526c6e]">Record whether the intended learning method was actually delivered. This is a process record, not a teacher-quality score.</p>
            <div className="mt-3 space-y-2">
              <Check name="individual_before_discussion" label="Individual commit occurred before peer discussion" />
              <Check name="answer_withheld" label="Correct answer was withheld until Reveal" />
              <Check name="rationale_elicited" label="Learners were asked to explain reasoning" />
              <Check name="debrief_completed" label="Debrief was completed" />
            </div>
            <label className="mt-3 block text-sm font-bold">Facilitator notes<textarea name="notes" maxLength={3000} className="mt-2 min-h-20 w-full rounded-xl border border-[#d8ccb6] bg-white p-3" placeholder="Optional delivery notes or issues to revisit…" /></label>
            <button disabled={saving} className="mt-3 min-h-12 w-full rounded-xl bg-[#17363a] px-4 font-black text-white disabled:opacity-60" type="submit">{saving ? 'Saving…' : 'Save fidelity closeout'}</button>
          </form>}
        </div>}
      </div>
    </details>
  </aside>
}

function Metric({ label, value }: { label:string; value:string }) {
  return <div className="rounded-xl border border-[#e6d9bd] bg-white/80 p-3"><p className="text-[9px] font-black tracking-[.1em] text-[#8b6a2b]">{label.toUpperCase()}</p><p className="mt-1 font-serif text-xl font-bold">{value}</p></div>
}

function Distribution({ title, entries, options }: { title:string; entries:[string,number][]; options:string[] }) {
  return <section className="rounded-xl border border-[#e6d9bd] bg-white/80 p-3"><p className="text-[10px] font-black tracking-[.1em] text-[#8b6a2b]">{title.toUpperCase()}</p>{entries.length ? <div className="mt-2 space-y-1">{entries.map(([key,value]) => <div key={key} className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate">{labelChoice(key,options)}</span><strong>{value}</strong></div>)}</div> : <p className="mt-2 text-xs text-[#526c6e]">No recorded vote yet.</p>}</section>
}

function ConfidenceDistribution({ title, entries }: { title:string; entries:[string,number][] }) {
  const total = entries.reduce((sum,[,count]) => sum + count,0)
  return <section className="rounded-xl border border-[#e6d9bd] bg-white/80 p-3"><p className="text-[10px] font-black tracking-[.1em] text-[#8b6a2b]">{title.toUpperCase()}</p>{entries.length ? <div className="mt-2 space-y-2">{entries.map(([key,value]) => <div key={key}><div className="flex justify-between text-[11px] font-bold"><span>{key}%</span><span>{value}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#ead9b8]"><div className="h-full bg-[#1f6668]" style={{width:`${total ? Math.round(value/total*100) : 0}%`}} /></div></div>)}</div> : <p className="mt-2 text-xs text-[#526c6e]">No confidence signal yet.</p>}</section>
}

function Check({ name, label }: { name:string; label:string }) {
  return <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-[#e6d9bd] bg-[#fffdf8] p-3 text-sm"><input className="mt-0.5 h-5 w-5" type="checkbox" name={name} /><span>{label}</span></label>
}

function labelChoice(key: string, options: string[]) {
  if (key === 'true') return 'True'
  if (key === 'false') return 'False'
  const index = Number(key)
  return Number.isInteger(index) && index >= 0 ? options[index] ?? `Choice ${index + 1}` : key
}

function orderedConfidence(distribution: Record<string, number>): [string,number][] {
  return Object.entries(distribution).sort(([a],[b]) => Number(a)-Number(b))
}
