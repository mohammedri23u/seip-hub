import Link from 'next/link'
import type { ReactNode } from 'react'
import { motionStyles } from '@/lib/the-ten/motion'

const navigation = [['/learner', 'Journey'], ['/learner/sessions', 'Sessions'], ['/learner/assessments', 'Checkpoints'], ['/learner/progress', 'Progress']] as const

export function LearnerShell({ title, intro, active = '/learner', children, actions }: { title: string; intro?: string; active?: string; children: ReactNode; actions?: ReactNode }) {
  return <div className="ten-learner" style={motionStyles}>
    <a href="#learner-content" className="ten-skip">Skip to learning content</a>
    <header className="ten-header">
      <div className="ten-header-inner">
        <Link className="ten-wordmark" href="/learner"><strong>THE TEN</strong><span>BAGHDAD NEXUS</span></Link>
        <nav aria-label="Learner navigation">{navigation.map(([href, label]) => <Link key={href} href={href} aria-current={href === active ? 'page' : undefined}>{label}</Link>)}</nav>
        <details className="ten-account"><summary>Account</summary><div><Link href="/learner/orientation">Orientation</Link><Link href="/dashboard">SEIP workspace</Link><form action="/auth/signout" method="post"><button type="submit">Sign out</button></form></div></details>
      </div>
    </header>
    <main id="learner-content" tabIndex={-1} className="ten-main">
      <div className="ten-page-heading"><p className="ten-eyebrow">Your learning journey</p><h1>{title}</h1>{intro && <p>{intro}</p>}{actions && <div className="ten-spaced">{actions}</div>}</div>
      {children}
    </main>
    <footer className="ten-footer">THE TEN · Baghdad Nexus <span>Think carefully. Learn together. Reflect.</span></footer>
  </div>
}
