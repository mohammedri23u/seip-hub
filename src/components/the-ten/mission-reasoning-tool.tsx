'use client'

import { useEffect, useMemo, useState } from 'react'
import { MissionSystemIcon } from '@/components/the-ten/art-sprite'
import { createClient } from '@/lib/supabase/client'

type Phase = 'waiting' | 'commit_open' | 'commit_locked' | 'discussion' | 'revote_open' | 'reveal' | 'transfer' | 'debrief' | 'completed'
type Snapshot = { id: string; mission_id: 'M01' | 'M02' | 'M03' | 'M04'; stage_index: number; phase: Phase; manager?: boolean }

type Binary = 'yes' | 'no' | null

const percItems = [
  'Age 50 years or older',
  'Heart rate 100/min or higher',
  'Oxygen saturation below 95%',
  'Unilateral leg swelling',
  'Hemoptysis',
  'Surgery or trauma requiring hospitalisation in the past 4 weeks',
  'Previous DVT or PE',
  'Estrogen / hormone use',
] as const

const wellsItems = [
  { label: 'Clinical signs of DVT', points: 3 },
  { label: 'PE judged more likely than an alternative diagnosis', points: 3 },
  { label: 'Heart rate above 100/min', points: 1.5 },
  { label: 'Immobilisation ≥3 days or surgery in previous 4 weeks', points: 1.5 },
  { label: 'Previous DVT or PE', points: 1.5 },
  { label: 'Hemoptysis', points: 1 },
  { label: 'Malignancy on treatment, treated in the last 6 months, or palliative', points: 1 },
] as const

const targetSequence = ['Suspicion', 'Clinical probability', 'D-dimer when indicated', 'Definitive imaging', 'Management'] as const

export function MissionReasoningTool({ initial }: { initial: Snapshot }) {
  const supabase = useMemo(() => createClient(), [])
  const [snapshot, setSnapshot] = useState(initial)
  const [open, setOpen] = useState(false)
  const [perc, setPerc] = useState<Record<number, Binary>>({})
  const [wells, setWells] = useState<Record<number, boolean>>({})
  const [sequence, setSequence] = useState<string[]>(['Definitive imaging', 'Suspicion', 'Management', 'D-dimer when indicated', 'Clinical probability'])
  const [checked, setChecked] = useState(false)

  const activeMission = !snapshot.manager && snapshot.mission_id === 'M03'
  const relevant = activeMission && (snapshot.stage_index === 1 || snapshot.stage_index === 2 || snapshot.phase === 'debrief' || snapshot.phase === 'completed')

  useEffect(() => {
    if (!activeMission) return
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
  }, [activeMission, initial.id, supabase])

  useEffect(() => {
    if (!relevant) setOpen(false)
  }, [relevant])

  if (!relevant) return null

  const mode = snapshot.phase === 'debrief' || snapshot.phase === 'completed' ? 'sequence' : snapshot.stage_index === 1 ? 'perc' : 'wells'
  const wellsTotal = wellsItems.reduce((sum, item, index) => sum + (wells[index] ? item.points : 0), 0)
  const allPercAnswered = percItems.every((_, index) => perc[index] != null)
  const percPositiveCount = percItems.reduce((sum, _, index) => sum + (perc[index] === 'yes' ? 1 : 0), 0)
  const sequenceCorrect = sequence.every((item, index) => item === targetSequence[index])

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= sequence.length) return
    setSequence(current => {
      const copy = [...current]
      ;[copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]]
      return copy
    })
    setChecked(false)
  }

  return <div className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)]">
    {open ? <section className="w-[min(26rem,calc(100vw-2rem))] max-h-[78vh] overflow-y-auto rounded-[1.5rem] border border-[#315b5d] bg-[#fffdf8] shadow-[0_24px_80px_rgba(23,54,58,.28)]" aria-label="Jabir reasoning tool">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#d8ccb6] bg-[#17363a] p-4 text-white">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#fffdf8]"><MissionSystemIcon missionId="M03" size={40} label="" /></span>
        <div className="min-w-0 flex-1"><p className="text-[9px] font-black tracking-[.16em] text-[#f2d99b]">JABIR · RULE BUILDER</p><h2 className="font-serif text-xl">Test the hypothesis</h2></div>
        <button type="button" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-xl border border-white/20 text-lg" aria-label="Close reasoning tool">×</button>
      </div>

      <div className="p-4 sm:p-5">
        {mode === 'perc' ? <>
          <p className="text-sm leading-6 text-[#526c6e]">Work through the PERC features from the clues already released. Mark whether each feature is present. This tool does not tell you the correct vote before Reveal.</p>
          <div className="mt-4 space-y-2">{percItems.map((label,index) => <fieldset key={label} className="rounded-xl border border-[#d8ccb6] bg-white p-3"><legend className="px-1 text-sm font-bold">{label}</legend><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" aria-pressed={perc[index] === 'yes'} onClick={() => setPerc(current => ({...current,[index]:'yes'}))} className={`min-h-11 rounded-lg border text-xs font-black ${perc[index] === 'yes' ? 'border-[#c8794d] bg-[#f9ece3] text-[#7f452d]' : 'border-[#d8ccb6]'}`}>Present</button><button type="button" aria-pressed={perc[index] === 'no'} onClick={() => setPerc(current => ({...current,[index]:'no'}))} className={`min-h-11 rounded-lg border text-xs font-black ${perc[index] === 'no' ? 'border-[#2f8a72] bg-[#e8f5ef] text-[#246a59]' : 'border-[#d8ccb6]'}`}>Absent</button></div></fieldset>)}</div>
          <div className="mt-4 rounded-xl bg-[#f7f0df] p-4 text-sm"><strong>Your working rule:</strong> {allPercAnswered ? `${percPositiveCount} feature${percPositiveCount === 1 ? '' : 's'} marked present. Decide what that means for your own vote.` : 'Complete all eight features before committing your interpretation.'}</div>
        </> : null}

        {mode === 'wells' ? <>
          <p className="text-sm leading-6 text-[#526c6e]">Build the two-level PE Wells score from the evidence already on screen. The total is a reasoning aid; your mission answer remains a separate private commit.</p>
          <div className="mt-4 space-y-2">{wellsItems.map((item,index) => <button key={item.label} type="button" aria-pressed={Boolean(wells[index])} onClick={() => setWells(current => ({...current,[index]:!current[index]}))} className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm font-bold ${wells[index] ? 'border-[#c8794d] bg-[#f9ece3]' : 'border-[#d8ccb6] bg-white'}`}><span>{item.label}</span><span className="shrink-0 rounded-full bg-[#17363a] px-2.5 py-1 text-xs text-[#f2d99b]">+{item.points}</span></button>)}</div>
          <div className="mt-4 flex items-end justify-between rounded-xl bg-[#17363a] p-4 text-white"><div><p className="text-[9px] font-black tracking-[.14em] text-[#f2d99b]">YOUR WORKING TOTAL</p><p className="mt-1 text-sm text-[#d8e7e2]">Two-level Wells: ≤4 = PE unlikely; &gt;4 = PE likely.</p></div><strong className="font-serif text-4xl">{wellsTotal}</strong></div>
        </> : null}

        {mode === 'sequence' ? <>
          <p className="text-sm leading-6 text-[#526c6e]">Reconstruct the pathway from principle rather than memorizing this patient. Use the arrows to put each step in order.</p>
          <ol className="mt-4 space-y-2">{sequence.map((item,index) => <li key={item} className="flex min-h-14 items-center gap-2 rounded-xl border border-[#d8ccb6] bg-white p-2"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#17363a] text-xs font-black text-[#f2d99b]">{index+1}</span><span className="min-w-0 flex-1 text-sm font-bold">{item}</span><button type="button" disabled={index===0} onClick={() => move(index,-1)} className="grid h-10 w-10 place-items-center rounded-lg border border-[#d8ccb6] disabled:opacity-30" aria-label={`Move ${item} earlier`}>↑</button><button type="button" disabled={index===sequence.length-1} onClick={() => move(index,1)} className="grid h-10 w-10 place-items-center rounded-lg border border-[#d8ccb6] disabled:opacity-30" aria-label={`Move ${item} later`}>↓</button></li>)}</ol>
          <button type="button" onClick={() => setChecked(true)} className="mt-4 min-h-12 w-full rounded-xl bg-[#c8794d] px-4 font-black text-white">Check my sequence</button>
          {checked ? <p role="status" className={`mt-3 rounded-xl p-3 text-sm font-bold ${sequenceCorrect ? 'bg-[#e8f5ef] text-[#246a59]' : 'bg-[#fff4cf] text-[#7a5b1c]'}`}>{sequenceCorrect ? 'Sequence reconstructed. Carry the principle into a different patient.' : 'Not yet. Ask: what question must be answered before the next test becomes meaningful?'}</p> : null}
        </> : null}
      </div>
    </section> : <button type="button" onClick={() => setOpen(true)} className="flex min-h-14 items-center gap-3 rounded-full border border-[#315b5d] bg-[#17363a] px-4 text-sm font-black text-white shadow-[0_16px_45px_rgba(23,54,58,.24)]"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#fffdf8]"><MissionSystemIcon missionId="M03" size={34} label="" /></span>{mode === 'sequence' ? 'Reconstruct pathway' : 'Open Rule Builder'}</button>}
  </div>
}
