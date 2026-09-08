import Image from 'next/image'
import Link from 'next/link'
import { worldAssets } from '@/lib/the-ten/assets'
import { nextJourneyAction, type JourneyData } from '@/lib/the-ten/journey'

export function BaghdadWorld({ data }: { data: JourneyData }) {
  const next = nextJourneyAction(data)
  return <section className="ten-world" aria-labelledby="next-mission">
    <div className="ten-world-copy">
      <p className="ten-eyebrow">Baghdad · Your next step</p>
      <h2 id="next-mission">{next.title}</h2>
      <p>{next.description}</p>
      <Link className="ten-action ten-action-gold" href={next.href}>{next.label}<span aria-hidden="true">→</span></Link>
    </div>
    {worldAssets.baghdad ? <div className="ten-world-art"><Image src={worldAssets.baghdad} alt="The approved Baghdad learning world" fill sizes="(max-width: 720px) 100vw, 480px" className="object-contain" priority /></div> : <div className="ten-world-directory">
      <p className="ten-eyebrow">Explore the Nexus</p>
      <ol><li><Link href="/learner/sessions"><span>01</span><div>Gather for a session<small>Briefings and learning objectives</small></div></Link></li><li><Link href="/learner/assessments"><span>02</span><div>Put your reasoning to work<small>Baseline and assessment checkpoints</small></div></Link></li><li><Link href="/learner/progress"><span>03</span><div>Reflect on your progress<small>Attendance, results, and completion</small></div></Link></li></ol>
    </div>}
  </section>
}
