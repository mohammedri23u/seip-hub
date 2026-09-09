'use client'

import Image from 'next/image'
import { useTransition } from 'react'
import { brandAssets, getCharacterAsset } from '@/lib/the-ten/assets'
import { getGuide, type GuideKey } from '@/lib/the-ten/experience'

export function SignalActivation({ signalNumber, totalSignals = 10, guideKey, onContinue }: { signalNumber: number; totalSignals?: number; guideKey?: GuideKey | null; onContinue: () => void | Promise<void> }) {
  const [pending, startTransition] = useTransition()
  const guide = getGuide(guideKey)
  const portrait = guideKey ? getCharacterAsset(guideKey, 'celebrate') : null
  return <main className="ten-signal-activation" aria-labelledby="signal-activation-title">
    <div className="ten-activation-field" aria-hidden="true"><i /><i /><i /></div>
    <section>
      <p className="ten-story-eyebrow">NEXUS EVENT · {signalNumber}/{totalSignals}</p>
      <div className="ten-activation-crest" aria-hidden="true"><Image src={brandAssets.crest} alt="" fill sizes="220px" className="object-cover" priority /></div>
      <h1 id="signal-activation-title">Signal restored.</h1>
      <p>One part of the Nexus is carrying connection again. Baghdad has changed to reflect the path you completed.</p>
      {guide && <div className="ten-activation-guide">{portrait && <span><Image src={portrait} alt="" fill sizes="70px" className="object-cover object-top" /></span>}<blockquote>“The path holds. Carry its way of thinking forward.”<small>{guide.name} · Your Guide</small></blockquote></div>}
      <button type="button" disabled={pending} onClick={() => startTransition(() => { void onContinue() })}>{pending ? 'Recording activation…' : 'Continue to the epilogue'} <span aria-hidden="true">→</span></button>
    </section>
  </main>
}
