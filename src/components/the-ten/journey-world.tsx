'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GuidePresence } from './experience/guide-presence'
import { SignalRegister } from './experience/signal-register'
import { getNexusStateAsset, storyAssets, worldAssets } from '@/lib/the-ten/assets'
import { computeWorldState } from '@/lib/the-ten/experience'
import type { JourneySummary, TenCatalog, TenExperienceState } from '@/lib/the-ten/runtime'

export function JourneyWorld({ summary, catalog, experience }: { summary: JourneySummary; catalog: TenCatalog; experience: TenExperienceState }) {
  const router = useRouter()
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') router.refresh() }
    const interval = window.setInterval(refresh, 45000)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', refresh) }
  }, [router])
  const missions = summary.missions ?? []
  const completed = summary.mission_completed_count ?? 0
  const reachable = summary.mission_required_count ?? missions.length
  const world = computeWorldState(completed, reachable)
  const [focused, setFocused] = useState<string | null>(null)
  const entries = missions.map(mission => ({
    ...mission,
    content: catalog.missions.find(item => item.id === mission.id),
    run: catalog.runs.find(item => item.mission_id === mission.id && item.phase !== 'completed') ?? catalog.runs.find(item => item.mission_id === mission.id),
  }))
  const current = entries.find(item=>item.id===focused) ?? entries.find(item=>item.run && !item.completed) ?? entries[0]
  const status = (entry: typeof entries[number]) => entry.completed ? 'Signal restored' : !entry.run ? 'Awaiting facilitator' : entry.run.phase === 'completed' ? 'Room closed · review available' : entry.run.phase === 'waiting' ? 'Waiting room open' : 'Reasoning in progress'

  return <div className="ten-living-world" data-experience="world" data-world-state={world.level}>
    <section className="ten-city" aria-labelledby="baghdad-world-title">
      <div className="ten-city-art"><Image src={worldAssets.baghdadHero} alt="Baghdad seen from a scholar’s window, with the river and Nexus paths joining its architecture" fill preload sizes="(max-width: 720px) 1280px, (min-width: 1672px) 1672px, 100vw" quality={90} className="object-cover" /></div>
      <header className="ten-city-heading"><p className="ten-scene-label">BAGHDAD / FIRST ACTIVATION</p><h2 id="baghdad-world-title">{completed ? 'The city remembers.' : 'Every connection begins somewhere.'}</h2><p>{world.description}</p></header>
      <div className="ten-city-state"><span>{String(completed).padStart(2,'0')}</span><p>of THE TEN<br />Signals restored</p></div>
      <div className="ten-city-paths" aria-label="Signals in the city">{entries.slice(0,8).map((entry,index) => {
        const position = { left: `${42 + (index / Math.max(1, Math.min(entries.length,8)-1)) * 46}%`, top: `${43 + (index % 2) * 15}%` }
        return entry.run ? <a key={entry.id} href="#signal-directory" style={position} data-restored={entry.completed} onClick={()=>setFocused(entry.id)} aria-label={`Explore Signal ${index+1}: ${entry.title}. ${status(entry)}`}><i aria-hidden="true"/><span>Signal {String(index+1).padStart(2,'0')}<small>{entry.completed ? 'Restored' : 'Open path'}</small></span></a> : <span key={entry.id} style={position} data-restored={entry.completed}><i aria-hidden="true"/><span>Signal {String(index+1).padStart(2,'0')}<small>{entry.completed ? 'Restored' : 'Not yet open'}</small></span></span>
      })}</div>
      {experience.guide_key && <GuidePresence guideKey={experience.guide_key} context="world" reaction="guide" line={completed ? 'Carry what you learned into the next connection.' : 'Begin with what you can observe.'}/>}
      <a href="#signal-directory" className="ten-city-explore">Explore the reachable Signals <span aria-hidden="true">↓</span></a>
    </section>

    <section className="ten-signal-directory" id="signal-directory" aria-labelledby="signal-directory-title">
      <header><p className="ten-eyebrow">PATHS THROUGH BAGHDAD</p><h2 id="signal-directory-title">Follow a Signal.</h2><p>{completed} of {reachable} reachable Signals restored</p><SignalRegister completed={completed} reachable={reachable}/></header>
      <div className="ten-signal-index">
        <div role="group" aria-label="Explore mission Signals">{entries.map((entry,index)=><button type="button" key={entry.id} className="ten-signal-entry" aria-pressed={current?.id===entry.id} aria-controls="signal-detail" onClick={()=>setFocused(entry.id)}><span className="ten-signal-number" data-restored={entry.completed}>{String(index+1).padStart(2,'0')}</span><span><strong>{entry.title}</strong><small>{status(entry)}</small></span><span aria-hidden="true">↗</span></button>)}</div>
        {current ? <article id="signal-detail" className="ten-signal-detail" key={current.id}>
          <p className="ten-eyebrow">{status(current)}</p><h3>{current.title}</h3>
          {(current.content?.mentor ?? current.mentor) && <p className="ten-guardian-credit">Mission Guardian / {current.content?.mentor ?? current.mentor}</p>}
          <p>{current.content?.premise ?? current.content?.focus ?? 'A reasoning path through Baghdad. Its clinical information appears only as the facilitator releases it.'}</p>
          {current.run ? <Link className="ten-scene-action" href={`/learner/mission/${current.run.id}`}>{current.run.phase==='completed' ? 'Review this path' : current.run.phase==='waiting' ? 'Enter the waiting room' : 'Return to the mission'} <span aria-hidden="true">→</span></Link> : <p className="ten-path-note">{current.completed ? 'This Signal is part of your recorded journey. Its record remains in your Codex.' : 'This path opens when your facilitator starts its prepared session.'}</p>}
          {current.completed && <Link className="ten-text-link" href="/learner/progress">Read your Codex <span aria-hidden="true">→</span></Link>}
        </article> : <p className="ten-path-note">The city is quiet. Your prepared Signals will appear here when available.</p>}
      </div>
    </section>

    <section className="ten-nexus-observation" aria-labelledby="nexus-observation-title">
      <figure><Image src={getNexusStateAsset(world.level)} alt={`The Nexus: ${world.name}`} fill sizes="(max-width: 720px) 100vw, 55vw" quality={90} className="object-cover" /></figure>
      <div><p className="ten-eyebrow">BENEATH THE CITY / {world.name}</p><h2 id="nexus-observation-title">A world held<br />by connection.</h2><p>{summary.next_stage === 'posttest' ? 'Your reachable Signals are restored. The Exit Transfer Check is the next part of your journey.' : summary.next_stage === 'feedback' ? 'Your post-test is recorded. A final reflection remains.' : summary.next_stage === 'certificate' ? 'Your required journey gates are complete. Your completion pathway is ready.' : 'Each recorded Signal changes the Nexus. The wider system still holds paths you have yet to encounter.'}</p>
        {summary.next_stage === 'posttest' && summary.posttest?.id && <Link className="ten-scene-action" href={`/assessments/${summary.posttest.id}/take`}>Begin Exit Transfer Check →</Link>}
        {summary.next_stage === 'certificate' ? <Link className="ten-scene-action" href="/learner/certificate">Open completion pathway →</Link> : <Link className="ten-text-link" href="/learner/progress">{summary.next_stage === 'feedback' ? 'Write your final reflection' : 'Open My Codex'} →</Link>}
      </div>
    </section>
    <section className="ten-chronicler-note" aria-labelledby="chronicler-note-title">
      <div className="ten-chronicler-art" aria-hidden="true"><Image src={storyAssets.chroniclerDesk} alt="" fill sizes="(max-width: 720px) 100vw, 40vw" quality={90} className="object-cover" /></div>
      <div><p className="ten-eyebrow">AT THE CHRONICLER’S DESK / OPTIONAL</p><h2 id="chronicler-note-title">A note in the margin.</h2><details><summary>Read the Chronicler’s note <span aria-hidden="true">+</span></summary><blockquote>“A city remembers more than its conclusions. It remembers the questions that made them possible.”</blockquote><p>Pause, if you wish: which assumption did you last return to? This reflection is yours; it is not submitted or graded.</p></details></div>
    </section>
  </div>
}
