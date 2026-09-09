import Image from 'next/image'
import Link from 'next/link'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { brandAssets, worldAssets } from '@/lib/the-ten/assets'
import { getJourneySummary } from '@/lib/the-ten/runtime'
import { completeOrientation } from './actions'

export default async function OrientationPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [summary, query] = await Promise.all([getJourneySummary(), searchParams])
  if (!summary.enrolled || !summary.program) {
    return <LearnerShell title="Baghdad Nexus is waiting"><section className="ten-panel"><h2>No active learner cohort</h2><p>Your account is signed in, but it is not attached to an active or completed learner cohort yet.</p><Link className="ten-action ten-spaced" href="/dashboard">Return to workspace</Link></section></LearnerShell>
  }

  if (summary.onboarding_complete) {
    return <LearnerShell title="The gate is open" intro="Your orientation is already complete."><section className="ten-world"><div className="ten-world-stage"><div className="ten-world-copy"><p className="ten-eyebrow">THE TEN · BAGHDAD NEXUS</p><h2>Your journey has already begun.</h2><p>Return to Baghdad to continue from the exact point recorded for your cohort.</p><Link className="ten-action ten-action-gold" href="/learner">Enter Baghdad →</Link></div><figure className="ten-world-art"><Image src={worldAssets.baghdad} alt="Illustrated Baghdad Nexus world" fill sizes="100vw" className="object-cover" priority /></figure></div></section></LearnerShell>
  }

  return <LearnerShell title="Before Baghdad opens" intro="This is the only orientation gate. After it, the baseline checkpoint unlocks the world.">
    {query.error && <p role="alert" className="ten-notice ten-notice-error">Please accept both acknowledgements so the journey can begin.</p>}
    <section className="ten-world">
      <div className="ten-world-stage">
        <div className="ten-world-copy">
          <p className="ten-eyebrow">FIRST ACTIVATION</p>
          <h2>Four signals are waiting in Baghdad.</h2>
          <p>You will move through four live clinical-reasoning missions. Your facilitator controls when each scene advances. Keep this site on your phone for private commits, confidence, revotes and reflection; discuss the reasoning with your peers in the teaching space around you.</p>
          <div className="relative mt-6 h-24 w-56 overflow-hidden rounded-xl bg-[#f7f0df]"><Image src={brandAssets.lockup} alt="THE TEN — Baghdad Nexus" fill sizes="224px" className="object-cover" /></div>
        </div>
        <figure className="ten-world-art"><Image src={worldAssets.nexus} alt="The Baghdad Nexus gateway" fill sizes="(max-width:720px) 100vw, 50vw" className="object-cover" priority /></figure>
      </div>
    </section>

    <form action={completeOrientation} className="ten-panel ten-spaced">
      <input type="hidden" name="program_id" value={summary.program.id} />
      <p className="ten-eyebrow">Journey agreement</p>
      <h2>Two things before the first signal</h2>
      <label className="mt-5 flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border border-[#d8ccb6] bg-[#fffdf8] p-4"><input className="mt-1 h-5 w-5" type="checkbox" name="pledge" required /><span><strong>Learning pledge</strong><br /><span className="text-sm text-[#526c6e]">I will commit my own reasoning before peer discussion and treat changing my answer as a learning event, not a failure.</span></span></label>
      <label className="mt-3 flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border border-[#d8ccb6] bg-[#fffdf8] p-4"><input className="mt-1 h-5 w-5" type="checkbox" name="assessment" required /><span><strong>Assessment acknowledgement</strong><br /><span className="text-sm text-[#526c6e]">The baseline, post-test, confidence signals, and mission responses are educational records; they are not independent claims of clinical competence.</span></span></label>
      <button className="ten-action ten-action-gold ten-spaced" type="submit">Open the first gate →</button>
    </form>
  </LearnerShell>
}
