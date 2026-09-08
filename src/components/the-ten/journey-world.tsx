import Image from 'next/image'
import Link from 'next/link'
import { characterAssets, worldAssets } from '@/lib/the-ten/assets'
import type { JourneySummary, TenCatalog } from '@/lib/the-ten/runtime'

const characterByMission = {
  M01: { key: 'ibn-sina', label: 'Ibn Sina' },
  M02: { key: 'al-razi', label: 'Al-Razi' },
  M03: { key: 'jabir', label: 'Jabir ibn Hayyan' },
  M04: { key: 'hippocrates', label: 'Hippocrates' },
} as const

const signalTone = {
  M01: 'from-[#e7c46c]/35 via-[#f7f0df]/95 to-[#fffdf8]',
  M02: 'from-[#47aeb1]/25 via-[#f7f0df]/95 to-[#fffdf8]',
  M03: 'from-[#c8794d]/25 via-[#f7f0df]/95 to-[#fffdf8]',
  M04: 'from-[#3c7c72]/25 via-[#f7f0df]/95 to-[#fffdf8]',
} as const

export function JourneyWorld({ summary, catalog }: { summary: JourneySummary; catalog: TenCatalog }) {
  const missions = summary.missions ?? []
  const completed = summary.mission_completed_count ?? 0
  const total = summary.mission_required_count ?? 4

  return <div className="space-y-6">
    <section className="relative isolate overflow-hidden rounded-[2rem] border border-[#315b5d] bg-[#15383b] text-[#fffdf8] shadow-[0_30px_90px_rgba(23,54,58,.2)]">
      <div className="relative min-h-[480px] sm:min-h-[560px]">
        <Image src={worldAssets.baghdad} alt="Illustrated Baghdad Nexus world" fill priority sizes="100vw" className="object-cover object-center opacity-95" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#17363a]/10 via-transparent to-[#0d2e31]/90" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5 sm:p-8">
          <div className="max-w-[34rem] rounded-3xl border border-white/20 bg-[#17363a]/80 p-5 backdrop-blur-sm sm:p-7">
            <p className="text-xs font-black tracking-[.2em] text-[#f2d99b]">BAGHDAD NEXUS · FIRST ACTIVATION</p>
            <h2 className="mt-2 font-serif text-3xl leading-tight sm:text-5xl">The city changes as your reasoning changes.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#d8e7e2] sm:text-base">Four signals. Four mentors. One continuous clinical-reasoning journey. Your facilitator opens each live mission; the world records what you complete.</p>
          </div>
          <div className="hidden rounded-full border border-[#f2d99b]/60 bg-[#17363a]/85 px-4 py-3 text-center sm:block">
            <div className="text-2xl font-black text-[#f2d99b]">{completed}/{total}</div>
            <div className="text-[10px] font-bold uppercase tracking-[.16em]">Signals active</div>
          </div>
        </div>
        <div className="absolute inset-x-4 bottom-4 sm:inset-x-8 sm:bottom-8">
          <div className="grid grid-cols-4 gap-2 rounded-3xl border border-white/15 bg-[#102f32]/88 p-3 backdrop-blur-md sm:gap-3 sm:p-4">
            {missions.map((mission) => {
              const activeRun = catalog.runs.find(run => run.mission_id === mission.id && run.phase !== 'completed') ?? catalog.runs.find(run => run.mission_id === mission.id)
              const character = characterByMission[mission.id as keyof typeof characterByMission]
              const image = character ? characterAssets[character.key].neutral : null
              const unlocked = Boolean(activeRun)
              return <Link key={mission.id} href={activeRun ? `/learner/mission/${activeRun.id}` : '#missions'} aria-disabled={!unlocked} className={`group relative min-w-0 overflow-hidden rounded-2xl border p-2 text-center transition duration-200 sm:p-3 ${mission.completed ? 'border-[#f2d99b] bg-[#d8a94e]/20' : unlocked ? 'border-[#80c8c4] bg-[#1f6668]/45 hover:-translate-y-1' : 'border-white/15 bg-white/5 opacity-70'}`}>
                {image && <div className="relative mx-auto h-12 w-12 overflow-hidden rounded-full border border-white/20 bg-[#f7f0df] sm:h-16 sm:w-16"><Image src={image} alt="" fill sizes="64px" className="object-cover" /></div>}
                <span className="mt-2 block truncate text-[10px] font-black tracking-[.12em] text-[#f2d99b] sm:text-xs">{mission.id}</span>
                <span className="mt-1 hidden text-xs font-bold sm:block">{mission.completed ? 'Signal active' : unlocked ? 'Enter mission' : 'Awaiting live session'}</span>
              </Link>
            })}
          </div>
        </div>
      </div>
    </section>

    <section id="missions" aria-labelledby="mission-path-title">
      <div className="mb-4 flex items-end justify-between gap-4"><div><p className="ten-eyebrow">THE FOUR SIGNALS</p><h2 id="mission-path-title" className="font-serif text-3xl">Your path through the city</h2></div><div className="text-sm font-bold text-[#526c6e]">{completed} complete · {Math.max(total - completed, 0)} remaining</div></div>
      <div className="grid gap-4 lg:grid-cols-2">
        {missions.map((mission) => {
          const catalogMission = catalog.missions.find(item => item.id === mission.id)
          const run = catalog.runs.find(item => item.mission_id === mission.id && item.phase !== 'completed') ?? catalog.runs.find(item => item.mission_id === mission.id)
          const character = characterByMission[mission.id as keyof typeof characterByMission]
          const image = character ? characterAssets[character.key].neutral : null
          const tone = signalTone[mission.id as keyof typeof signalTone] ?? 'from-[#f7f0df] to-[#fffdf8]'
          return <article key={mission.id} className={`relative overflow-hidden rounded-[1.75rem] border border-[#d8ccb6] bg-gradient-to-br ${tone} p-5 shadow-[0_16px_45px_rgba(23,54,58,.07)] sm:p-7`}>
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border-[18px] border-[#1f6668]/5" aria-hidden="true" />
            <div className="relative flex gap-4 sm:gap-6">
              {image && <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-[1.25rem] bg-[#efe1c7] sm:h-36 sm:w-32"><Image src={image} alt={`${character?.label ?? mission.mentor} mentor portrait`} fill sizes="128px" className="object-cover" /></div>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#17363a] px-3 py-1 text-[10px] font-black tracking-[.15em] text-[#f2d99b]">SIGNAL {mission.position}</span>{mission.completed && <span className="rounded-full bg-[#2f8a72] px-3 py-1 text-[10px] font-black text-white">ACTIVATED</span>}{run?.phase === 'waiting' && <span className="rounded-full border border-[#1f6668]/30 bg-white/70 px-3 py-1 text-[10px] font-black text-[#1f6668]">WAITING ROOM</span>}{run && run.phase !== 'waiting' && run.phase !== 'completed' && <span className="rounded-full bg-[#46b9bd] px-3 py-1 text-[10px] font-black text-[#17363a]">LIVE · {run.phase.replaceAll('_', ' ')}</span>}</div>
                <h3 className="mt-3 font-serif text-2xl leading-tight text-[#17363a]">{mission.title}</h3>
                <p className="mt-1 text-sm font-bold text-[#1f6668]">{catalogMission?.mentor ?? mission.mentor}</p>
                <p className="mt-3 text-sm leading-6 text-[#526c6e]">{catalogMission?.premise ?? catalogMission?.focus ?? 'A live reasoning mission inside Baghdad Nexus.'}</p>
                {run ? <Link className="ten-action mt-5" href={`/learner/mission/${run.id}`}>{run.phase === 'completed' ? 'Review mission' : run.phase === 'waiting' ? 'Enter waiting room' : 'Return to live mission'} <span aria-hidden="true">→</span></Link> : <div className="mt-5 rounded-xl border border-dashed border-[#8aa09e] bg-white/45 px-4 py-3 text-sm font-bold text-[#526c6e]">Your facilitator has not opened this signal yet.</div>}
              </div>
            </div>
          </article>
        })}
      </div>
    </section>

    <section className="grid gap-4 md:grid-cols-[1fr_.8fr]">
      <div className="ten-panel">
        <p className="ten-eyebrow">THE NEXUS</p>
        <h2>What happens next?</h2>
        <p>{summary.next_stage === 'missions' ? 'Watch for the next live signal. When your facilitator opens it, the mission appears here automatically.' : summary.next_stage === 'posttest' ? 'All four signals are active. The exit transfer check is now your next gate.' : summary.next_stage === 'feedback' ? 'Your post-test is recorded. Share the final reflection to complete the journey.' : summary.next_stage === 'certificate' ? 'Every required gate is complete. Your completion pathway is ready.' : 'Your recorded journey determines the next gate.'}</p>
        {summary.next_stage === 'posttest' && summary.posttest?.id && <Link className="ten-action ten-spaced" href={`/assessments/${summary.posttest.id}/take`}>Begin exit transfer check →</Link>}
        {summary.next_stage === 'certificate' && <Link className="ten-action ten-spaced" href="/learner/certificate">Open completion pathway →</Link>}
        <Link className="ten-text-link ten-spaced" href="/learner/progress">Open My Codex & progress →</Link>
      </div>
      <div className="relative min-h-64 overflow-hidden rounded-[1.75rem] border border-[#d8ccb6] bg-[#f7f0df]"><Image src={worldAssets.nexus} alt="Illustrated Nexus progression landmark" fill sizes="(max-width:768px) 100vw, 40vw" className="object-cover" /></div>
    </section>
  </div>
}
