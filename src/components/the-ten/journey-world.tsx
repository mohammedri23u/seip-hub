import Image from 'next/image'
import Link from 'next/link'
import { brandAssets, characterAssets, worldAssets } from '@/lib/the-ten/assets'
import type { JourneySummary, TenCatalog } from '@/lib/the-ten/runtime'

const characterByMission = {
  M01: { key: 'ibn-sina', label: 'Ibn Sina', x: '18%', y: '61%' },
  M02: { key: 'al-razi', label: 'Al-Razi', x: '37%', y: '39%' },
  M03: { key: 'jabir', label: 'Jabir ibn Hayyan', x: '67%', y: '58%' },
  M04: { key: 'hippocrates', label: 'Hippocrates', x: '82%', y: '33%' },
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

  return <div className="space-y-7">
    <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-[#315b5d] bg-[#15383b] text-[#fffdf8] shadow-[0_30px_90px_rgba(23,54,58,.22)]" aria-labelledby="baghdad-world-title">
      <div className="relative min-h-[540px] sm:min-h-[660px]">
        <Image src={worldAssets.baghdad} alt="Illustrated Baghdad world for THE TEN journey" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#102f32]/15 via-transparent to-[#0d2e31]/92" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(70,185,189,.12),transparent_24rem)]" />

        <div className="absolute left-4 right-4 top-4 z-20 sm:left-7 sm:right-auto sm:top-7 sm:max-w-[33rem]">
          <div className="rounded-3xl border border-white/20 bg-[#17363a]/82 p-5 shadow-2xl backdrop-blur-md sm:p-7">
            <p className="text-[10px] font-black tracking-[.22em] text-[#f2d99b] sm:text-xs">BAGHDAD NEXUS · FIRST ACTIVATION</p>
            <h2 id="baghdad-world-title" className="mt-2 font-serif text-3xl leading-tight sm:text-5xl">The city is your journey.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#d8e7e2] sm:text-base">Each live mission appears as a Signal in Baghdad. Complete the reasoning sequence and the Signal remains active in your world.</p>
          </div>
        </div>

        <div className="absolute right-5 top-5 z-20 hidden rounded-full border border-[#f2d99b]/60 bg-[#17363a]/88 px-4 py-3 text-center sm:block">
          <div className="text-2xl font-black text-[#f2d99b]">{completed}/{total}</div>
          <div className="text-[10px] font-bold uppercase tracking-[.16em]">Signals active</div>
        </div>

        <div className="absolute inset-0 z-10 hidden sm:block" aria-hidden="true">
          <svg className="h-full w-full" viewBox="0 0 1000 660" preserveAspectRatio="none">
            <path d="M500 330 L180 405" stroke="rgba(242,217,155,.40)" strokeWidth="2" strokeDasharray="8 10" />
            <path d="M500 330 L370 260" stroke="rgba(70,185,189,.42)" strokeWidth="2" strokeDasharray="8 10" />
            <path d="M500 330 L670 385" stroke="rgba(200,121,77,.42)" strokeWidth="2" strokeDasharray="8 10" />
            <path d="M500 330 L820 220" stroke="rgba(47,138,114,.42)" strokeWidth="2" strokeDasharray="8 10" />
          </svg>
        </div>

        <div className="absolute left-1/2 top-[48%] z-20 hidden -translate-x-1/2 -translate-y-1/2 sm:block">
          <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-[#f2d99b]/70 bg-[#fffdf8] shadow-[0_0_0_12px_rgba(23,54,58,.35),0_0_55px_rgba(70,185,189,.35)]">
            <Image src={brandAssets.crest} alt="" fill sizes="128px" className="object-cover" />
          </div>
          <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/20 bg-[#17363a]/88 px-3 py-2 text-[10px] font-black tracking-[.14em] text-[#f2d99b] backdrop-blur">NEXUS · {completed} SIGNALS</div>
        </div>

        <div className="absolute inset-0 z-30 hidden sm:block">
          {missions.map((mission) => {
            const run = catalog.runs.find(item => item.mission_id === mission.id && item.phase !== 'completed') ?? catalog.runs.find(item => item.mission_id === mission.id)
            const character = characterByMission[mission.id as keyof typeof characterByMission]
            if (!character) return null
            const image = characterAssets[character.key].neutral
            const content = <><div className={`relative mx-auto h-20 w-20 overflow-hidden rounded-full border-4 bg-[#f7f0df] shadow-[0_12px_35px_rgba(0,0,0,.28)] transition duration-200 ${mission.completed ? 'border-[#f2d99b] shadow-[0_0_34px_rgba(216,169,78,.60)]' : run ? 'border-[#80c8c4] group-hover:-translate-y-1 group-hover:scale-[1.03]' : 'border-white/30 grayscale-[.25]'}`}>{image && <Image src={image} alt="" fill sizes="80px" className="object-cover" />}{!run && !mission.completed && <div className="absolute inset-0 grid place-items-center bg-[#17363a]/38 text-xl" aria-hidden="true">◈</div>}</div><div className="mt-2 rounded-2xl border border-white/15 bg-[#102f32]/88 px-3 py-2 text-center shadow-lg backdrop-blur-md"><span className="block text-[9px] font-black tracking-[.16em] text-[#f2d99b]">SIGNAL {mission.position}</span><span className="mt-0.5 block max-w-40 text-xs font-black">{mission.title}</span><span className="mt-0.5 block text-[10px] text-[#cfe1dc]">{mission.completed ? 'Activated' : run?.phase === 'waiting' ? 'Waiting room open' : run ? `Live · ${run.phase.replaceAll('_',' ')}` : 'Awaiting facilitator'}</span></div></>
            return <div key={mission.id} className="absolute w-44 -translate-x-1/2 -translate-y-1/2" style={{left:character.x,top:character.y}}>{run ? <Link href={`/learner/mission/${run.id}`} className="group block rounded-2xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#f2d99b]" aria-label={`${mission.title}. ${mission.completed ? 'Completed' : `Room ${run.phase}`}`}>{content}</Link> : <div aria-label={`${mission.title}. Awaiting facilitator`} role="status">{content}</div>}</div>
          })}
        </div>

        <div className="absolute inset-x-3 bottom-3 z-30 sm:hidden">
          <div className="rounded-[1.5rem] border border-white/15 bg-[#102f32]/90 p-3 shadow-2xl backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between px-1"><span className="text-[10px] font-black tracking-[.14em] text-[#f2d99b]">SIGNALS</span><span className="text-[10px] font-bold text-[#d8e7e2]">{completed}/{total} active</span></div>
            <div className="grid grid-cols-4 gap-2">{missions.map(mission => {
              const run = catalog.runs.find(item => item.mission_id === mission.id && item.phase !== 'completed') ?? catalog.runs.find(item => item.mission_id === mission.id)
              const character = characterByMission[mission.id as keyof typeof characterByMission]
              const image = character ? characterAssets[character.key].neutral : null
              const content = <><div className={`relative mx-auto h-12 w-12 overflow-hidden rounded-full border-2 bg-[#f7f0df] ${mission.completed ? 'border-[#f2d99b]' : run ? 'border-[#80c8c4]' : 'border-white/25 opacity-65'}`}>{image && <Image src={image} alt="" fill sizes="48px" className="object-cover" />}</div><span className="mt-1 block text-[9px] font-black text-[#f2d99b]">{mission.id}</span></>
              return run ? <Link key={mission.id} href={`/learner/mission/${run.id}`} className="min-h-16 rounded-xl p-1 text-center">{content}</Link> : <div key={mission.id} className="min-h-16 rounded-xl p-1 text-center" aria-label={`${mission.title}, awaiting facilitator`}>{content}</div>
            })}</div>
          </div>
        </div>
      </div>
    </section>

    <section id="missions" aria-labelledby="mission-path-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4"><div><p className="ten-eyebrow">SIGNAL DOSSIERS</p><h2 id="mission-path-title" className="font-serif text-3xl">Four mentors. Four reasoning lenses.</h2></div><div className="text-sm font-bold text-[#526c6e]">{completed} complete · {Math.max(total - completed, 0)} remaining</div></div>
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
                {run ? <Link className="ten-action mt-5" href={`/learner/mission/${run.id}`}>{run.phase === 'completed' ? 'Review activated signal' : run.phase === 'waiting' ? 'Enter waiting room' : 'Return to live mission'} <span aria-hidden="true">→</span></Link> : <div className="mt-5 rounded-xl border border-dashed border-[#8aa09e] bg-white/45 px-4 py-3 text-sm font-bold text-[#526c6e]">This Signal stays hidden until the facilitator opens its prepared session.</div>}
              </div>
            </div>
          </article>
        })}
      </div>
    </section>

    <section className="grid gap-4 md:grid-cols-[1fr_.8fr]">
      <div className="ten-panel">
        <p className="ten-eyebrow">THE NEXUS</p>
        <h2>Your next gate is determined by what is actually recorded.</h2>
        <p>{summary.next_stage === 'missions' ? 'Watch Baghdad for the next live Signal. When the facilitator opens it, the waiting room appears automatically.' : summary.next_stage === 'posttest' ? 'All four Signals are active. The Exit Transfer Check is now your next gate.' : summary.next_stage === 'feedback' ? 'Your post-test is recorded. Share the final program reflection to finish the journey.' : summary.next_stage === 'certificate' ? 'Every required gate is complete. Your completion pathway is ready.' : 'Your recorded journey determines the next gate.'}</p>
        {summary.next_stage === 'posttest' && summary.posttest?.id && <Link className="ten-action ten-spaced" href={`/assessments/${summary.posttest.id}/take`}>Begin Exit Transfer Check →</Link>}
        {summary.next_stage === 'certificate' && <Link className="ten-action ten-spaced" href="/learner/certificate">Open completion pathway →</Link>}
        <Link className="ten-text-link ten-spaced" href="/learner/progress">Open My Codex →</Link>
      </div>
      <div className="relative min-h-64 overflow-hidden rounded-[1.75rem] border border-[#d8ccb6] bg-[#f7f0df]"><Image src={worldAssets.nexus} alt="Illustrated Nexus progression landmark" fill sizes="(max-width:768px) 100vw, 40vw" className="object-cover" /></div>
    </section>
  </div>
}
