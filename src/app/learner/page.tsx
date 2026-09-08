import Image from 'next/image'
import Link from 'next/link'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { JourneyWorld } from '@/components/the-ten/journey-world'
import { worldAssets } from '@/lib/the-ten/assets'
import { getJourneySummary, getTenCatalog } from '@/lib/the-ten/runtime'

export default async function LearnerHome() {
  const [summary, catalog] = await Promise.all([getJourneySummary(), getTenCatalog()])
  const name = summary.profile?.name?.trim()

  if (!summary.enrolled) {
    return <LearnerShell title="Baghdad Nexus is not assigned yet"><section className="ten-panel"><h2>No learner journey is attached to this account.</h2><p>When your cohort membership is activated, your Baghdad Nexus journey will appear here without a separate setup step.</p><Link className="ten-action ten-spaced" href="/dashboard">Return to workspace</Link></section></LearnerShell>
  }

  if (!summary.onboarding_complete) {
    return <LearnerShell title={name ? `${name}, the gates of Baghdad are closed` : 'The gates of Baghdad are closed'} intro="Complete the short orientation once. It unlocks the baseline gate.">
      <section className="ten-world"><div className="ten-world-stage"><div className="ten-world-copy"><p className="ten-eyebrow">BEFORE THE FIRST SIGNAL</p><h2>Meet the rules of the journey.</h2><p>Commit before discussion. Revise when evidence changes. Confidence is a learning signal, not a reward.</p><Link className="ten-action ten-action-gold" href="/learner/orientation">Enter orientation →</Link></div><figure className="ten-world-art"><Image src={worldAssets.baghdad} alt="Baghdad Nexus waiting beyond the orientation gate" fill sizes="100vw" className="object-cover" priority /></figure></div></section>
    </LearnerShell>
  }

  if (summary.next_stage === 'configuration') {
    return <LearnerShell title="The journey is being configured"><section className="ten-panel"><h2>Baseline and post-test gates are not linked yet.</h2><p>The educational content is loaded, but this cohort still needs its entry and exit checkpoints linked by the program administrator.</p></section></LearnerShell>
  }

  if (!summary.pretest?.completed) {
    return <LearnerShell title={name ? `${name}, one gate remains before Baghdad opens` : 'One gate remains before Baghdad opens'} intro="Your Entry Baseline establishes the starting point. It is low-stakes and does not certify competence.">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#315b5d] bg-[#17363a] text-white shadow-[0_30px_90px_rgba(23,54,58,.18)]">
        <div className="grid min-h-[430px] md:grid-cols-[.9fr_1.1fr]"><div className="flex flex-col justify-center p-7 sm:p-10"><p className="text-xs font-black tracking-[.18em] text-[#f2d99b]">ENTRY GATE · BASELINE</p><h2 className="mt-3 font-serif text-4xl leading-tight">Before the city reveals its signals, show us how you reason today.</h2><p className="mt-4 leading-7 text-[#d8e7e2]">Twelve novel mini-cases. No public ranking. The purpose is to make change visible after the four missions.</p>{summary.pretest?.id ? <Link className="ten-action ten-action-gold mt-6 w-fit" href={`/assessments/${summary.pretest.id}/take`}>Begin Entry Baseline →</Link> : <p className="mt-6 rounded-xl border border-white/20 p-4">The baseline is not available yet.</p>}</div><div className="relative min-h-72"><Image src={worldAssets.nexus} alt="The Nexus entry gate" fill sizes="(max-width:768px) 100vw, 55vw" className="object-cover" priority /></div></div>
      </section>
    </LearnerShell>
  }

  return <LearnerShell title={name ? `Baghdad is open, ${name}` : 'Baghdad is open'} intro="This is your world, not a dashboard. Live missions appear as your facilitator activates them; completed signals stay part of the city.">
    <JourneyWorld summary={summary} catalog={catalog} />
  </LearnerShell>
}
