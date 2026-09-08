'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { characterAssets } from '@/lib/the-ten/assets'

type Stage = {
  id?: string
  sequence?: number
  label?: string
  pptText?: string
  studentTask?: string
  responseType?: string
  peerInstruction?: boolean
  collectConfidence?: boolean
  mentorLens?: string | null
  options?: string[]
  stabilityDelta?: number
  answer?: unknown
  feedback?: string
  expectedReasoning?: string
}

type ResponseRecord = { stage_index: number; round: number; payload: Record<string, unknown>; confidence: number | null; justification: string }

type Snapshot = {
  id: string
  revision: number
  phase: 'waiting' | 'commit_open' | 'commit_locked' | 'discussion' | 'revote_open' | 'reveal' | 'transfer' | 'debrief' | 'completed'
  stage_index: number
  stage_count: number
  title: string
  mission_id: 'M01' | 'M02' | 'M03' | 'M04'
  mentor: string
  lens: string
  focus: string
  manager: boolean
  completed_at?: string | null
  discussion_ends_at?: string | null
  responses: ResponseRecord[]
  participants: number
  count: number
  initial_count: number
  distribution?: Record<string, number>
  changed_count?: number
  analytics?: Array<{ stage: number; round: number; responses: number; mean_confidence: number | null }>
  stage?: Stage
  notes?: Stage
  transfer?: { stem?: string; question?: string; answer?: string }
  completion?: { principle?: string; representation?: string; references?: unknown }
  stability?: number
}

const characterByMission = { M01: 'ibn-sina', M02: 'al-razi', M03: 'jabir', M04: 'hippocrates' } as const

export function LiveMission({ initial }: { initial: Snapshot }) {
  const [snapshot, setSnapshot] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const refresh = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('ten_api', { operation: 'snapshot', payload: { run_id: initial.id } })
    if (rpcError) { setError(rpcError.message); return }
    setSnapshot(data as Snapshot)
  }, [initial.id, supabase])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session?.access_token) supabase.realtime.setAuth(data.session.access_token)
      if (cancelled) return
      channel = supabase.channel(`ten:${initial.id}`, { config: { private: true } })
        .on('broadcast', { event: 'state' }, () => { void refresh() })
        .subscribe()
    })()
    const poll = window.setInterval(() => { void refresh() }, 12000)
    return () => { cancelled = true; window.clearInterval(poll); if (channel) void supabase.removeChannel(channel) }
  }, [initial.id, refresh, supabase])

  async function rpc(operation: string, payload: Record<string, unknown>) {
    setBusy(true); setError(null)
    const { error: rpcError } = await supabase.rpc('ten_api', { operation, payload })
    setBusy(false)
    if (rpcError) { setError(rpcError.message); return false }
    await refresh(); return true
  }

  async function command(next: string) {
    await rpc('command', { run_id: snapshot.id, revision: snapshot.revision, command: next })
  }

  const character = characterByMission[snapshot.mission_id]
  const portrait = characterAssets[character].neutral
  const progress = Math.max(0, Math.min(100, snapshot.stability ?? 0))
  const phaseLabel = snapshot.phase.replaceAll('_', ' ')

  return <main className="min-h-screen bg-[#f7f0df] text-[#17363a]">
    <header className="sticky top-0 z-40 border-b border-[#d8ccb6] bg-[#fffdf8]/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <Link href="/learner" className="flex min-h-11 items-center rounded-xl px-2 text-sm font-black text-[#1f6668]">← Baghdad</Link>
        <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-black tracking-[.16em] text-[#8b6a2b]">{snapshot.mission_id} · {phaseLabel.toUpperCase()}</p><h1 className="truncate font-serif text-lg font-bold">{snapshot.title}</h1></div>
        <div className="rounded-full bg-[#17363a] px-3 py-2 text-xs font-black text-[#f2d99b]">{progress}%</div>
      </div>
      <div className="h-1 bg-[#ead9b8]"><div className="h-full bg-[#46b9bd] transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
    </header>

    <div className="mx-auto max-w-3xl px-4 py-5 sm:py-8">
      {error && <div role="alert" className="mb-4 rounded-2xl border border-[#c76057] bg-[#fcefed] p-4 text-sm font-bold text-[#8c403a]">{error}</div>}

      <section className="mb-5 overflow-hidden rounded-[1.75rem] border border-[#d8ccb6] bg-[#fffdf8] shadow-[0_18px_50px_rgba(23,54,58,.08)]">
        <div className="flex items-center gap-4 p-4 sm:p-5">
          {portrait && <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#efe1c7] sm:h-28 sm:w-24"><Image src={portrait} alt={`${snapshot.mentor} mentor`} fill sizes="96px" className="object-cover" priority /></div>}
          <div className="min-w-0"><p className="text-[10px] font-black tracking-[.16em] text-[#1f6668]">MENTOR LENS · {snapshot.mentor}</p><p className="mt-2 font-serif text-xl leading-snug sm:text-2xl">{snapshot.stage?.mentorLens || snapshot.lens}</p><p className="mt-2 text-xs font-bold text-[#526c6e]">Stage {Math.min(snapshot.stage_index + 1, snapshot.stage_count)} of {snapshot.stage_count}</p></div>
        </div>
      </section>

      {snapshot.phase === 'waiting' && <Waiting snapshot={snapshot} />}
      {snapshot.stage && ['commit_open','commit_locked','discussion','revote_open','reveal'].includes(snapshot.phase) && <StageScene snapshot={snapshot} />}
      {['commit_open','revote_open'].includes(snapshot.phase) && snapshot.stage && !snapshot.manager && <ResponseComposer snapshot={snapshot} busy={busy} submit={rpc} />}
      {snapshot.phase === 'transfer' && !snapshot.manager && <TransferComposer snapshot={snapshot} busy={busy} submit={rpc} />}
      {snapshot.phase === 'commit_locked' && !snapshot.manager && <StatePanel title="Commit locked" copy="Your first answer is recorded. Keep your reasoning in mind while the room prepares for discussion." />}
      {snapshot.phase === 'discussion' && !snapshot.manager && <DiscussionPanel endsAt={snapshot.discussion_ends_at ?? null} />}
      {snapshot.phase === 'reveal' && snapshot.stage && <RevealPanel stage={snapshot.stage} distribution={snapshot.distribution} />}
      {snapshot.phase === 'debrief' && <Debrief snapshot={snapshot} />}
      {snapshot.phase === 'completed' && <Completed snapshot={snapshot} rpc={rpc} busy={busy} />}

      {snapshot.manager && <FacilitatorControls snapshot={snapshot} busy={busy} command={command} />}
    </div>
  </main>
}

function Waiting({ snapshot }: { snapshot: Snapshot }) {
  return <section className="rounded-[1.75rem] border border-[#315b5d] bg-[#17363a] p-6 text-white sm:p-8"><p className="text-xs font-black tracking-[.18em] text-[#f2d99b]">SIGNAL DETECTED</p><h2 className="mt-3 font-serif text-3xl">Waiting for your facilitator.</h2><p className="mt-3 leading-7 text-[#d8e7e2]">The mission is loaded, but no clinical clue has been released. Keep this screen open; the first stage appears automatically when the room goes live.</p><div className="mt-6 flex gap-3 text-xs font-bold"><span className="rounded-full border border-white/20 px-3 py-2">{snapshot.participants} connected</span><span className="rounded-full border border-white/20 px-3 py-2">Mission {snapshot.mission_id}</span></div></section>
}

function StageScene({ snapshot }: { snapshot: Snapshot }) {
  const stage = snapshot.stage!
  return <section className="mb-5 rounded-[1.75rem] border border-[#d8ccb6] bg-[#fffdf8] p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black tracking-[.14em] text-[#8b6a2b]">{stage.label?.toUpperCase()}</p><span className="rounded-full bg-[#edf7f4] px-3 py-1 text-[10px] font-black text-[#1f6668]">{snapshot.phase.replaceAll('_',' ').toUpperCase()}</span></div><p className="mt-4 whitespace-pre-wrap font-serif text-xl leading-8 text-[#17363a] sm:text-2xl">{stage.pptText}</p><div className="mt-5 rounded-2xl border-l-4 border-[#d8a94e] bg-[#f7f0df] p-4"><p className="text-xs font-black tracking-[.12em] text-[#8b6a2b]">YOUR MOVE</p><p className="mt-2 font-bold leading-6">{stage.studentTask}</p></div></section>
}

function ResponseComposer({ snapshot, busy, submit }: { snapshot: Snapshot; busy: boolean; submit: (operation: string, payload: Record<string, unknown>) => Promise<boolean> }) {
  const stage = snapshot.stage!
  const round = snapshot.phase === 'revote_open' ? 2 : 1
  const already = snapshot.responses.some(r => r.stage_index === snapshot.stage_index && r.round === round)
  const [choice, setChoice] = useState<number | null>(null)
  const [booleanChoice, setBooleanChoice] = useState<boolean | null>(null)
  const [choices, setChoices] = useState<number[]>([])
  const [text, setText] = useState('')
  const [justification, setJustification] = useState('')
  const [confidence, setConfidence] = useState<number | ''>('')
  const [mostLikely, setMostLikely] = useState('')
  const [mustNotMiss, setMustNotMiss] = useState('')
  const [lessLikely, setLessLikely] = useState('')
  const [supports, setSupports] = useState('')
  const [opposes, setOpposes] = useState('')
  const [missing, setMissing] = useState('')
  const [probability, setProbability] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    let answer: Record<string, unknown>
    if (stage.responseType === 'single_choice') answer = { choice }
    else if (stage.responseType === 'true_false') answer = { choice: booleanChoice }
    else if (stage.responseType === 'multiselect') answer = { choices }
    else if (stage.responseType === 'problem_representation+differential_builder') answer = { text, most_likely: mostLikely, must_not_miss: mustNotMiss, less_likely: lessLikely }
    else if (stage.responseType === 'evidence_map') answer = { text, supports, opposes, missing }
    else if (stage.responseType === 'differential+probability') answer = { text, probability }
    else answer = { text }
    await submit('respond', { run_id: snapshot.id, stage_index: snapshot.stage_index, round, answer, confidence: confidence === '' ? null : confidence, justification })
  }

  if (already) return <StatePanel title={round === 2 ? 'Revote recorded' : 'Commit recorded'} copy="Your response is locked for this round. Stay with the room; the next state will appear automatically." />

  return <form onSubmit={onSubmit} className="rounded-[1.75rem] border border-[#315b5d] bg-[#17363a] p-5 text-white shadow-[0_18px_50px_rgba(23,54,58,.14)] sm:p-7">
    <p className="text-xs font-black tracking-[.16em] text-[#f2d99b]">{round === 2 ? 'RE-COMMIT' : 'PRIVATE COMMIT'}</p>
    <h2 className="mt-2 font-serif text-2xl">{round === 2 ? 'Keep it or change it.' : 'Reason before the room speaks.'}</h2>
    <div className="mt-5 space-y-3">
      {stage.responseType === 'single_choice' && stage.options?.map((option,index) => <label key={option} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-4 ${choice === index ? 'border-[#f2d99b] bg-[#d8a94e]/15' : 'border-white/20 bg-white/5'}`}><input required type="radio" name="choice" value={index} checked={choice === index} onChange={() => setChoice(index)} /><span className="font-bold">{option}</span></label>)}
      {stage.responseType === 'true_false' && [true,false].map(value => <label key={String(value)} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-4 ${booleanChoice === value ? 'border-[#f2d99b] bg-[#d8a94e]/15' : 'border-white/20 bg-white/5'}`}><input required type="radio" name="tf" checked={booleanChoice === value} onChange={() => setBooleanChoice(value)} /><span className="font-bold">{value ? 'True' : 'False'}</span></label>)}
      {stage.responseType === 'multiselect' && stage.options?.map((option,index) => <label key={option} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-white/20 bg-white/5 p-4"><input type="checkbox" checked={choices.includes(index)} onChange={e => setChoices(current => e.target.checked ? [...current,index] : current.filter(item => item !== index))} /><span className="font-bold">{option}</span></label>)}
      {stage.responseType === 'problem_representation+differential_builder' && <><TextArea label="Problem representation" value={text} setValue={setText} /><TextInput label="Most likely" value={mostLikely} setValue={setMostLikely} /><TextInput label="Must not miss" value={mustNotMiss} setValue={setMustNotMiss} /><TextInput label="Less likely" value={lessLikely} setValue={setLessLikely} /></>}
      {stage.responseType === 'evidence_map' && <><TextArea label="Final judgment" value={text} setValue={setText} /><TextArea label="Supports" value={supports} setValue={setSupports} /><TextArea label="Opposes" value={opposes} setValue={setOpposes} /><TextArea label="Expected but missing" value={missing} setValue={setMissing} /></>}
      {stage.responseType === 'differential+probability' && <><TextArea label="Ranked differential" value={text} setValue={setText} /><label className="block text-sm font-bold">Clinical probability<select required className="mt-2 w-full rounded-xl border border-white/20 bg-[#fffdf8] p-3 text-[#17363a]" value={probability} onChange={e => setProbability(e.target.value)}><option value="">Choose…</option><option value="low">Low</option><option value="intermediate">Intermediate</option><option value="high">High</option></select></label></>}
      {!['single_choice','true_false','multiselect','problem_representation+differential_builder','evidence_map','differential+probability'].includes(stage.responseType ?? '') && <TextArea label="Your answer" value={text} setValue={setText} />}
    </div>
    {(stage.collectConfidence || stage.responseType === 'diagnosis+confidence') && <div className="mt-5"><p className="mb-2 text-sm font-bold">Confidence</p><div className="grid grid-cols-5 gap-2">{[20,40,60,80,100].map(value => <button type="button" key={value} onClick={() => setConfidence(value)} className={`min-h-11 rounded-xl border text-xs font-black ${confidence === value ? 'border-[#f2d99b] bg-[#d8a94e] text-[#17363a]' : 'border-white/20'}`}>{value}%</button>)}</div></div>}
    <TextArea label="Why? Give one brief justification" value={justification} setValue={setJustification} extra="mt-5" />
    <button disabled={busy} className="mt-5 min-h-14 w-full rounded-2xl bg-[#d8a94e] px-5 font-black text-[#17363a] transition active:scale-[.985] disabled:opacity-60" type="submit">{busy ? 'Recording…' : round === 2 ? 'Lock my revote' : 'Lock my reasoning'}</button>
  </form>
}

function TransferComposer({ snapshot, busy, submit }: { snapshot: Snapshot; busy: boolean; submit: (operation: string, payload: Record<string, unknown>) => Promise<boolean> }) {
  const [text,setText] = useState(''); const [why,setWhy] = useState('')
  const already = snapshot.responses.some(r => r.stage_index === snapshot.stage_count && r.round === 1)
  if (already) return <StatePanel title="Transfer response recorded" copy="Your facilitator will now close the reasoning loop." />
  return <form onSubmit={async e => { e.preventDefault(); await submit('respond',{run_id:snapshot.id,stage_index:snapshot.stage_count,round:1,answer:{text},confidence:null,justification:why}) }} className="rounded-[1.75rem] border border-[#315b5d] bg-[#17363a] p-6 text-white"><p className="text-xs font-black tracking-[.16em] text-[#f2d99b]">TRANSFER MICRO-CASE</p><h2 className="mt-3 font-serif text-2xl">{snapshot.transfer?.stem}</h2><p className="mt-4 font-bold">{snapshot.transfer?.question}</p><TextArea label="Apply the reasoning principle" value={text} setValue={setText} extra="mt-5" /><TextArea label="Why?" value={why} setValue={setWhy} extra="mt-4" /><button disabled={busy} className="mt-5 min-h-14 w-full rounded-2xl bg-[#d8a94e] px-5 font-black text-[#17363a]">Submit transfer response</button></form>
}

function RevealPanel({ stage, distribution }: { stage: Stage; distribution?: Record<string, number> }) {
  return <section role="status" className="rounded-[1.75rem] border border-[#9bc9b9] bg-[#edf7f4] p-5 sm:p-7"><p className="text-xs font-black tracking-[.16em] text-[#1f6668]">REVEAL</p><h2 className="mt-2 font-serif text-2xl">The evidence is now open.</h2>{stage.answer !== undefined && <p className="mt-4 rounded-xl bg-white/70 p-4 font-bold">Expected answer: {typeof stage.answer === 'object' ? JSON.stringify(stage.answer) : String(stage.answer)}</p>}<p className="mt-4 leading-7">{stage.feedback}</p>{stage.expectedReasoning && <div className="mt-4 border-t border-[#9bc9b9] pt-4"><p className="text-xs font-black tracking-[.12em] text-[#1f6668]">WHY IT MATTERS</p><p className="mt-2 leading-7">{stage.expectedReasoning}</p></div>}{distribution && Object.keys(distribution).length > 0 && <div className="mt-5 flex flex-wrap gap-2">{Object.entries(distribution).map(([key,n]) => <span key={key} className="rounded-full bg-[#17363a] px-3 py-2 text-xs font-bold text-white">Choice {Number(key)+1}: {n}</span>)}</div>}</section>
}

function DiscussionPanel({ endsAt }: { endsAt: string | null }) {
  const [now,setNow] = useState(Date.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()),1000); return () => window.clearInterval(timer) },[])
  const left = endsAt ? Math.max(0, Math.ceil((new Date(endsAt).getTime()-now)/1000)) : 0
  return <section className="rounded-[1.75rem] border border-[#d8a94e] bg-[#17363a] p-6 text-center text-white"><p className="text-xs font-black tracking-[.16em] text-[#f2d99b]">PEER DISCUSSION</p><div className="my-5 font-mono text-5xl font-black text-[#f2d99b]">{Math.floor(left/60)}:{String(left%60).padStart(2,'0')}</div><p className="mx-auto max-w-md leading-7 text-[#d8e7e2]">Put the phone down for a moment. Explain the assumption behind your choice, listen for a better argument, then return for the revote.</p></section>
}

function Debrief({ snapshot }: { snapshot: Snapshot }) { return <section className="rounded-[1.75rem] border border-[#d8a94e] bg-[#fff8df] p-6"><p className="text-xs font-black tracking-[.16em] text-[#8b6a2b]">DEBRIEF</p><h2 className="mt-2 font-serif text-3xl">What changed your mind?</h2><p className="mt-4 leading-7">{snapshot.completion?.principle}</p>{snapshot.transfer?.answer && <div className="mt-5 rounded-2xl border border-[#d8ccb6] bg-white/70 p-4"><strong>Transfer anchor</strong><p className="mt-2">{snapshot.transfer.answer}</p></div>}</section> }

function Completed({ snapshot, rpc, busy }: { snapshot: Snapshot; rpc: (operation:string,payload:Record<string,unknown>)=>Promise<boolean>; busy:boolean }) {
  const [reflection,setReflection] = useState(''); const saved = false
  return <section className="rounded-[1.75rem] border border-[#2f8a72] bg-[#edf7f4] p-6"><p className="text-xs font-black tracking-[.16em] text-[#2f8a72]">SIGNAL ACTIVATED</p><h2 className="mt-2 font-serif text-3xl">{snapshot.title} is now part of your Codex.</h2><p className="mt-4 leading-7">{snapshot.completion?.principle}</p>{!snapshot.manager && <div className="mt-5"><TextArea label="One thing I will carry into the next case" value={reflection} setValue={setReflection} /><button disabled={busy || reflection.trim().length<3 || saved} onClick={() => rpc('reflect',{run_id:snapshot.id,text:reflection})} className="ten-action mt-4">Save reflection</button></div>}<Link className="ten-text-link mt-5" href="/learner">Return to the evolved Baghdad world →</Link></section>
}

function FacilitatorControls({ snapshot, busy, command }: { snapshot: Snapshot; busy: boolean; command: (next:string)=>Promise<void> }) {
  const stage = snapshot.stage ?? snapshot.notes
  const next = snapshot.phase === 'waiting' ? ['commit_open','Go live · Open commit'] : snapshot.phase === 'commit_open' ? ['commit_locked','Lock commit'] : snapshot.phase === 'commit_locked' ? ['discussion','Start peer discussion'] : snapshot.phase === 'discussion' ? [stage?.peerInstruction ? 'revote_open' : 'reveal', stage?.peerInstruction ? 'Open revote' : 'Reveal'] : snapshot.phase === 'revote_open' ? ['reveal','Reveal'] : snapshot.phase === 'reveal' ? ['next','Next stage'] : snapshot.phase === 'transfer' ? ['debrief','Open debrief'] : snapshot.phase === 'debrief' ? ['completed','Activate signal · Complete'] : null
  return <aside className="mt-6 rounded-[1.75rem] border-2 border-[#d8a94e] bg-[#fff8df] p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black tracking-[.16em] text-[#8b6a2b]">FACILITATOR CONTROL ROOM</p><h2 className="mt-1 font-serif text-2xl">Room state: {snapshot.phase.replaceAll('_',' ')}</h2></div><div className="flex gap-2"><span className="rounded-full bg-white px-3 py-2 text-xs font-black">{snapshot.participants} joined</span><span className="rounded-full bg-white px-3 py-2 text-xs font-black">{snapshot.count} responded</span></div></div>{stage && <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white/75 p-4"><p className="text-xs font-black text-[#8b6a2b]">EXPECTED REASONING</p><p className="mt-2 text-sm leading-6">{stage.expectedReasoning ?? 'Use the mission stage notes.'}</p></div><div className="rounded-2xl bg-white/75 p-4"><p className="text-xs font-black text-[#8b6a2b]">MENTOR PROMPT</p><p className="mt-2 text-sm leading-6">{stage.mentorLens ?? snapshot.lens}</p></div></div>}{typeof snapshot.changed_count === 'number' && <p className="mt-4 text-sm font-bold">Changed after discussion: {snapshot.changed_count} learner(s)</p>}{next && <button disabled={busy} onClick={() => command(next[0])} className="mt-5 min-h-14 w-full rounded-2xl bg-[#17363a] px-5 font-black text-white disabled:opacity-60">{busy ? 'Updating room…' : next[1]}</button>}</aside>
}

function StatePanel({ title, copy }: { title:string; copy:string }) { return <section className="rounded-[1.75rem] border border-[#d8ccb6] bg-[#fffdf8] p-6 text-center"><div className="mx-auto mb-4 h-3 w-3 animate-pulse rounded-full bg-[#46b9bd] motion-reduce:animate-none" /><h2 className="font-serif text-2xl">{title}</h2><p className="mx-auto mt-3 max-w-md leading-7 text-[#526c6e]">{copy}</p></section> }
function TextArea({ label,value,setValue,extra='' }: { label:string; value:string; setValue:(value:string)=>void; extra?:string }) { return <label className={`block text-sm font-bold ${extra}`}>{label}<textarea required minLength={3} value={value} onChange={e=>setValue(e.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-white/20 bg-[#fffdf8] p-3 text-[#17363a]" /></label> }
function TextInput({ label,value,setValue }: { label:string; value:string; setValue:(value:string)=>void }) { return <label className="block text-sm font-bold">{label}<input required minLength={2} value={value} onChange={e=>setValue(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#fffdf8] p-3 text-[#17363a]" /></label> }
