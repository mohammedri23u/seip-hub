'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TenCatalog, TenStudio } from '@/lib/the-ten/runtime'

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

    // ten_api(create) is the single authoritative launch path. A database trigger
    // marks the prepared session live in the same transaction so facilitators do
    // not need broad direct UPDATE permission on sessions.
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

    <section className="overflow-hidden rounded-[2rem] border border-[#315b5d] bg-[#17363a] text-white shadow-[0_25px_75px_rgba(23,54,58,.16)]">
      <div className="p-6 sm:p-8">
        <p className="text-xs font-black tracking-[.18em] text-[#f2d99b]">FACILITATOR CONTROL ROOM</p>
        <h2 className="mt-3 font-serif text-3xl sm:text-4xl">The four missions are already prepared.</h2>
        <p className="mt-4 max-w-2xl leading-7 text-[#d8e7e2]">Choose the signal you are teaching and press one button. The platform creates the synchronized room and marks that prepared session live atomically. Learners see it in Baghdad automatically after orientation and the Entry Baseline.</p>
      </div>
    </section>

    <section className="grid gap-4 md:grid-cols-2">
      {prepared.map(({ session, missionId }) => {
        const mission = studio.missions.find(item => item.id === missionId)
        const existing = catalog.runs.find(run => run.session_id === session.id)
        const isBusy = busySession === session.id
        return <article key={session.id} className="rounded-[1.75rem] border border-[#d8ccb6] bg-[#fffdf8] p-5 shadow-[0_16px_45px_rgba(23,54,58,.06)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-[#17363a] px-3 py-1 text-[10px] font-black tracking-[.14em] text-[#f2d99b]">{missionId}</span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black ${existing && existing.phase !== 'completed' ? 'bg-[#46b9bd] text-[#17363a]' : existing?.phase === 'completed' ? 'bg-[#edf7f4] text-[#2f8a72]' : 'bg-[#f7f0df] text-[#526c6e]'}`}>{existing ? existing.phase.replaceAll('_',' ').toUpperCase() : 'READY'}</span>
          </div>
          <h3 className="mt-4 font-serif text-2xl">{String(mission?.content.title ?? session.title)}</h3>
          <p className="mt-1 text-sm font-bold text-[#1f6668]">{String(mission?.content.mentor ?? '')}</p>
          <p className="mt-3 text-sm leading-6 text-[#526c6e]">{String(mission?.content.focus ?? session.title)}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#526c6e]"><span className="rounded-full bg-[#f7f0df] px-3 py-2">90 min</span><span className="rounded-full bg-[#f7f0df] px-3 py-2">{session.join_code}</span></div>
          <button disabled={Boolean(busySession) || !mission?.published} onClick={() => launch(session.id, missionId)} className="mt-5 min-h-14 w-full rounded-2xl bg-[#d8a94e] px-5 font-black text-[#17363a] transition active:scale-[.985] disabled:opacity-60">{isBusy ? 'Opening signal…' : existing ? 'Open control room →' : 'Make session live →'}</button>
        </article>
      })}
    </section>

    {!prepared.length && <section className="rounded-[1.5rem] border border-dashed border-[#d8ccb6] bg-[#fffdf8] p-6"><h2 className="font-serif text-2xl">Prepared mission sessions are missing.</h2><p className="mt-2 text-[#526c6e]">Canonical sessions use join codes TEN-M01 through TEN-M04. They must be seeded before First Activation.</p></section>}

    <section className="rounded-[1.5rem] border border-[#d8ccb6] bg-[#fffdf8] p-5"><h2 className="font-serif text-2xl">During the session</h2><p className="mt-2 max-w-3xl leading-7 text-[#526c6e]">Inside the room, you control the learning state only. Peer discussion happens in the physical/online teaching space; the platform records the private commit, optional confidence, revote, reveal, transfer and debrief. There is no meeting or video integration.</p><Link href="/dashboard" className="ten-text-link mt-3">Back to SEIP workspace →</Link></section>
  </div>
}
