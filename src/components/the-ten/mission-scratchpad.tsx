'use client'

import { useEffect, useMemo, useState } from 'react'
import { MissionSystemIcon } from '@/components/the-ten/art-sprite'
import { createClient } from '@/lib/supabase/client'

type Phase = 'waiting' | 'commit_open' | 'commit_locked' | 'discussion' | 'revote_open' | 'reveal' | 'transfer' | 'debrief' | 'completed'
type MissionId = 'M01' | 'M02' | 'M03' | 'M04'
type Snapshot = { id: string; mission_id: MissionId; stage_index: number; phase: Phase; manager?: boolean }

export function MissionScratchpad({ initial }: { initial: Snapshot }) {
  const supabase = useMemo(() => createClient(), [])
  const [snapshot, setSnapshot] = useState(initial)
  const [open, setOpen] = useState(false)
  const [symptom, setSymptom] = useState('')
  const [context, setContext] = useState('')
  const [features, setFeatures] = useState('')
  const [stabilize, setStabilize] = useState('')
  const [diagnose, setDiagnose] = useState('')

  const mode = !snapshot.manager && snapshot.mission_id === 'M02' && snapshot.stage_index === 0 ? 'framing'
    : !snapshot.manager && snapshot.mission_id === 'M04' && snapshot.stage_index === 0 ? 'priorities'
      : null

  useEffect(() => {
    if (!mode) return
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false
    const refresh = async () => {
      const { data } = await supabase.rpc('ten_api', { operation: 'snapshot', payload: { run_id: initial.id } })
      if (!cancelled && data) setSnapshot(data as Snapshot)
    }
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session?.access_token) supabase.realtime.setAuth(data.session.access_token)
      if (cancelled) return
      channel = supabase.channel(`ten:${initial.id}`, { config: { private: true } })
        .on('broadcast', { event: 'state' }, () => { void refresh() })
        .subscribe()
    })()
    return () => { cancelled = true; if (channel) void supabase.removeChannel(channel) }
  }, [initial.id, mode, supabase])

  useEffect(() => {
    if (!mode) setOpen(false)
  }, [mode])

  if (!mode) return null

  const isFraming = mode === 'framing'
  const title = isFraming ? 'Framing Challenge' : 'Parallel Priorities'
  const mentor = isFraming ? 'AL-RAZI · EVIDENCE LENS' : 'HIPPOCRATES · SAFETY LENS'
  const missionId = isFraming ? 'M02' : 'M04'
  const framingPreview = [symptom.trim(), context.trim(), features.trim()].filter(Boolean).join(' · ')

  return <div className="fixed bottom-4 left-4 z-50 max-w-[calc(100vw-2rem)]">
    {open ? <section className="w-[min(25rem,calc(100vw-2rem))] max-h-[75vh] overflow-y-auto rounded-[1.5rem] border border-[#315b5d] bg-[#fffdf8] shadow-[0_24px_80px_rgba(23,54,58,.28)]" aria-label={title}>
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#d8ccb6] bg-[#17363a] p-4 text-white">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#fffdf8]"><MissionSystemIcon missionId={missionId} size={40} label="" /></span>
        <div className="min-w-0 flex-1"><p className="text-[9px] font-black tracking-[.16em] text-[#f2d99b]">{mentor}</p><h2 className="font-serif text-xl">{title}</h2></div>
        <button type="button" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-xl border border-white/20 text-lg" aria-label={`Close ${title}`}>×</button>
      </div>

      {isFraming ? <div className="p-4 sm:p-5">
        <p className="text-sm leading-6 text-[#526c6e]">Strip away the patient’s label before you commit. Build a neutral representation only from clues that are already visible.</p>
        <label className="mt-4 block text-sm font-bold">Core symptom, not the label<input value={symptom} onChange={event => setSymptom(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#d8ccb6] bg-white px-3" placeholder="e.g. exertional chest pressure" /></label>
        <label className="mt-3 block text-sm font-bold">Context / trigger<input value={context} onChange={event => setContext(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#d8ccb6] bg-white px-3" placeholder="What makes the symptom more meaningful?" /></label>
        <label className="mt-3 block text-sm font-bold">High-value associated feature<input value={features} onChange={event => setFeatures(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#d8ccb6] bg-white px-3" placeholder="One feature that changes your frame" /></label>
        <div className="mt-4 rounded-xl border border-[#9bc9b9] bg-[#edf7f4] p-4"><p className="text-[9px] font-black tracking-[.14em] text-[#1f6668]">NEUTRAL FRAME</p><p className="mt-2 text-sm font-bold leading-6">{framingPreview || 'Your neutral representation will appear here as you build it.'}</p></div>
        <p className="mt-3 text-xs leading-5 text-[#667b7d]">Scratchpad only. Your private mission response remains the recorded answer.</p>
      </div> : <div className="p-4 sm:p-5">
        <p className="text-sm leading-6 text-[#526c6e]">Hold two tracks at once: what protects physiology now, and what information is still needed to diagnose and treat safely.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="rounded-xl border border-[#e5bdb7] bg-[#fcefed] p-3 text-sm font-black text-[#8c403a]">STABILIZE NOW<textarea value={stabilize} onChange={event => setStabilize(event.target.value)} className="mt-2 min-h-32 w-full rounded-lg border border-[#e5bdb7] bg-white p-3 font-normal text-[#17363a]" placeholder="Immediate priorities…" /></label>
          <label className="rounded-xl border border-[#9bc9b9] bg-[#edf7f4] p-3 text-sm font-black text-[#246a59]">DIAGNOSE SAFELY<textarea value={diagnose} onChange={event => setDiagnose(event.target.value)} className="mt-2 min-h-32 w-full rounded-lg border border-[#9bc9b9] bg-white p-3 font-normal text-[#17363a]" placeholder="Evidence / safety checks…" /></label>
        </div>
        <div className="mt-4 rounded-xl bg-[#f7f0df] p-4 text-xs leading-5 text-[#526c6e]">Do not let one column erase the other. Use this organizer to prepare your recorded reasoning in the mission response.</div>
      </div>}
    </section> : <button type="button" onClick={() => setOpen(true)} className="flex min-h-14 items-center gap-3 rounded-full border border-[#315b5d] bg-[#fffdf8] px-4 text-sm font-black text-[#17363a] shadow-[0_16px_45px_rgba(23,54,58,.22)]"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#17363a]"><MissionSystemIcon missionId={missionId} size={34} label="" /></span>{title}</button>}
  </div>
}
