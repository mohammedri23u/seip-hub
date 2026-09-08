'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCharacterAsset } from '@/lib/the-ten/assets'

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
  commonErrors?: string[]
  errorTags?: string[]
}

type ResponseRecord = {
  stage_index: number
  round: number
  payload: Record<string, unknown>
  confidence: number | null
  justification: string
}

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
const missionTheme = {
  M01: { accent: '#d8a94e', soft: '#fff4cf', label: 'PATTERN' },
  M02: { accent: '#46b9bd', soft: '#e7f7f6', label: 'EVIDENCE' },
  M03: { accent: '#c8794d', soft: '#f9ece3', label: 'HYPOTHESIS' },
  M04: { accent: '#2f8a72', soft: '#e8f5ef', label: 'TREATMENT' },
} as const

export function LiveMission({ initial }: { initial: Snapshot }) {
  const [snapshot, setSnapshot] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const refresh = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('ten_api', { operation: 'snapshot', payload: { run_id: initial.id } })
    if (rpcError) {
      setError(rpcError.message)
      return
    }
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
        .on('broadcast', { event: 'responses' }, () => {
          if (initial.manager) void refresh()
        })
        .subscribe()
    })()

    const poll = window.setInterval(() => { void refresh() }, initial.manager ? 15000 : 25000)
    return () => {
      cancelled = true
      window.clearInterval(poll)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [initial.id, initial.manager, refresh, supabase])

  async function rpc(operation: string, payload: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('ten_api', { operation, payload })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return false
    }
    await refresh()
    return true
  }

  async function command(next: string) {
    setBusy(true)
    setError(null)
    const { error: commandError } = await supabase.rpc('ten_command', {
      target_run_id: snapshot.id,
      requested_command: next,
    })
    setBusy(false)
    if (commandError) {
      setError(commandError.message)
      return
    }
    await refresh()
  }

  const character = characterByMission[snapshot.mission_id]
  const reaction = snapshot.phase === 'waiting' ? 'locked' : snapshot.phase === 'discussion' ? 'thinking' : snapshot.phase === 'completed' ? 'celebrate' : 'guide'
  const portrait = getCharacterAsset(character, reaction)
  const progress = Math.max(0, Math.min(100, snapshot.stability ?? 0))
  const phaseLabel = snapshot.phase.replaceAll('_', ' ')
  const theme = missionTheme[snapshot.mission_id]
  const backHref = snapshot.manager ? '/facilitator/the-ten' : '/learner'
  const backLabel = snapshot.manager ? 'Control studio' : 'Baghdad'

  return <main className="relative min-h-screen overflow-x-hidden bg-[#f7f0df] text-[#17363a]">
    <MissionAtmosphere mission={snapshot.mission_id} />

    <header className="sticky top-0 z-40 border-b border-[#d8ccb6] bg-[#fffdf8]/94 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <Link href={backHref} className="flex min-h-11 items-center rounded-xl px-2 text-sm font-black text-[#1f6668]">← {backLabel}</Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-black tracking-[.16em] text-[#8b6a2b]">{snapshot.mission_id} · {theme.label} · {phaseLabel.toUpperCase()}</p>
          <h1 className="truncate font-serif text-lg font-bold">{snapshot.title}</h1>
        </div>
        <div aria-label={`${progress}% mission stability`} className="rounded-full bg-[#17363a] px-3 py-2 text-xs font-black text-[#f2d99b]">{progress}%</div>
      </div>
      <div className="h-1 bg-[#ead9b8]"><div className="h-full transition-[width] duration-300" style={{ width: `${progress}%`, background: theme.accent }} /></div>
    </header>

    <div className="relative z-10 mx-auto max-w-3xl px-4 py-5 sm:py-8">
      <p className="sr-only" aria-live="polite">Room state changed to {phaseLabel}.</p>
      {error && <div role="alert" className="mb-4 rounded-2xl border border-[#c76057] bg-[#fcefed] p-4 text-sm font-bold text-[#8c403a]">{error}</div>}

      <section className="mb-5 overflow-hidden rounded-[1.75rem] border border-[#d8ccb6] bg-[#fffdf8]/96 shadow-[0_18px_50px_rgba(23,54,58,.08)] backdrop-blur-sm">
        <div className="flex items-center gap-4 p-4 sm:p-5">
          {portrait && <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#efe1c7] sm:h-28 sm:w-24"><Image src={portrait} alt={`${snapshot.mentor} mentor`} fill sizes="96px" className="object-cover" priority /></div>}
          <div className="min-w-0">
            <p className="text-[10px] font-black tracking-[.16em] text-[#1f6668]">MENTOR LENS · {snapshot.mentor}</p>
            <p className="mt-2 font-serif text-xl leading-snug sm:text-2xl">{snapshot.stage?.mentorLens || snapshot.lens}</p>
            <p className="mt-2 text-xs font-bold text-[#526c6e]">{snapshot.phase === 'transfer' ? 'Transfer micro-case' : snapshot.phase === 'debrief' || snapshot.phase === 'completed' ? 'Mission closeout' : `Stage ${Math.min(snapshot.stage_index + 1, snapshot.stage_count)} of ${snapshot.stage_count}`}</p>
          </div>
        </div>
      </section>

      {snapshot.phase === 'waiting' && <Waiting snapshot={snapshot} />}
      {snapshot.stage && ['commit_open','commit_locked','discussion','revote_open','reveal'].includes(snapshot.phase) && <StageScene snapshot={snapshot} />}
      {['commit_open','revote_open'].includes(snapshot.phase) && snapshot.stage && !snapshot.manager && <ResponseComposer snapshot={snapshot} busy={busy} submit={rpc} />}
      {snapshot.phase === 'transfer' && !snapshot.manager && <TransferComposer snapshot={snapshot} busy={busy} submit={rpc} />}
      {snapshot.phase === 'transfer' && snapshot.manager && <TransferOverview snapshot={snapshot} />}
      {snapshot.phase === 'commit_locked' && !snapshot.manager && <StatePanel title="Commit locked" copy={snapshot.stage?.peerInstruction ? 'Your first answer is recorded. Keep your reasoning in mind; discussion is next.' : 'Your answer is recorded. The facilitator is preparing the reveal.'} />}
      {snapshot.phase === 'discussion' && !snapshot.manager && <DiscussionPanel endsAt={snapshot.discussion_ends_at ?? null} />}
      {snapshot.phase === 'reveal' && snapshot.stage && <RevealPanel stage={snapshot.stage} distribution={snapshot.distribution} />}
      {snapshot.phase === 'debrief' && <Debrief snapshot={snapshot} />}
      {snapshot.phase === 'completed' && <Completed snapshot={snapshot} rpc={rpc} busy={busy} />}

      {snapshot.manager && <FacilitatorControls snapshot={snapshot} busy={busy} command={command} />}
    </div>
  </main>
}

function MissionAtmosphere({ mission }: { mission: Snapshot['mission_id'] }) {
  const theme = missionTheme[mission]
  return <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
    <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-25 blur-3xl" style={{ background: theme.accent }} />
    <div className="absolute -left-20 top-[42%] h-64 w-64 rounded-full opacity-15 blur-3xl" style={{ background: theme.accent }} />
    <div className="absolute inset-x-0 bottom-0 h-52 opacity-[.16]" style={{ background: `linear-gradient(180deg, transparent, ${theme.soft})` }} />
  </div>
}

function Waiting({ snapshot }: { snapshot: Snapshot }) {
  return <section className="rounded-[1.75rem] border border-[#315b5d] bg-[#17363a] p-6 text-white shadow-[0_20px_70px_rgba(23,54,58,.18)] sm:p-8">
    <p className="text-xs font-black tracking-[.18em] text-[#f2d99b]">SIGNAL DETECTED</p>
    <h2 className="mt-3 font-serif text-3xl">Waiting for the facilitator.</h2>
    <p className="mt-3 leading-7 text-[#d8e7e2]">The mission is loaded, but no clinical clue has been released. Keep this screen open; the first stage appears automatically when the facilitator opens the commit.</p>
    <div className="mt-6 flex flex-wrap gap-3 text-xs font-bold"><span className="rounded-full border border-white/20 px-3 py-2">{snapshot.participants} connected</span><span className="rounded-full border border-white/20 px-3 py-2">Mission {snapshot.mission_id}</span></div>
  </section>
}

function StageScene({ snapshot }: { snapshot: Snapshot }) {
  const stage = snapshot.stage!
  const theme = missionTheme[snapshot.mission_id]
  return <section className="mb-5 overflow-hidden rounded-[1.75rem] border border-[#d8ccb6] bg-[#fffdf8]/96 shadow-[0_16px_45px_rgba(23,54,58,.07)] backdrop-blur-sm">
    <div className="h-1.5" style={{ background: theme.accent }} />
    <div className="p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black tracking-[.14em] text-[#8b6a2b]">{stage.label?.toUpperCase()}</p><span className="rounded-full bg-[#edf7f4] px-3 py-1 text-[10px] font-black text-[#1f6668]">{snapshot.phase.replaceAll('_',' ').toUpperCase()}</span></div>
      <p className="mt-4 whitespace-pre-wrap font-serif text-xl leading-8 text-[#17363a] sm:text-2xl">{stage.pptText}</p>
      <div className="mt-5 rounded-2xl border-l-4 bg-[#f7f0df] p-4" style={{ borderColor: theme.accent }}><p className="text-xs font-black tracking-[.12em] text-[#8b6a2b]">YOUR MOVE</p><p className="mt-2 font-bold leading-6">{stage.studentTask}</p></div>
    </div>
  </section>
}

function ResponseComposer({ snapshot, busy, submit }: { snapshot: Snapshot; busy: boolean; submit: (operation: string, payload: Record<string, unknown>) => Promise<boolean> }) {
  const stage = snapshot.stage!
  const round = snapshot.phase === 'revote_open' ? 2 : 1
  const already = snapshot.responses.some(r => r.stage_index === snapshot.stage_index && r.round === round)
  const previous = snapshot.responses.find(r => r.stage_index === snapshot.stage_index && r.round === 1)
  const [choice, setChoice] = useState<number | null>(() => round === 2 && typeof previous?.payload.choice === 'number' ? previous.payload.choice : null)
  const [booleanChoice, setBooleanChoice] = useState<boolean | null>(() => round === 2 && typeof previous?.payload.choice === 'boolean' ? previous.payload.choice : null)
  const [choices, setChoices] = useState<number[]>(() => round === 2 && Array.isArray(previous?.payload.choices) ? previous.payload.choices.filter((value): value is number => typeof value === 'number') : [])
  const [text, setText] = useState(() => round === 2 && typeof previous?.payload.text === 'string' ? previous.payload.text : '')
  const [justification, setJustification] = useState(() => round === 2 ? previous?.justification ?? '' : '')
  const [confidence, setConfidence] = useState<number | ''>(() => round === 2 && previous?.confidence ? previous.confidence : '')
  const [mostLikely, setMostLikely] = useState(() => round === 2 && typeof previous?.payload.most_likely === 'string' ? previous.payload.most_likely : '')
  const [mustNotMiss, setMustNotMiss] = useState(() => round === 2 && typeof previous?.payload.must_not_miss === 'string' ? previous.payload.must_not_miss : '')
  const [lessLikely, setLessLikely] = useState(() => round === 2 && typeof previous?.payload.less_likely === 'string' ? previous.payload.less_likely : '')
  const [supports, setSupports] = useState(() => round === 2 && typeof previous?.payload.supports === 'string' ? previous.payload.supports : '')
  const [opposes, setOpposes] = useState(() => round === 2 && typeof previous?.payload.opposes === 'string' ? previous.payload.opposes : '')
  const [missing, setMissing] = useState(() => round === 2 && typeof previous?.payload.missing === 'string' ? previous.payload.missing : '')
  const [probability, setProbability] = useState(() => round === 2 && typeof previous?.payload.probability === 'string' ? previous.payload.probability : '')

  const needsConfidence = Boolean(stage.collectConfidence || stage.responseType === 'diagnosis+confidence')
  const responseReady = stage.responseType === 'single_choice' ? choice !== null
    : stage.responseType === 'true_false' ? booleanChoice !== null
      : stage.responseType === 'multiselect' ? choices.length > 0
        : stage.responseType === 'problem_representation+differential_builder' ? text.trim().length >= 3 && mostLikely.trim().length >= 2 && mustNotMiss.trim().length >= 2 && lessLikely.trim().length >= 2
          : stage.responseType === 'evidence_map' ? text.trim().length >= 3 && supports.trim().length >= 2 && opposes.trim().length >= 2 && missing.trim().length >= 2
            : stage.responseType === 'differential+probability' ? text.trim().length >= 3 && Boolean(probability)
              : text.trim().length >= 3
  const canSubmit = responseReady && justification.trim().length >= 3 && (!needsConfidence || confidence !== '')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
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
    {round === 2 && <p className="mt-2 text-sm leading-6 text-[#d8e7e2]">Your first response is preloaded. Change it only if the discussion changed your reasoning.</p>}

    <div className="mt-5 space-y-3">
      {stage.responseType === 'single_choice' && stage.options?.map((option,index) => <label key={option} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-4 ${choice === index ? 'border-[#f2d99b] bg-[#d8a94e]/15' : 'border-white/20 bg-white/5'}`}><input required type="radio" name="choice" value={index} checked={choice === index} onChange={() => setChoice(index)} /><span className="font-bold">{option}</span></label>)}
      {stage.responseType === 'true_false' && [true,false].map(value => <label key={String(value)} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-4 ${booleanChoice === value ? 'border-[#f2d99b] bg-[#d8a94e]/15' : 'border-white/20 bg-white/5'}`}><input required type="radio" name="tf" checked={booleanChoice === value} onChange={() => setBooleanChoice(value)} /><span className="font-bold">{value ? 'True' : 'False'}</span></label>)}
      {stage.responseType === 'multiselect' && stage.options?.map((option,index) => <label key={option} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-4 ${choices.includes(index) ? 'border-[#f2d99b] bg-[#d8a94e]/15' : 'border-white/20 bg-white/5'}`}><input type="checkbox" checked={choices.includes(index)} onChange={e => setChoices(current => e.target.checked ? [...new Set([...current,index])] : current.filter(item => item !== index))} /><span className="font-bold">{option}</span></label>)}
      {stage.responseType === 'problem_representation+differential_builder' && <><TextArea label="One-sentence Problem Representation" value={text} setValue={setText} /><div className="grid gap-3 sm:grid-cols-3"><RankedField rank="01" label="Most Likely" value={mostLikely} setValue={setMostLikely} /><RankedField rank="02" label="Must Not Miss" value={mustNotMiss} setValue={setMustNotMiss} /><RankedField rank="03" label="Less Likely" value={lessLikely} setValue={setLessLikely} /></div></>}
      {stage.responseType === 'evidence_map' && <><TextArea label="Final judgment" value={text} setValue={setText} /><div className="grid gap-3 sm:grid-cols-3"><EvidenceField label="Supports" value={supports} setValue={setSupports} /><EvidenceField label="Opposes" value={opposes} setValue={setOpposes} /><EvidenceField label="Expected but missing" value={missing} setValue={setMissing} /></div></>}
      {stage.responseType === 'differential+probability' && <><TextArea label="Ranked differential" value={text} setValue={setText} /><label className="block text-sm font-bold">Clinical probability<select required className="mt-2 w-full rounded-xl border border-white/20 bg-[#fffdf8] p-3 text-[#17363a]" value={probability} onChange={e => setProbability(e.target.value)}><option value="">Choose…</option><option value="low">Low</option><option value="intermediate">Intermediate</option><option value="high">High</option></select></label></>}
      {stage.responseType === 'diagnosis+confidence' && <TextArea label="Working diagnosis / updated judgment" value={text} setValue={setText} />}
      {stage.responseType === 'team_commit' && <TextArea label="30-second team synthesis" value={text} setValue={setText} />}
      {stage.responseType === 'free_text' && <TextArea label="Your reasoning" value={text} setValue={setText} />}
      {!['single_choice','true_false','multiselect','problem_representation+differential_builder','evidence_map','differential+probability','diagnosis+confidence','team_commit','free_text'].includes(stage.responseType ?? '') && <TextArea label="Your answer" value={text} setValue={setText} />}
    </div>

    {needsConfidence && <div className="mt-5"><p className="mb-2 text-sm font-bold">Confidence <span className="font-normal text-[#cfe1dc]">— calibration signal, not extra marks</span></p><div className="grid grid-cols-5 gap-2">{[20,40,60,80,100].map(value => <button type="button" key={value} onClick={() => setConfidence(value)} className={`min-h-11 rounded-xl border text-xs font-black ${confidence === value ? 'border-[#f2d99b] bg-[#d8a94e] text-[#17363a]' : 'border-white/20'}`}>{value}%</button>)}</div></div>}
    <TextArea label="Why? Give one brief justification" value={justification} setValue={setJustification} extra="mt-5" />
    <button disabled={busy || !canSubmit} className="mt-5 min-h-14 w-full rounded-2xl bg-[#d8a94e] px-5 font-black text-[#17363a] transition active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-50" type="submit">{busy ? 'Recording…' : round === 2 ? 'Lock my revote' : 'Lock my reasoning'}</button>
  </form>
}

function TransferComposer({ snapshot, busy, submit }: { snapshot: Snapshot; busy: boolean; submit: (operation: string, payload: Record<string, unknown>) => Promise<boolean> }) {
  const [text,setText] = useState('')
  const [why,setWhy] = useState('')
  const already = snapshot.responses.some(r => r.stage_index === snapshot.stage_count && r.round === 1)
  const canSubmit = text.trim().length >= 3 && why.trim().length >= 3
  if (already) return <StatePanel title="Transfer response recorded" copy="Your near-transfer response is locked. The facilitator will now close the reasoning loop." />
  return <form onSubmit={async e => { e.preventDefault(); if (!canSubmit) return; await submit('respond',{run_id:snapshot.id,stage_index:snapshot.stage_count,round:1,answer:{text},confidence:null,justification:why}) }} className="rounded-[1.75rem] border border-[#315b5d] bg-[#17363a] p-6 text-white shadow-[0_18px_50px_rgba(23,54,58,.14)]">
    <p className="text-xs font-black tracking-[.16em] text-[#f2d99b]">TRANSFER MICRO-CASE</p>
    <h2 className="mt-3 font-serif text-2xl leading-8">{snapshot.transfer?.stem}</h2>
    <p className="mt-4 font-bold leading-7">{snapshot.transfer?.question}</p>
    <TextArea label="Apply the reasoning principle" value={text} setValue={setText} extra="mt-5" />
    <TextArea label="Why?" value={why} setValue={setWhy} extra="mt-4" />
    <button disabled={busy || !canSubmit} className="mt-5 min-h-14 w-full rounded-2xl bg-[#d8a94e] px-5 font-black text-[#17363a] disabled:opacity-50">{busy ? 'Recording…' : 'Submit transfer response'}</button>
  </form>
}

function TransferOverview({ snapshot }: { snapshot: Snapshot }) {
  return <section className="rounded-[1.75rem] border border-[#315b5d] bg-[#17363a] p-6 text-white"><p className="text-xs font-black tracking-[.16em] text-[#f2d99b]">TRANSFER MICRO-CASE · FACILITATOR VIEW</p><h2 className="mt-3 font-serif text-2xl leading-8">{snapshot.transfer?.stem}</h2><p className="mt-4 font-bold leading-7">{snapshot.transfer?.question}</p><p className="mt-5 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm leading-6 text-[#d8e7e2]">Do not reveal the anchor yet. Let learners commit their transfer response before opening the debrief.</p></section>
}

function RevealPanel({ stage, distribution }: { stage: Stage; distribution?: Record<string, number> }) {
  return <section role="status" className="rounded-[1.75rem] border border-[#9bc9b9] bg-[#edf7f4] p-5 shadow-[0_16px_45px_rgba(23,54,58,.06)] sm:p-7">
    <p className="text-xs font-black tracking-[.16em] text-[#1f6668]">REVEAL</p>
    <h2 className="mt-2 font-serif text-2xl">The evidence is now open.</h2>
    {stage.answer !== undefined && <div className="mt-4 rounded-xl bg-white/75 p-4"><p className="text-xs font-black tracking-[.12em] text-[#1f6668]">EXPECTED ANSWER</p><p className="mt-2 font-bold leading-6">{formatAnswer(stage.answer, stage.options)}</p></div>}
    <p className="mt-4 leading-7">{stage.feedback}</p>
    {stage.expectedReasoning && <div className="mt-4 border-t border-[#9bc9b9] pt-4"><p className="text-xs font-black tracking-[.12em] text-[#1f6668]">WHY IT MATTERS</p><p className="mt-2 leading-7">{stage.expectedReasoning}</p></div>}
    {distribution && Object.keys(distribution).length > 0 && <div className="mt-5 grid gap-2 sm:grid-cols-2">{Object.entries(distribution).map(([key,n]) => <div key={key} className="flex items-center justify-between gap-3 rounded-xl bg-[#17363a] px-3 py-2 text-xs font-bold text-white"><span className="truncate">{distributionLabel(key, stage.options)}</span><span>{n}</span></div>)}</div>}
  </section>
}

function DiscussionPanel({ endsAt }: { endsAt: string | null }) {
  const [now,setNow] = useState(Date.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()),1000); return () => window.clearInterval(timer) },[])
  const left = endsAt ? Math.max(0, Math.ceil((new Date(endsAt).getTime()-now)/1000)) : 0
  return <section className="rounded-[1.75rem] border border-[#d8a94e] bg-[#17363a] p-6 text-center text-white shadow-[0_18px_50px_rgba(23,54,58,.16)]"><p className="text-xs font-black tracking-[.16em] text-[#f2d99b]">PEER DISCUSSION</p><div className="my-5 font-mono text-5xl font-black text-[#f2d99b]" aria-label={`${left} seconds remaining`}>{Math.floor(left/60)}:{String(left%60).padStart(2,'0')}</div><p className="mx-auto max-w-md leading-7 text-[#d8e7e2]">Put the phone down for a moment. Explain the assumption behind your choice, listen for a stronger argument, then return for the revote.</p></section>
}

function Debrief({ snapshot }: { snapshot: Snapshot }) {
  return <section className="rounded-[1.75rem] border border-[#d8a94e] bg-[#fff8df] p-6 shadow-[0_16px_45px_rgba(23,54,58,.06)]"><p className="text-xs font-black tracking-[.16em] text-[#8b6a2b]">DEBRIEF</p><h2 className="mt-2 font-serif text-3xl">Close the reasoning loop.</h2><p className="mt-4 leading-7">{snapshot.completion?.principle}</p>{snapshot.transfer?.answer && <div className="mt-5 rounded-2xl border border-[#d8ccb6] bg-white/70 p-4"><strong>Transfer anchor</strong><p className="mt-2 leading-6">{snapshot.transfer.answer}</p></div>}</section>
}

function Completed({ snapshot, rpc, busy }: { snapshot: Snapshot; rpc: (operation:string,payload:Record<string,unknown>)=>Promise<boolean>; busy:boolean }) {
  const [reflection,setReflection] = useState('')
  const [saved,setSaved] = useState(false)

  async function saveReflection() {
    const ok = await rpc('reflect',{run_id:snapshot.id,text:reflection})
    if (ok) setSaved(true)
  }

  return <section className="rounded-[1.75rem] border border-[#2f8a72] bg-[#edf7f4] p-6 shadow-[0_18px_55px_rgba(47,138,114,.10)]">
    <p className="text-xs font-black tracking-[.16em] text-[#2f8a72]">SIGNAL ACTIVATED</p>
    <h2 className="mt-2 font-serif text-3xl">{snapshot.title} has reached completion.</h2>
    <p className="mt-4 leading-7">{snapshot.completion?.principle}</p>
    {!snapshot.manager && <div className="mt-5"><TextArea label="One thing I will carry into the next case" value={reflection} setValue={setReflection} /><button disabled={busy || reflection.trim().length<3 || saved} onClick={saveReflection} className="ten-action mt-4">{saved ? 'Reflection saved' : 'Save reflection'}</button><p className="mt-3 text-sm leading-6 text-[#526c6e]">Signal credit is recorded only when every required mission stage and the transfer response were completed. If this signal does not appear in My Codex, contact the facilitator.</p></div>}
    <Link className="ten-text-link mt-5" href={snapshot.manager ? '/facilitator/the-ten' : '/learner'}>{snapshot.manager ? 'Return to facilitator studio' : 'Return to the evolved Baghdad world'} →</Link>
  </section>
}

function FacilitatorControls({ snapshot, busy, command }: { snapshot: Snapshot; busy: boolean; command: (next:string)=>Promise<void> }) {
  const stage = snapshot.stage ?? snapshot.notes
  const peer = Boolean(stage?.peerInstruction)
  const next: [string,string] | null = snapshot.phase === 'waiting' ? ['commit_open','Go live · Open commit']
    : snapshot.phase === 'commit_open' ? ['commit_locked','Lock commit']
      : snapshot.phase === 'commit_locked' ? (peer ? ['discussion','Start peer discussion'] : ['reveal','Reveal'])
        : snapshot.phase === 'discussion' ? ['revote_open','Open revote']
          : snapshot.phase === 'revote_open' ? ['reveal','Reveal']
            : snapshot.phase === 'reveal' ? ['next','Next stage']
              : snapshot.phase === 'transfer' ? ['debrief','Open debrief']
                : snapshot.phase === 'debrief' ? ['completed','Activate signal · Complete']
                  : null

  const currentStageNumber = snapshot.stage_index + 1
  const firstRound = snapshot.analytics?.find(item => item.stage === currentStageNumber && item.round === 1)
  const secondRound = snapshot.analytics?.find(item => item.stage === currentStageNumber && item.round === 2)
  const participantBase = Math.max(snapshot.participants, 1)
  const responseRate = Math.min(100, Math.round((snapshot.count / participantBase) * 100))

  return <aside className="mt-6 overflow-hidden rounded-[1.75rem] border-2 border-[#d8a94e] bg-[#fff8df] shadow-[0_20px_60px_rgba(23,54,58,.10)]">
    <div className="p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-black tracking-[.16em] text-[#8b6a2b]">FACILITATOR CONTROL ROOM</p><h2 className="mt-1 font-serif text-2xl">{snapshot.phase.replaceAll('_',' ')}</h2>{stage?.id && <p className="mt-1 text-xs font-bold text-[#526c6e]">Presenter cue: {stage.id}</p>}</div>
        <div className="flex flex-wrap gap-2"><span className="rounded-full bg-white px-3 py-2 text-xs font-black">{snapshot.participants} joined</span><span className="rounded-full bg-white px-3 py-2 text-xs font-black">{snapshot.count} responded</span></div>
      </div>

      {['commit_open','revote_open'].includes(snapshot.phase) && <div className="mt-5"><div className="mb-2 flex justify-between text-xs font-black"><span>RESPONSE PROGRESS</span><span>{responseRate}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[#ead9b8]"><div className="h-full bg-[#1f6668] transition-[width] duration-200" style={{width:`${responseRate}%`}} /></div></div>}

      {snapshot.phase === 'discussion' && <div className="mt-5"><DiscussionPanel endsAt={snapshot.discussion_ends_at ?? null} /></div>}

      {stage && <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/75 p-4"><p className="text-xs font-black text-[#8b6a2b]">EXPECTED REASONING</p><p className="mt-2 text-sm leading-6">{stage.expectedReasoning ?? 'Use the mission stage notes.'}</p></div>
        <div className="rounded-2xl bg-white/75 p-4"><p className="text-xs font-black text-[#8b6a2b]">MENTOR LENS</p><p className="mt-2 text-sm leading-6">{stage.mentorLens ?? snapshot.lens}</p></div>
      </div>}

      {stage?.commonErrors?.length ? <div className="mt-3 rounded-2xl border border-[#e6cf9f] bg-white/70 p-4"><p className="text-xs font-black text-[#8b6a2b]">COMMON ERRORS TO LISTEN FOR</p><ul className="mt-2 space-y-1 text-sm leading-6">{stage.commonErrors.map(error => <li key={error}>• {error}</li>)}</ul></div> : null}

      {(firstRound?.mean_confidence !== null && firstRound?.mean_confidence !== undefined) || (secondRound?.mean_confidence !== null && secondRound?.mean_confidence !== undefined) ? <div className="mt-3 grid gap-2 sm:grid-cols-3"><Metric label="Initial confidence" value={firstRound?.mean_confidence === null || firstRound?.mean_confidence === undefined ? '—' : `${firstRound.mean_confidence}%`} /><Metric label="Revote confidence" value={secondRound?.mean_confidence === null || secondRound?.mean_confidence === undefined ? '—' : `${secondRound.mean_confidence}%`} /><Metric label="Changed answer" value={`${snapshot.changed_count ?? 0}`} /></div> : null}

      {snapshot.distribution && Object.keys(snapshot.distribution).length > 0 && ['commit_locked','discussion','revote_open','reveal'].includes(snapshot.phase) && <div className="mt-4"><p className="text-xs font-black tracking-[.12em] text-[#8b6a2b]">INITIAL VOTE DISTRIBUTION</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{Object.entries(snapshot.distribution).map(([key,n]) => <div key={key} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs font-bold"><span className="truncate">{distributionLabel(key, stage?.options)}</span><span>{n}</span></div>)}</div></div>}

      {snapshot.phase === 'debrief' && <div className="mt-4 rounded-2xl border border-[#c9b06f] bg-white/70 p-4 text-sm leading-6"><strong>Completion rule:</strong> only learners who completed every required stage plus the transfer response receive the mission Signal/My Codex completion record. This protects completion data from passive page attendance.</div>}

      {next && <button disabled={busy} onClick={() => command(next[0])} className="mt-5 min-h-14 w-full rounded-2xl bg-[#17363a] px-5 font-black text-white transition active:scale-[.985] disabled:opacity-60">{busy ? 'Updating room…' : next[1]}</button>}
    </div>
  </aside>
}

function Metric({ label, value }: { label:string; value:string }) {
  return <div className="rounded-2xl bg-white/80 p-3"><p className="text-[10px] font-black tracking-[.1em] text-[#8b6a2b]">{label.toUpperCase()}</p><p className="mt-1 font-serif text-xl font-bold">{value}</p></div>
}

function StatePanel({ title, copy }: { title:string; copy:string }) {
  return <section className="rounded-[1.75rem] border border-[#d8ccb6] bg-[#fffdf8] p-6 text-center shadow-[0_16px_45px_rgba(23,54,58,.06)]"><div className="mx-auto mb-4 h-3 w-3 animate-pulse rounded-full bg-[#46b9bd] motion-reduce:animate-none" /><h2 className="font-serif text-2xl">{title}</h2><p className="mx-auto mt-3 max-w-md leading-7 text-[#526c6e]">{copy}</p></section>
}

function RankedField({ rank,label,value,setValue }: { rank:string; label:string; value:string; setValue:(value:string)=>void }) {
  return <label className="block rounded-2xl border border-white/20 bg-white/5 p-3 text-sm font-bold"><span className="mr-2 text-[#f2d99b]">{rank}</span>{label}<input required minLength={2} value={value} onChange={e=>setValue(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/20 bg-[#fffdf8] p-3 text-[#17363a]" /></label>
}

function EvidenceField({ label,value,setValue }: { label:string; value:string; setValue:(value:string)=>void }) {
  return <label className="block rounded-2xl border border-white/20 bg-white/5 p-3 text-sm font-bold">{label}<textarea required minLength={2} value={value} onChange={e=>setValue(e.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-white/20 bg-[#fffdf8] p-3 text-[#17363a]" placeholder={label === 'Opposes' ? 'Write None if there is no opposing finding.' : undefined} /></label>
}

function TextArea({ label,value,setValue,extra='' }: { label:string; value:string; setValue:(value:string)=>void; extra?:string }) {
  return <label className={`block text-sm font-bold ${extra}`}>{label}<textarea required minLength={3} value={value} onChange={e=>setValue(e.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-white/20 bg-[#fffdf8] p-3 text-[#17363a]" /></label>
}

function formatAnswer(answer: unknown, options?: string[]) {
  if (typeof answer === 'number') return options?.[answer] ?? `Choice ${answer + 1}`
  if (typeof answer === 'boolean') return answer ? 'True' : 'False'
  if (Array.isArray(answer)) return answer.map(value => typeof value === 'number' ? options?.[value] ?? `Choice ${value + 1}` : String(value)).join(' · ')
  if (answer && typeof answer === 'object') return Object.entries(answer as Record<string,unknown>).map(([key,value]) => `${key.replaceAll('_',' ')}: ${String(value)}`).join(' · ')
  return String(answer)
}

function distributionLabel(key: string, options?: string[]) {
  if (key === 'true') return 'True'
  if (key === 'false') return 'False'
  const index = Number(key)
  if (Number.isInteger(index) && index >= 0) return options?.[index] ?? `Choice ${index + 1}`
  return key
}
