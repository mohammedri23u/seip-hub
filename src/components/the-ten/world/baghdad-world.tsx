import Image from 'next/image'
import Link from 'next/link'
import { worldAssets } from '@/lib/the-ten/assets'
import { nextJourneyAction, type JourneyData } from '@/lib/the-ten/journey'

export function BaghdadWorld({ data }: { data: JourneyData }) {
  const next = nextJourneyAction(data)
  return <section className="ten-world" aria-labelledby="next-mission">
    <div className="ten-world-stage">
      <div className="ten-world-copy">
        <p className="ten-eyebrow">Baghdad · Your next step</p>
        <h2 id="next-mission">{next.title}</h2>
        <p>{next.description}</p>
        <Link className="ten-action ten-action-gold" href={next.href}>{next.label}<span aria-hidden="true">→</span></Link>
      </div>
      <figure className="ten-world-art">
        <Image src={worldAssets.baghdad} alt="Illustrated Baghdad learning world with domes, minarets, books, and waterways" fill sizes="(max-width: 720px) calc(100vw - 2rem), (max-width: 1200px) 50vw, 570px" className="object-cover object-center" priority />
      </figure>
    </div>
    <div className="ten-world-paths">
      <nav className="ten-world-directory" aria-label="Baghdad journey destinations">
        <p className="ten-eyebrow">Explore your journey</p>
        <ol><li><Link href="/learner/sessions"><span>01</span><div>Gather for a session<small>Briefings and learning objectives</small></div></Link></li><li><Link href="/learner/assessments"><span>02</span><div>Put your reasoning to work<small>Baseline and assessment checkpoints</small></div></Link></li><li><Link href="/learner/progress"><span>03</span><div>Reflect on your progress<small>Attendance, results, and completion</small></div></Link></li></ol>
      </nav>
      <aside className="ten-nexus-focus" aria-labelledby="nexus-focus-title">
        <div className="ten-nexus-art"><Image src={worldAssets.nexus} alt="The Nexus, an illustrated gateway connecting Baghdad's paths of knowledge" fill sizes="(max-width: 720px) 148px, 190px" loading="lazy" className="object-cover object-center" /></div>
        <div><p className="ten-eyebrow">The Nexus</p><h3 id="nexus-focus-title">Your path gathers here</h3><p>Sessions, checkpoints, and reflection stay connected as your recorded journey grows.</p><Link href={next.href}>Follow your next path <span aria-hidden="true">→</span></Link></div>
      </aside>
    </div>
  </section>
}
