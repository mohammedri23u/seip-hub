import Image from 'next/image'
import { brandAssets, worldAssets } from '@/lib/the-ten/assets'
import { PendingButton } from '@/components/the-ten/experience/pending-button'
import { login } from './actions'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  return <main className="ten-entry">
    <section className="ten-entry-world" aria-labelledby="entry-world-title"><Image src={worldAssets.baghdadHero} alt="Baghdad’s river and domes beyond a scholar’s window" fill preload quality={90} sizes="(max-width: 720px) 640px, (max-width: 1100px) 1672px, 100vw" className="object-cover"/><p className="ten-scene-label">THE TEN / BAGHDAD NEXUS</p><div><p className="ten-scene-label">A CITY OF KNOWLEDGE. A JOURNEY OF JUDGMENT.</p><h2 id="entry-world-title">The next connection<br />begins with you.</h2><p>Enter Baghdad. Follow its Signals. Bring your way of thinking into the Nexus.</p></div></section>
    <section className="ten-entry-form" aria-labelledby="sign-in-title"><div className="ten-entry-brand"><Image src={brandAssets.lockup} alt="THE TEN — Baghdad Nexus" fill sizes="170px" className="object-cover"/></div><p className="ten-eyebrow">WELCOME TO THE NEXUS</p><h1 id="sign-in-title">Enter your journey.</h1><p>Sign in with your SEIP account.</p>
      {params.error && <div role="alert" className="ten-entry-error">Unable to sign in. Check your credentials and try again.</div>}
      <form action={login}><label>Email<input type="email" name="email" autoComplete="email" required/></label><label>Password<input type="password" name="password" autoComplete="current-password" required/></label><PendingButton pendingLabel="Signing in…">Sign in <span aria-hidden="true">→</span></PendingButton></form>
    </section>
  </main>
}
