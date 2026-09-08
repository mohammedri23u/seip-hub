'use client'
import Link from 'next/link'

export default function LearnerError({ reset }: { reset: () => void }) {
  return <main className="ten-main"><section className="ten-panel" role="alert"><h1>Your journey could not be loaded</h1><p>We could not retrieve your records. Try again to see your current progress.</p><button className="ten-action ten-spaced" onClick={reset}>Try again</button><Link className="ten-text-link ten-spaced" href="/dashboard">Return to your workspace</Link></section></main>
}
