'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { DecorSprite, MissionSystemIcon } from '@/components/the-ten/art-sprite'
import { brandAssets, characterAssets, worldAssets } from '@/lib/the-ten/assets'
import { createClient } from '@/lib/supabase/client'
import type { TenCatalog, TenStudio } from '@/lib/the-ten/runtime'

const characterByMission = {
  M01: { key: 'ibn-sina', label: 'Ibn Sina' },
  M02: { key: 'al-razi', label: 'Al-Razi' },
  M03: { key: 'jabir', label: 'Jabir ibn Hayyan' },
  M04: { key: 'hippocrates', label: 'Hippocrates' },
} as const

function missionForSession(joinCode: string | null, title: string) {
  const code = joinCode?.match(/^TEN-(M0[1-4])$/)?.[1] ?? title.match(/^(M0[1-4])\b/)?.[1]
  return code ?? null
}

export function FacilitatorStudio({ studio, catalog }: { studio: TenStudio; catalog: TenCatalog }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [busySession, setBusySession] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const prepared = studio.sessions
    .map(session => ({ session, missionId: missionForSession(session.join_code, session.title) }))
    .filter((item): item is { session: TenStudio['sessions'][number]; missionId: string } => Boolean(item.missionId))
    .sort((a,b) => a.missionId.localeCompare(b.missionId))

  async function launch(sessionId: string, missionId: string) {
    setBusySession(sessionId)
    setError(null)
    const existing = catalog.runs.find(run => run.session_id === sessionId)
    if (existing) {
      setBusySession(null)
      router.push(`/learner/mission/${existing.id}`)
      return
    }

    const mission = studio.missions.find(item => item.id === missionId && item.published)
    if (!mission) {
      setBusySession(null)
      setError(`${missionId} is not published.`)
      return
    }

    const { data, error: createError } = await supabase.rpc('ten_api', {
      operation: 'create',
      payload: { session_id: sessionId, mission_id: missionId },
    })
    setBusySession(null)
    if (createError) {
      setError(createError.message)
      return
    }
    const runId = (data as { id?: string } | null)?.id
    if (!runId) {
      setError('The room was created but no run ID was returned.')
      return
    }
    router.push(`/learner/mission/${runId}`)
  }

  return <div className="space-y-6">
    {error && <p role="alert" className="rounded-2xl border border-[#c76057] bg-[#fcefed] p-4 font-bold text-[#8c403a]">{error}</p>}

    <section className="relative min-h-[360px] overflow-hidden rounded-[2rem] border border-[#315b5d] bg-[#17363a] text-white shadow-[0_25px_75px_rgba(23,54,58,.16)]">
      <Image src={worldAssets.nexus} alt="" fill sizes="100vw" className="object-cover object-center opacity-55" priority />
      <div className="absolute inset-0 bg-gradient-to-r from-[#102f32]/95 via-[#17363a]/78 to-[#17363a]/35" />
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <DecorSprite name="lantern" size={84} className="absolute right-[7%] top-[12%] opacity-70" />
        <DecorSprite name="astrolabe" size={92} className="absolute bottom-[11%] right-[18%] rotate-[8deg] opacity-55" />
        <DecorSprite name="geometric-star" size={70} className="absolute right-[38%] top-[9%] opacity-45" />
      </div>
      <div className="relative z-10 flex min-h-[360px] max-w-3xl flex-col justify-end p-6 sm:p-8">
        <Image src={brandAssets.wordmark} alt="THE TEN — BAGHDAD NEXUS" width={360} height={150} className="mb-4 h-auto w-56 object-contain object-left sm:w-72" />
        <p className="text-xs font-black tracking-[.18em] text-[#f2d99b]">FACILITATOR CONTROL ROOM</p>
        <h2 className="mt-3 max-w-2xl font-serif text-3xl sm:text-5xl">You conduct the Signal. The platform carries the room.</h2>
        <p className="mt-4 max-w-2xl leading-7 text-[#d8e7e2]">Choose one prepared mission and open it. Learners see the waiting room in Baghdad after their Entry Baseline; you advance only the teaching state.</p>
      </div>
    </section>

    <section aria-labelledby="prepared-signals-title">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div><p className="ten-eyebrow">FIRST ACTIVATION</p><h2 id="prepared-signals-title" className="font-serif text-3xl">Prepared Signals</h2></div>
        <p className="hidden text-sm font-bold text-[#526c6e] sm:block">One-tap launch · no meeting integration</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {prepared.map(({ session, missionId }) => {
          const mission = studio.missions.find(item => item.id === missionId)
          const existing = catalog.runs.find(run => run.session_id === session.id)
          const isBusy = busySession === session.id
          const character = characterByMission[missionId as keyof typeof characterByMission]
          const portrait = character ? characterAssets[character.key].neutral : null
          return <article key={session.id} className="group relative overflow-hidden rounded-[1.75rem] border border-[#d8ccb6] bg-[#fffdf8] shadow-[0_16px_45px_rgba(23,54,58,.06)]">
            <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[#1f6668]/5" aria-hidden="true" />
            <div className="grid min-h-full grid-cols-[7rem_1fr] sm:grid-cols-[8.5rem_1fr]">
              <div className="relative min-h-[19rem] overflow-hidden bg-[#efe1c7]">
                {portrait ? <Image src={portrait} alt={`${character?.label ?? ''} mentor`} fill sizes="136px" className="object-cover object-center transition duration-300 group-hover:scale-[1.025]" /> : null}
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#17363a]/88 to-transparent" />
                <span className="absolute bottom-3 left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full border-2 border-[#f2d99b]/80 bg-[#fffdf8] shadow-xl"><MissionSystemIcon missionId={missionId} size={46} /></span>
              </div>
              <div className="relative p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-[#17363a] px-3 py-1 text-[10px] font-black tracking-[.14em] text-[#f2d99b]">{missionId}</span>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black ${existing && existing.phase !== 'completed' ? 'bg-[#46b9bd] text-[#17363a]' : existing?.phase === 'completed' ? 'bg-[#edf7f4] text-[#2f8a72]' : 'bg-[#f7f0df] text-[#526c6e]'}`}>{existing ? existing.phase.replaceAll('_',' ').toUpperCase() : 'READY'}</span>
                </div>
                <h3 className="mt-4 font-serif text-2xl leading-tight">{String(mission?.content.title ?? session.title)}</h3>
                <p className="mt-1 text-sm font-bold text-[#1f6668]">{String(mission?.content.mentor ?? '')}</p>
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-[#526c6e]">{String(mission?.content.focus ?? session.title)}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-[#526c6e]"><span className="rounded-full bg-[#f7f0df] px-3 py-2">90 min</span><span className="rounded-full bg-[#f7f0df] px-3 py-2">{session.join_code}</span></div>
                <button disabled={Boolean(busySession) || !mission?.published} onClick={() => launch(session.id, missionId)} className="mt-5 min-h-14 w-full rounded-2xl bg-[#d8a94e] px-4 text-sm font-black text-[#17363a] shadow-[0_10px_25px_rgba(216,169,78,.18)] transition hover:-translate-y-0.5 active:scale-[.985] disabled:opacity-60">{isBusy ? 'Opening Signal…' : existing ? 'Open control room →' : 'Make session live →'}</button>
              </div>
            </div>
          </article>
        })}
      </div>
    </section>

    {!prepared.length && <section className="rounded-[1.5rem] border border-dashed border-[#d8ccb6] bg-[#fffdf8] p-6"><h2 className="font-serif text-2xl">Prepared mission sessions are missing.</h2><p className="mt-2 text-[#526c6e]">Canonical sessions use join codes TEN-M01 through TEN-M04. They must be seeded before First Activation.</p></section>}

    <section className="relative overflow-hidden rounded-[1.5rem] border border-[#d8ccb6] bg-[#fffdf8] p-5 sm:p-6">
      <DecorSprite name="baghdad-arch" size={96} className="absolute -bottom-3 -right-2 opacity-10" />
      <div className="relative max-w-3xl"><p className="ten-eyebrow">DURING THE SESSION</p><h2 className="font-serif text-2xl">You are the Game Master, not a dashboard operator.</h2><p className="mt-2 leading-7 text-[#526c6e]">Inside the room you move through Commit → Lock → Discussion → Revote when required → Reveal → Next → Transfer → Debrief. Discussion itself happens with the learners in the teaching space. No Zoom, video, or meeting code exists in THE TEN.</p><Link href="/dashboard" className="ten-text-link mt-3">Back to SEIP workspace →</Link></div>
    </section>
  </div>
}
