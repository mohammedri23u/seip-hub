'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TenCatalog, TenStudio } from '@/lib/the-ten/runtime'

export function FacilitatorStudio({ studio, catalog }: { studio: TenStudio; catalog: TenCatalog }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [sessionId, setSessionId] = useState(studio.sessions[0]?.id ?? '')
  const [missionId, setMissionId] = useState(studio.missions.find(m => m.published)?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const existing = catalog.runs.find(run => run.session_id === sessionId)

  async function launch() {
    if (!sessionId || !missionId) return
    setBusy(true); setError(null)
    if (existing) { router.push(`/learner/mission/${existing.id}`); return }

    const { error: sessionError } = await supabase.from('sessions').update({ status: 'live' }).eq('id', sessionId)
    if (sessionError) { setBusy(false); setError(sessionError.message); return }

    const { data, error: createError } = await supabase.rpc('ten_api', { operation: 'create', payload: { session_id: sessionId, mission_id: missionId } })
    setBusy(false)
    if (createError) { setError(createError.message); return }
    const runId = (data as { id?: string } | null)?.id
    if (!runId) { setError('The room was created but no run ID was returned.'); return }
    router.push(`/learner/mission/${runId}`)
  }

  return <div className="space-y-6">
    {error && <p role="alert" className="rounded-2xl border border-[#c76057] bg-[#fcefed] p-4 font-bold text-[#8c403a]">{error}</p>}

    <section className="overflow-hidden rounded-[2rem] border border-[#315b5d] bg-[#17363a] text-white shadow-[0_25px_75px_rgba(23,54,58,.16)]">
      <div className="p-6 sm:p-8"><p className="text-xs font-black tracking-[.18em] text-[#f2d99b]">FACILITATOR CONTROL ROOM</p><h2 className="mt-3 font-serif text-3xl sm:text-4xl">The content is already built. You only open the signal.</h2><p className="mt-4 max-w-2xl leading-7 text-[#d8e7e2]">Choose the prepared session and mission. Going live creates one synchronized room; learners who completed orientation and the Entry Baseline will see it appear in Baghdad automatically.</p></div>
      <div className="grid gap-4 border-t border-white/15 bg-[#102f32] p-5 sm:grid-cols-2 sm:p-7">
        <label className="text-sm font-bold">Prepared session<select className="mt-2 min-h-14 w-full rounded-2xl border border-white/20 bg-[#fffdf8] px-4 text-[#17363a]" value={sessionId} onChange={e => setSessionId(e.target.value)}>{studio.sessions.map(session => <option key={session.id} value={session.id}>{session.title} · {session.cohort} · {session.join_code ?? 'no code'}</option>)}</select></label>
        <label className="text-sm font-bold">Mission signal<select className="mt-2 min-h-14 w-full rounded-2xl border border-white/20 bg-[#fffdf8] px-4 text-[#17363a]" value={missionId} onChange={e => setMissionId(e.target.value)}>{studio.missions.filter(m => m.published).map(mission => <option key={mission.id} value={mission.id}>{mission.id} · {String(mission.content.title ?? mission.id)}</option>)}</select></label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/15 p-5 sm:p-7"><div><p className="text-xs font-black tracking-[.12em] text-[#f2d99b]">ROOM STATE</p><p className="mt-1 font-bold">{existing ? `Existing room · ${existing.phase.replaceAll('_',' ')}` : 'No run created for this session yet'}</p></div><button disabled={busy || !sessionId || (!missionId && !existing)} onClick={launch} className="min-h-14 rounded-2xl bg-[#d8a94e] px-6 font-black text-[#17363a] transition active:scale-[.985] disabled:opacity-60">{busy ? 'Opening…' : existing ? 'Open control room →' : 'Make session live →'}</button></div>
    </section>

    <section className="grid gap-4 md:grid-cols-2">
      {studio.missions.map(mission => <article key={mission.id} className="rounded-[1.5rem] border border-[#d8ccb6] bg-[#fffdf8] p-5"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#17363a] px-3 py-1 text-[10px] font-black tracking-[.14em] text-[#f2d99b]">{mission.id}</span><span className={`rounded-full px-3 py-1 text-[10px] font-black ${mission.published ? 'bg-[#edf7f4] text-[#2f8a72]' : 'bg-[#fcefed] text-[#8c403a]'}`}>{mission.published ? 'PUBLISHED' : 'NOT PUBLISHED'}</span></div><h3 className="mt-3 font-serif text-2xl">{String(mission.content.title ?? mission.id)}</h3><p className="mt-1 text-sm font-bold text-[#1f6668]">{String(mission.content.mentor ?? '')}</p><p className="mt-3 line-clamp-3 text-sm leading-6 text-[#526c6e]">{String(mission.content.focus ?? mission.content.premise ?? '')}</p></article>)}
    </section>

    <section className="rounded-[1.5rem] border border-[#d8ccb6] bg-[#fffdf8] p-5"><h2 className="font-serif text-2xl">During the session</h2><p className="mt-2 max-w-3xl leading-7 text-[#526c6e]">Once inside the room, the facilitator advances: Commit → Lock → Discussion → Revote → Reveal → Next. No Zoom, meeting link, or video dependency exists in the platform.</p><Link href="/dashboard" className="ten-text-link mt-3">Back to SEIP workspace →</Link></section>
  </div>
}
