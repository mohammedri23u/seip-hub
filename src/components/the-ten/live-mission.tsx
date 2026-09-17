'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCharacterAsset } from '@/lib/the-ten/assets'
import { GuideAbility } from '@/components/the-ten/experience/guide-ability'
import { MissionEpilogue } from '@/components/the-ten/experience/mission-epilogue'
import { MissionPrelude } from '@/components/the-ten/experience/mission-prelude'
import { MissionEvidence, MissionReveal, MissionSteps } from '@/components/the-ten/experience/mission-reading'
import { SignalActivation } from '@/components/the-ten/experience/signal-activation'
import { computeWorldState, createMissionEpilogue, createMissionPrelude, guideKeyFromName, type GuideKey, type GuideUseRecord, type StoryProgressRecord } from '@/lib/the-ten/experience'
import { useI18n } from '@/components/i18n-provider'
import { LanguageSwitcher } from '@/components/language-switcher'

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
  mission_id: string
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

type ExperienceState = {
  guide_key?: GuideKey | null
  story_progress?: Record<string, StoryProgressRecord>
  guide_uses?: Record<string, GuideUseRecord>
  earned_run_ids?: string[]
  earned_signal_ids?: string[]
}

export function LiveMission({ initial, initialExperience }: { initial: Snapshot; initialExperience: ExperienceState }) {
  const { locale, tr } = useI18n()
  const router = useRouter()
  const [snapshot, setSnapshot] = useState(initial)
  const [experience, setExperience] = useState(initialExperience)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [replayingPrelude, setReplayingPrelude] = useState(false)
  const [replayingEpilogue, setReplayingEpilogue] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const refresh = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('ten_api', { operation: 'snapshot', payload: { run_id: initial.id } })
    if (rpcError) {
      setError(tr('The room could not refresh. Check your connection and try again.', 'تعذّر تحديث الغرفة. تحقّق من الاتصال وحاول مجدداً.'))
      return
    }
    const nextSnapshot = data as Snapshot
    setSnapshot(nextSnapshot)
    if (!initial.manager && nextSnapshot.phase === 'completed') {
      const { data: experienceData } = await supabase.rpc('ten_experience_state', { target_cohort_id: null })
      if (experienceData) setExperience(experienceData as ExperienceState)
    }
  }, [initial.id, supabase, tr])

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
      setError(tr('The response could not be recorded. Try again.', 'تعذّر تسجيل الإجابة. حاول مجدداً.'))
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
      setError(tr('The teaching state could not be changed. Try again.', 'تعذّر تغيير حالة التعليم. حاول مجدداً.'))
      return
    }
    await refresh()
  }

  const saveStoryProgress = useCallback(async (storyId: string, sceneId: string, completed: boolean) => {
    const { data, error: progressError } = await supabase.rpc('ten_experience_command', {
      operation: 'save_story_progress', payload: { story_id: storyId, scene_id: sceneId, completed }, target_cohort_id: null,
    })
    if (progressError) { const message = tr('Story progress could not be saved. Try again.', 'تعذّر حفظ تقدّم القصة. حاول مجدداً.'); setError(message); throw new Error(message) }
    if (data) setExperience(data as ExperienceState)
  }, [supabase, tr])

  const episodeInput = useMemo(() => ({
    runId: snapshot.id, missionId: snapshot.mission_id, title: snapshot.title, mentor: snapshot.mentor,
    lens: snapshot.lens, focus: snapshot.focus, guardian: guideKeyFromName(snapshot.mentor), guide: experience.guide_key, nexusLevel: computeWorldState(experience.earned_signal_ids?.length ?? 0, 4, locale).level,
  }), [experience.guide_key, experience.earned_signal_ids?.length, locale, snapshot.focus, snapshot.id, snapshot.lens, snapshot.mentor, snapshot.mission_id, snapshot.title])
  const prelude = useMemo(() => createMissionPrelude(episodeInput, locale), [episodeInput, locale])
  const epilogue = useMemo(() => createMissionEpilogue(episodeInput, locale), [episodeInput, locale])
  const activationId = `signal:${snapshot.mission_id.toLowerCase()}:activation`
  const preludeProgress = experience.story_progress?.[prelude.id]
  const activationComplete = Boolean(experience.story_progress?.[activationId]?.completed_at)
  const epilogueProgress = experience.story_progress?.[epilogue.id]
  const signalEarned = experience.earned_run_ids?.includes(snapshot.id) ?? false

  if (!snapshot.manager && snapshot.phase === 'waiting' && replayingPrelude) {
    return <MissionPrelude story={prelude} onProgress={saveStoryProgress} onComplete={() => setReplayingPrelude(false)} replaying onDismiss={() => setReplayingPrelude(false)} />
  }
  if (!snapshot.manager && snapshot.phase === 'waiting' && !preludeProgress?.completed_at) {
    return <MissionPrelude story={prelude} initialSceneId={preludeProgress?.last_scene_id} onProgress={saveStoryProgress} onComplete={() => undefined} />
  }
  if (!snapshot.manager && snapshot.phase === 'completed' && signalEarned && !activationComplete) {
    return <SignalActivation signalNumber={Math.max(1, experience.earned_signal_ids?.length ?? 1)} guideKey={experience.guide_key} onContinue={() => saveStoryProgress(activationId, 'restored', true)} />
  }
  if (!snapshot.manager && snapshot.phase === 'completed' && signalEarned && !epilogueProgress?.completed_at) {
    return <MissionEpilogue story={epilogue} initialSceneId={epilogueProgress?.last_scene_id} onProgress={saveStoryProgress} onComplete={() => router.push('/learner')} />
  }
  if (!snapshot.manager && snapshot.phase === 'completed' && replayingEpilogue) {
    return <MissionEpilogue story={epilogue} onProgress={saveStoryProgress} onComplete={() => setReplayingEpilogue(false)} replaying onDismiss={() => setReplayingEpilogue(false)} />
  }

  const character = guideKeyFromName(snapshot.mentor) ?? 'ibn-sina'
  const reaction = snapshot.phase === 'waiting' ? 'locked' : snapshot.phase === 'discussion' ? 'thinking' : snapshot.phase === 'completed' ? 'celebrate' : 'guide'
  const portrait = getCharacterAsset(character, reaction)
  const progress = Math.max(0, Math.min(100, snapshot.stability ?? 0))
  const phaseLabels: Record<Snapshot['phase'], string> = { waiting: tr('waiting', 'انتظار'), commit_open: tr('commit open', 'الالتزام مفتوح'), commit_locked: tr('commit locked', 'الالتزام مغلق'), discussion: tr('discussion', 'نقاش'), revote_open: tr('revote open', 'إعادة التصويت مفتوحة'), reveal: tr('reveal', 'الكشف'), transfer: tr('transfer', 'الانتقال'), debrief: tr('debrief', 'الخلاصة'), completed: tr('completed', 'مكتملة') }
  const phaseLabel = phaseLabels[snapshot.phase]
  const backHref = snapshot.manager ? '/facilitator/the-ten' : '/learner'
  const backLabel = snapshot.manager ? tr('Control studio', 'استوديو التحكم') : tr('Baghdad', 'بغداد')
  const mode = ['reveal', 'debrief', 'completed'].includes(snapshot.phase) ? 'reveal' : 'reasoning'

  return <main className="ten-mission" data-experience={mode} data-phase={snapshot.phase}>
    <a href="#mission-content" className="ten-skip">{tr('Skip to reasoning', 'تخطَّ إلى الاستدلال')}</a>
    <header className="ten-mission-header">
      <Link href={backHref}>← {backLabel}</Link>
      <div><p className="ten-eyebrow">{snapshot.mission_id} / {phaseLabel}</p><h1 className="ten-clinical-content" lang="en">{snapshot.title}</h1></div>
      <LanguageSwitcher />
      <MissionSteps current={snapshot.stage_index} total={snapshot.stage_count}/>
    </header>
    <div className="ten-mission-layout" id="mission-content" tabIndex={-1}>
      <p className="sr-only" aria-live="polite">{tr(`Room state changed to ${phaseLabel}.`, `تغيّرت حالة الغرفة إلى ${phaseLabel}.`)}</p>
      {error && <div role="alert" className="ten-mission-error">{error}</div>}
      <aside className="ten-mission-margin">
        <div className="ten-guardian-lens">
          {portrait && ['waiting','debrief','completed'].includes(snapshot.phase) && <div className="ten-guardian-figure"><Image src={portrait} alt="" fill sizes="120px" className="object-contain" /></div>}
          <p className="ten-eyebrow">{tr('MISSION GUARDIAN', 'حارس المهمة')} / <bdi dir="ltr" lang="en">{snapshot.mentor}</bdi></p>
          <p className="ten-clinical-content" lang="en">{snapshot.stage?.mentorLens || snapshot.lens}</p>
        </div>
        {!snapshot.manager && experience.guide_key && !['waiting','completed'].includes(snapshot.phase) ? <GuideAbility guideKey={experience.guide_key} runId={snapshot.id} previouslyUsed={Boolean(experience.guide_uses?.[snapshot.id])} /> : null}
        {snapshot.manager && <p className="ten-mission-stability">{tr('Mission stability', 'استقرار المهمة')} / {progress}%</p>}
      </aside>
      <div className="ten-mission-paper">

      {snapshot.phase === 'waiting' && <Waiting snapshot={snapshot} onReplay={preludeProgress?.completed_at ? () => setReplayingPrelude(true) : undefined} />}
      {snapshot.stage && ['commit_open','commit_locked','discussion','revote_open','reveal'].includes(snapshot.phase) && <MissionEvidence key={snapshot.stage_index} stage={snapshot.stage} phase={snapshot.phase} />}
      {['commit_open','revote_open'].includes(snapshot.phase) && snapshot.stage && !snapshot.manager && <ResponseComposer key={`${snapshot.id}:${snapshot.stage_index}:${snapshot.phase}`} snapshot={snapshot} busy={busy} submit={rpc} />}
      {snapshot.phase === 'transfer' && !snapshot.manager && <TransferComposer snapshot={snapshot} busy={busy} submit={rpc} />}
      {snapshot.phase === 'transfer' && snapshot.manager && <TransferOverview snapshot={snapshot} />}
      {snapshot.phase === 'commit_locked' && !snapshot.manager && <StatePanel title={tr('Commit locked', 'تم إغلاق الالتزام')} copy={snapshot.responses.some(r => r.stage_index === snapshot.stage_index && r.round === 1) ? (snapshot.stage?.peerInstruction ? tr('Your first answer is recorded. Keep your reasoning in mind; discussion is next.', 'تم تسجيل إجابتك الأولى. احتفظ باستدلالك في ذهنك؛ النقاش هو الخطوة التالية.') : tr('Your answer is recorded. The facilitator is preparing the reveal.', 'تم تسجيل إجابتك. يستعد الميسّر للكشف.')) : tr('This round is closed. No response from you is recorded for this stage. Stay with the room for the next step.', 'أُغلقت هذه الجولة ولم تُسجّل لك إجابة في هذه المرحلة. ابقَ في الغرفة للخطوة التالية.')} />}
      {snapshot.phase === 'discussion' && !snapshot.manager && <DiscussionPanel endsAt={snapshot.discussion_ends_at ?? null} />}
      {!snapshot.manager && ['commit_locked','discussion','reveal'].includes(snapshot.phase) && snapshot.stage && <RecordedResponse snapshot={snapshot} />}
      {snapshot.phase === 'reveal' && snapshot.stage && <MissionReveal stage={snapshot.stage} distribution={snapshot.distribution} />}
      {snapshot.phase === 'debrief' && <Debrief snapshot={snapshot} />}
      {snapshot.phase === 'completed' && <Completed snapshot={snapshot} rpc={rpc} busy={busy} signalEarned={signalEarned} onReplay={signalEarned && epilogueProgress?.completed_at ? () => setReplayingEpilogue(true) : undefined} />}

      {snapshot.manager && <FacilitatorControls snapshot={snapshot} busy={busy} command={command} />}
      </div>
    </div>
  </main>
}

function Waiting({ snapshot, onReplay }: { snapshot: Snapshot; onReplay?: () => void }) {
  const { tr } = useI18n()
  return <section className="rounded-[1.75rem] border border-[#315b5d] bg-[#17363a] p-6 text-white shadow-[0_20px_70px_rgba(23,54,58,.18)] sm:p-8">
    <p className="text-xs font-black tracking-[.18em] text-[#f2d99b]">{tr('SIGNAL DETECTED', 'تم رصد إشارة')}</p>
    <h2 className="mt-3 font-serif text-3xl">{tr('Waiting for the facilitator.', 'بانتظار الميسّر.')}</h2>
    <p className="mt-3 leading-7 text-[#d8e7e2]">{tr('The mission is loaded, but no clinical clue has been released. Keep this screen open; the first stage appears automatically when the facilitator opens the commit.', 'تم تحميل المهمة، لكن لم يُكشف أي دليل سريري بعد. أبقِ هذه الشاشة مفتوحة؛ ستظهر المرحلة الأولى تلقائياً حين يفتح الميسّر الالتزام.')}</p>
    <div className="mt-6 flex flex-wrap gap-3 text-xs font-bold"><span className="rounded-full border border-white/20 px-3 py-2">{snapshot.participants} {tr('connected', 'متصل')}</span><span className="rounded-full border border-white/20 px-3 py-2">{tr('Mission', 'المهمة')} {snapshot.mission_id}</span></div>
    {onReplay && <button type="button" onClick={onReplay} className="mt-5 min-h-11 rounded-full border border-white/20 px-4 text-xs font-black text-[#f2d99b]">{tr('Replay mission prelude', 'إعادة تمهيد المهمة')}</button>}
  </section>
}

function ResponseComposer({ snapshot, busy, submit }: { snapshot: Snapshot; busy: boolean; submit: (operation: string, payload: Record<string, unknown>) => Promise<boolean> }) {
  const { tr } = useI18n()
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

  if (already) return <><StatePanel title={round === 2 ? tr('Revote recorded', 'تم تسجيل إعادة التصويت') : tr('Commit recorded', 'تم تسجيل الالتزام')} copy={tr('Your response is locked for this round. Stay with the room; the next state will appear automatically.', 'تم تثبيت إجابتك لهذه الجولة. ابقَ في الغرفة؛ ستظهر الحالة التالية تلقائياً.')} /><RecordedResponse snapshot={snapshot}/></>

  return <form onSubmit={onSubmit} className="ten-response-composer" aria-busy={busy}><fieldset disabled={busy}>
    <p className="text-xs font-black tracking-[.16em] text-[#f2d99b]">{round === 2 ? tr('RE-COMMIT', 'أعد الالتزام') : tr('PRIVATE COMMIT', 'التزام خاص')}</p>
    <h2 className="mt-2 font-serif text-2xl">{round === 2 ? tr('Keep it or change it.', 'ثبّتها أو غيّرها.') : tr('Reason before the room speaks.', 'استدل قبل أن تتحدث الغرفة.')}</h2>
    {round === 2 && <p className="mt-2 text-sm leading-6 text-[#d8e7e2]">{tr('Your first response is preloaded. Change it only if the discussion changed your reasoning.', 'إجابتك الأولى محمّلة مسبقاً. غيّرها فقط إذا غيّر النقاش استدلالك.')}</p>}

    <div className="mt-5 space-y-3">
      {stage.responseType === 'single_choice' && stage.options?.map((option,index) => <label key={option} lang="en" className={`ten-clinical-content flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-4 ${choice === index ? 'border-[#f2d99b] bg-[#d8a94e]/15' : 'border-white/20 bg-white/5'}`}><input required type="radio" name="choice" value={index} checked={choice === index} onChange={() => setChoice(index)} /><span className="font-bold">{option}</span></label>)}
      {stage.responseType === 'true_false' && [true,false].map(value => <label key={String(value)} lang="en" className={`ten-clinical-content flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-4 ${booleanChoice === value ? 'border-[#f2d99b] bg-[#d8a94e]/15' : 'border-white/20 bg-white/5'}`}><input required type="radio" name="tf" checked={booleanChoice === value} onChange={() => setBooleanChoice(value)} /><span className="font-bold">{value ? 'True' : 'False'}</span></label>)}
      {stage.responseType === 'multiselect' && stage.options?.map((option,index) => <label key={option} lang="en" className={`ten-clinical-content flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-4 ${choices.includes(index) ? 'border-[#f2d99b] bg-[#d8a94e]/15' : 'border-white/20 bg-white/5'}`}><input type="checkbox" checked={choices.includes(index)} onChange={e => setChoices(current => e.target.checked ? [...new Set([...current,index])] : current.filter(item => item !== index))} /><span className="font-bold">{option}</span></label>)}
      {stage.responseType === 'problem_representation+differential_builder' && <><TextArea label={tr('One-sentence Problem Representation', 'صياغة المشكلة بجملة واحدة')} value={text} setValue={setText} /><div className="grid gap-3 sm:grid-cols-3"><RankedField rank="01" label={tr('Most Likely', 'الأكثر احتمالاً')} value={mostLikely} setValue={setMostLikely} /><RankedField rank="02" label={tr('Must Not Miss', 'يجب ألّا يفوت')} value={mustNotMiss} setValue={setMustNotMiss} /><RankedField rank="03" label={tr('Less Likely', 'أقل احتمالاً')} value={lessLikely} setValue={setLessLikely} /></div></>}
      {stage.responseType === 'evidence_map' && <><TextArea label={tr('Final judgment', 'الحُكم النهائي')} value={text} setValue={setText} /><div className="grid gap-3 sm:grid-cols-3"><EvidenceField label={tr('Supports', 'يدعم')} value={supports} setValue={setSupports} /><EvidenceField label={tr('Opposes', 'يعارض')} value={opposes} setValue={setOpposes} /><EvidenceField label={tr('Expected but missing', 'متوقّع لكنه غائب')} value={missing} setValue={setMissing} /></div></>}
      {stage.responseType === 'differential+probability' && <><TextArea label={tr('Ranked differential', 'التشخيصات التفريقية المرتّبة')} value={text} setValue={setText} /><label className="block text-sm font-bold">{tr('Clinical probability', 'الاحتمال السريري')}<select required className="mt-2 w-full rounded-xl border border-white/20 bg-[#fffdf8] p-3 text-[#17363a]" value={probability} onChange={e => setProbability(e.target.value)}><option value="">{tr('Choose…', 'اختر…')}</option><option value="low">{tr('Low', 'منخفض')}</option><option value="intermediate">{tr('Intermediate', 'متوسط')}</option><option value="high">{tr('High', 'مرتفع')}</option></select></label></>}
      {stage.responseType === 'diagnosis+confidence' && <TextArea label={tr('Working diagnosis / updated judgment', 'التشخيص المبدئي / الحُكم المحدّث')} value={text} setValue={setText} />}
      {stage.responseType === 'team_commit' && <TextArea label={tr('30-second team synthesis', 'خلاصة الفريق في 30 ثانية')} value={text} setValue={setText} />}
      {stage.responseType === 'free_text' && <TextArea label={tr('Your reasoning', 'استدلالك')} value={text} setValue={setText} />}
      {!['single_choice','true_false','multiselect','problem_representation+differential_builder','evidence_map','differential+probability','diagnosis+confidence','team_commit','free_text'].includes(stage.responseType ?? '') && <TextArea label={tr('Your answer', 'إجابتك')} value={text} setValue={setText} />}
    </div>

    {needsConfidence && <div className="mt-5"><p className="mb-2 text-sm font-bold">{tr('Confidence', 'الثقة')} <span className="font-normal text-[#cfe1dc]">— {tr('calibration signal, not extra marks', 'إشارة للمعايرة وليست درجات إضافية')}</span></p><div className="grid grid-cols-5 gap-1 sm:gap-2">{[20,40,60,80,100].map(value => <button type="button" key={value} aria-pressed={confidence === value} onClick={() => setConfidence(value)} className={`min-h-11 rounded-xl border text-xs font-black ${confidence === value ? 'border-[#f2d99b] bg-[#d8a94e] text-[#17363a]' : 'border-white/20'}`}>{value}%</button>)}</div></div>}
    <TextArea label={tr('Why? Give one brief justification', 'لماذا؟ اكتب تبريراً موجزاً واحداً')} value={justification} setValue={setJustification} extra="mt-5" />
    <button disabled={busy || !canSubmit} className="mt-5 min-h-14 w-full rounded-2xl bg-[#d8a94e] px-5 font-black text-[#17363a] transition active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-50" type="submit">{busy ? tr('Recording…', 'جارٍ التسجيل…') : round === 2 ? tr('Lock my revote', 'ثبّت إعادة تصويتي') : tr('Lock my reasoning', 'ثبّت استدلالي')}</button>
  </fieldset></form>
}

function TransferComposer({ snapshot, busy, submit }: { snapshot: Snapshot; busy: boolean; submit: (operation: string, payload: Record<string, unknown>) => Promise<boolean> }) {
  const { tr } = useI18n()
  const [text,setText] = useState('')
  const [why,setWhy] = useState('')
  const already = snapshot.responses.some(r => r.stage_index === snapshot.stage_count && r.round === 1)
  const canSubmit = text.trim().length >= 3 && why.trim().length >= 3
  if (already) return <StatePanel title={tr('Transfer response recorded', 'تم تسجيل إجابة الانتقال')} copy={tr('Your near-transfer response is locked. The facilitator will now close the reasoning loop.', 'تم تثبيت إجابتك على حالة الانتقال القريب. سيغلق الميسّر الآن حلقة الاستدلال.')} />
  return <form onSubmit={async e => { e.preventDefault(); if (!canSubmit) return; await submit('respond',{run_id:snapshot.id,stage_index:snapshot.stage_count,round:1,answer:{text},confidence:null,justification:why}) }} className="ten-response-composer" aria-busy={busy}>
    <p className="text-xs font-black tracking-[.16em] text-[#f2d99b]">{tr('TRANSFER MICRO-CASE', 'حالة انتقال مصغّرة')}</p>
    <div className="ten-clinical-content" lang="en"><h2 className="mt-3 font-serif text-2xl leading-8">{snapshot.transfer?.stem}</h2><p className="mt-4 font-bold leading-7">{snapshot.transfer?.question}</p></div>
    <TextArea label={tr('Apply the reasoning principle', 'طبّق مبدأ الاستدلال')} value={text} setValue={setText} extra="mt-5" />
    <TextArea label={tr('Why?', 'لماذا؟')} value={why} setValue={setWhy} extra="mt-4" />
    <button disabled={busy || !canSubmit} className="mt-5 min-h-14 w-full rounded-2xl bg-[#d8a94e] px-5 font-black text-[#17363a] disabled:opacity-50">{busy ? tr('Recording…', 'جارٍ التسجيل…') : tr('Submit transfer response', 'إرسال إجابة الانتقال')}</button>
  </form>
}

function TransferOverview({ snapshot }: { snapshot: Snapshot }) {
  const { tr } = useI18n()
  return <section className="rounded-[1.75rem] border border-[#315b5d] bg-[#17363a] p-6 text-white"><p className="text-xs font-black tracking-[.16em] text-[#f2d99b]">{tr('TRANSFER MICRO-CASE · FACILITATOR VIEW', 'حالة انتقال مصغّرة · عرض الميسّر')}</p><div className="ten-clinical-content" lang="en"><h2 className="mt-3 font-serif text-2xl leading-8">{snapshot.transfer?.stem}</h2><p className="mt-4 font-bold leading-7">{snapshot.transfer?.question}</p></div><p className="mt-5 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm leading-6 text-[#d8e7e2]">{tr('Do not reveal the anchor yet. Let learners commit their transfer response before opening the debrief.', 'لا تكشف الإجابة المرجعية بعد. دع المتعلمين يثبتون إجابة الانتقال قبل فتح الخلاصة.')}</p></section>
}

function DiscussionPanel({ endsAt }: { endsAt: string | null }) {
  const { tr } = useI18n()
  const [now,setNow] = useState(Date.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()),1000); return () => window.clearInterval(timer) },[])
  const left = endsAt ? Math.max(0, Math.ceil((new Date(endsAt).getTime()-now)/1000)) : 0
  return <section className="rounded-[1.75rem] border border-[#d8a94e] bg-[#17363a] p-6 text-center text-white shadow-[0_18px_50px_rgba(23,54,58,.16)]"><p className="text-xs font-black tracking-[.16em] text-[#f2d99b]">{tr('PEER DISCUSSION', 'نقاش الأقران')}</p><div className="my-5 font-mono text-5xl font-black text-[#f2d99b]" aria-label={tr(`${left} seconds remaining`, `متبقٍ ${left} ثانية`)}>{Math.floor(left/60)}:{String(left%60).padStart(2,'0')}</div><p className="mx-auto max-w-md leading-7 text-[#d8e7e2]">{tr('Put the phone down for a moment. Explain the assumption behind your choice, listen for a stronger argument, then return for the revote.', 'ضع الهاتف جانباً للحظة. اشرح الافتراض وراء اختيارك، واستمع إلى حجة أقوى، ثم عُد لإعادة التصويت.')}</p></section>
}

function Debrief({ snapshot }: { snapshot: Snapshot }) {
  const { tr } = useI18n()
  return <section className="rounded-[1.75rem] border border-[#d8a94e] bg-[#fff8df] p-6 shadow-[0_16px_45px_rgba(23,54,58,.06)]"><p className="text-xs font-black tracking-[.16em] text-[#8b6a2b]">{tr('DEBRIEF', 'الخلاصة')}</p><h2 className="mt-2 font-serif text-3xl">{tr('Close the reasoning loop.', 'أغلق حلقة الاستدلال.')}</h2><p className="mt-4 leading-7 ten-clinical-content" lang="en">{snapshot.completion?.principle}</p>{snapshot.transfer?.answer && <div className="mt-5 rounded-2xl border border-[#d8ccb6] bg-white/70 p-4"><strong>{tr('Transfer anchor', 'الإجابة المرجعية للانتقال')}</strong><p className="mt-2 leading-6 ten-clinical-content" lang="en">{snapshot.transfer.answer}</p></div>}</section>
}

function Completed({ snapshot, rpc, busy, signalEarned, onReplay }: { snapshot: Snapshot; rpc: (operation:string,payload:Record<string,unknown>)=>Promise<boolean>; busy:boolean; signalEarned:boolean; onReplay?: () => void }) {
  const { tr } = useI18n()
  const [reflection,setReflection] = useState('')
  const [saved,setSaved] = useState(false)

  async function saveReflection() {
    const ok = await rpc('reflect',{run_id:snapshot.id,text:reflection})
    if (ok) setSaved(true)
  }

  return <section className="rounded-[1.75rem] border border-[#2f8a72] bg-[#edf7f4] p-6 shadow-[0_18px_55px_rgba(47,138,114,.10)]">
    <p className="text-xs font-black tracking-[.16em] text-[#2f8a72]">{snapshot.manager ? tr('MISSION ROOM COMPLETE', 'اكتملت غرفة المهمة') : signalEarned ? tr('SIGNAL RESTORED', 'تمت استعادة الإشارة') : tr('ROOM COMPLETED', 'اكتملت الغرفة')}</p>
    <h2 className="mt-2 font-serif text-3xl">{snapshot.manager ? tr(`${snapshot.title} is closed.`, `أُغلقت ${snapshot.title}.`) : signalEarned ? tr(`${snapshot.title} now lives in Baghdad.`, `أصبحت ${snapshot.title} الآن جزءاً من بغداد.`) : tr('The room closed before your Signal requirements were complete.', 'أُغلقت الغرفة قبل إكمال متطلبات إشارتك.')}</h2>
    <p className="mt-4 leading-7 ten-clinical-content" lang="en">{snapshot.completion?.principle}</p>
    {!snapshot.manager && signalEarned && <div className="mt-5"><TextArea label={tr('One thing I will carry into the next case', 'شيء واحد سأحمله إلى الحالة التالية')} value={reflection} setValue={setReflection} /><button disabled={busy || reflection.trim().length<3 || saved} onClick={saveReflection} className="ten-action mt-4">{saved ? tr('Reflection saved', 'تم حفظ التأمل') : tr('Save reflection', 'حفظ التأمل')}</button></div>}
    {!snapshot.manager && !signalEarned && <p className="mt-4 rounded-2xl border border-[#c58a3e]/35 bg-[#fff8df] p-4 text-sm leading-6">{tr('Signal credit requires every required initial response, each required revote, the transfer response, and authoritative room completion. Contact the facilitator if you believe your record is incomplete.', 'يتطلب احتساب الإشارة كل إجابة أولية مطلوبة، وكل إعادة تصويت مطلوبة، وإجابة الانتقال، والإكمال المعتمد للغرفة. تواصل مع الميسّر إذا ظننت أن سجلك غير مكتمل.')}</p>}
    {onReplay && <button type="button" onClick={onReplay} className="ten-action ten-action-secondary mt-4">{tr('Replay epilogue', 'إعادة الخاتمة')}</button>}
    <p className="mt-3 text-sm leading-6 text-[#526c6e]">{tr('Signal credit is recorded only from the authoritative mission response and completion checks.', 'يُسجّل احتساب الإشارة حصراً من إجابة المهمة المعتمدة وفحوص الإكمال.')}</p>
    <Link className="ten-text-link mt-5" href={snapshot.manager ? '/facilitator/the-ten' : '/learner'}>{snapshot.manager ? tr('Return to facilitator studio', 'العودة إلى استوديو الميسّر') : tr('Return to the evolved Baghdad world', 'العودة إلى عالم بغداد بعد تغيّره')} →</Link>
  </section>
}

function FacilitatorControls({ snapshot, busy, command }: { snapshot: Snapshot; busy: boolean; command: (next:string)=>Promise<void> }) {
  const { tr } = useI18n()
  const stage = snapshot.stage ?? snapshot.notes
  const peer = Boolean(stage?.peerInstruction)
  const next: [string,string] | null = snapshot.phase === 'waiting' ? ['commit_open',tr('Go live · Open commit', 'ابدأ مباشرة · افتح الالتزام')]
    : snapshot.phase === 'commit_open' ? ['commit_locked',tr('Lock commit', 'أغلق الالتزام')]
      : snapshot.phase === 'commit_locked' ? (peer ? ['discussion',tr('Start peer discussion', 'ابدأ نقاش الأقران')] : ['reveal',tr('Reveal', 'اكشف')])
        : snapshot.phase === 'discussion' ? ['revote_open',tr('Open revote', 'افتح إعادة التصويت')]
          : snapshot.phase === 'revote_open' ? ['reveal',tr('Reveal', 'اكشف')]
            : snapshot.phase === 'reveal' ? ['next',tr('Next stage', 'المرحلة التالية')]
              : snapshot.phase === 'transfer' ? ['debrief',tr('Open debrief', 'افتح الخلاصة')]
                : snapshot.phase === 'debrief' ? ['completed',tr('Activate signal · Complete', 'فعّل الإشارة · إكمال')]
                  : null

  const currentStageNumber = snapshot.stage_index + 1
  const firstRound = snapshot.analytics?.find(item => item.stage === currentStageNumber && item.round === 1)
  const secondRound = snapshot.analytics?.find(item => item.stage === currentStageNumber && item.round === 2)
  const participantBase = Math.max(snapshot.participants, 1)
  const responseRate = Math.min(100, Math.round((snapshot.count / participantBase) * 100))

  return <aside className="mt-6 overflow-hidden rounded-[1.75rem] border-2 border-[#d8a94e] bg-[#fff8df] shadow-[0_20px_60px_rgba(23,54,58,.10)]">
    <div className="p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-black tracking-[.16em] text-[#8b6a2b]">{tr('FACILITATOR CONTROL ROOM', 'غرفة تحكم الميسّر')}</p><h2 className="mt-1 font-serif text-2xl">{snapshot.phase.replaceAll('_',' ')}</h2>{stage?.id && <p className="mt-1 text-xs font-bold text-[#526c6e]">{tr('Presenter cue', 'إشارة العرض')}: {stage.id}</p>}</div>
        <div className="flex flex-wrap gap-2"><span className="rounded-full bg-white px-3 py-2 text-xs font-black">{snapshot.participants} {tr('joined', 'منضم')}</span><span className="rounded-full bg-white px-3 py-2 text-xs font-black">{snapshot.count} {tr('responded', 'أجاب')}</span></div>
      </div>

      {['commit_open','revote_open'].includes(snapshot.phase) && <div className="mt-5"><div className="mb-2 flex justify-between text-xs font-black"><span>{tr('RESPONSE PROGRESS', 'تقدّم الإجابات')}</span><span>{responseRate}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[#ead9b8]"><div className="h-full bg-[#1f6668] transition-[width] duration-200" style={{width:`${responseRate}%`}} /></div></div>}

      {snapshot.phase === 'discussion' && <div className="mt-5"><DiscussionPanel endsAt={snapshot.discussion_ends_at ?? null} /></div>}

      {stage && <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/75 p-4"><p className="text-xs font-black text-[#8b6a2b]">{tr('EXPECTED REASONING', 'الاستدلال المتوقع')}</p><p className="mt-2 text-sm leading-6 ten-clinical-content" lang="en">{stage.expectedReasoning ?? 'Use the mission stage notes.'}</p></div>
        <div className="rounded-2xl bg-white/75 p-4"><p className="text-xs font-black text-[#8b6a2b]">{tr('MENTOR LENS', 'عدسة المرشد')}</p><p className="mt-2 text-sm leading-6 ten-clinical-content" lang="en">{stage.mentorLens ?? snapshot.lens}</p></div>
      </div>}

      {stage?.commonErrors?.length ? <div className="mt-3 rounded-2xl border border-[#e6cf9f] bg-white/70 p-4"><p className="text-xs font-black text-[#8b6a2b]">{tr('COMMON ERRORS TO LISTEN FOR', 'أخطاء شائعة انتبه لها')}</p><ul className="mt-2 space-y-1 text-sm leading-6 ten-clinical-content" lang="en">{stage.commonErrors.map(error => <li key={error}>• {error}</li>)}</ul></div> : null}

      {(firstRound?.mean_confidence !== null && firstRound?.mean_confidence !== undefined) || (secondRound?.mean_confidence !== null && secondRound?.mean_confidence !== undefined) ? <div className="mt-3 grid gap-2 sm:grid-cols-3"><Metric label={tr('Initial confidence', 'الثقة الأولية')} value={firstRound?.mean_confidence === null || firstRound?.mean_confidence === undefined ? '—' : `${firstRound.mean_confidence}%`} /><Metric label={tr('Revote confidence', 'ثقة إعادة التصويت')} value={secondRound?.mean_confidence === null || secondRound?.mean_confidence === undefined ? '—' : `${secondRound.mean_confidence}%`} /><Metric label={tr('Changed answer', 'غيّر الإجابة')} value={`${snapshot.changed_count ?? 0}`} /></div> : null}

      {snapshot.distribution && Object.keys(snapshot.distribution).length > 0 && ['commit_locked','discussion','revote_open','reveal'].includes(snapshot.phase) && <div className="mt-4"><p className="text-xs font-black tracking-[.12em] text-[#8b6a2b]">{tr('INITIAL VOTE DISTRIBUTION', 'توزيع التصويت الأولي')}</p><div className="mt-2 grid gap-2 sm:grid-cols-2 ten-clinical-content" lang="en">{Object.entries(snapshot.distribution).map(([key,n]) => <div key={key} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs font-bold"><span className="truncate">{distributionLabel(key, stage?.options)}</span><span>{n}</span></div>)}</div></div>}

      {snapshot.phase === 'debrief' && <div className="mt-4 rounded-2xl border border-[#c9b06f] bg-white/70 p-4 text-sm leading-6"><strong>{tr('Completion rule:', 'قاعدة الإكمال:')}</strong> {tr('only learners who completed every required stage plus the transfer response receive the mission Signal/My Codex completion record. This protects completion data from passive page attendance.', 'لا يحصل على سجل إكمال الإشارة/سجلّي إلا المتعلمون الذين أكملوا كل مرحلة مطلوبة وإجابة الانتقال. يحمي هذا بيانات الإكمال من احتساب الحضور السلبي للصفحة.')}</div>}

      {next && <button disabled={busy} onClick={() => command(next[0])} className="mt-5 min-h-14 w-full rounded-2xl bg-[#17363a] px-5 font-black text-white transition active:scale-[.985] disabled:opacity-60">{busy ? tr('Updating room…', 'جارٍ تحديث الغرفة…') : next[1]}</button>}
    </div>
  </aside>
}

function Metric({ label, value }: { label:string; value:string }) {
  return <div className="rounded-2xl bg-white/80 p-3"><p className="text-[10px] font-black tracking-[.1em] text-[#8b6a2b]">{label.toUpperCase()}</p><p className="mt-1 font-serif text-xl font-bold">{value}</p></div>
}

function StatePanel({ title, copy }: { title:string; copy:string }) {
  return <section className="rounded-[1.75rem] border border-[#d8ccb6] bg-[#fffdf8] p-6 text-center shadow-[0_16px_45px_rgba(23,54,58,.06)]"><h2 className="font-serif text-2xl">{title}</h2><p className="mx-auto mt-3 max-w-md leading-7 text-[#526c6e]">{copy}</p></section>
}

function RecordedResponse({ snapshot }: { snapshot: Snapshot }) {
  const { tr } = useI18n()
  const response = snapshot.responses.filter(item => item.stage_index === snapshot.stage_index).sort((a,b) => b.round-a.round)[0]
  if (!response) return null
  const answer = response.payload.choice ?? response.payload.choices ?? response.payload.text ?? response.payload
  return <details className="ten-recorded-response"><summary>{tr('Your recorded reasoning', 'استدلالك المسجّل')}</summary><p className="ten-clinical-content" lang="en">{formatAnswer(answer, snapshot.stage?.options)}</p>{response.justification && <blockquote>{response.justification}</blockquote>}</details>
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
