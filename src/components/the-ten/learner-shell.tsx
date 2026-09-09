import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { brandAssets } from '@/lib/the-ten/assets'
import { motionStyles } from '@/lib/the-ten/motion'

const navigation = [['/learner', 'Baghdad'], ['/learner/progress', 'My Codex'], ['/learner/certificate', 'Completion']] as const

export function LearnerShell({ title, intro, active = '/learner', children, actions, immersive = false }: { title: string; intro?: string; active?: string; children: ReactNode; actions?: ReactNode; immersive?: boolean }) {
  return <div className="ten-learner" style={motionStyles}>
    <a href="#learner-content" className="ten-skip">Skip to learning content</a>
    <header className="ten-header">
      <div className="ten-header-inner">
        <Link className="ten-wordmark" href="/learner" aria-label="THE TEN — Baghdad Nexus learner home">
          <Image src={brandAssets.lockup} alt="" fill sizes="(max-width: 720px) 132px, 164px" loading="lazy" className="object-cover object-center" />
        </Link>
        <nav aria-label="Learner journey navigation">{navigation.map(([href, label]) => <Link key={href} href={href} aria-current={href === active ? 'page' : undefined}>{label}</Link>)}</nav>
        <details className="ten-account"><summary>Account</summary><div><Link href="/learner/orientation">Orientation</Link><Link href="/dashboard">SEIP workspace</Link><form action="/auth/signout" method="post"><button type="submit">Sign out</button></form></div></details>
      </div>
    </header>
    <main id="learner-content" tabIndex={-1} className={`ten-main ${immersive ? 'pt-3 sm:pt-5' : ''}`}>
      {immersive ? <div className="sr-only"><h1>{title}</h1>{intro && <p>{intro}</p>}</div> : <div className="ten-page-heading"><p className="ten-eyebrow">THE TEN · BAGHDAD NEXUS</p><h1>{title}</h1>{intro && <p>{intro}</p>}{actions && <div className="ten-spaced">{actions}</div>}</div>}
      {immersive && actions ? <div className="mb-4 flex justify-end">{actions}</div> : null}
      {children}
    </main>
    <footer className="ten-footer">THE TEN · Baghdad Nexus <span>Think carefully. Learn together. Reflect.</span></footer>
  </div>
}
