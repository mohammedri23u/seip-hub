'use client'

import Image from 'next/image'
import { useTransition } from 'react'
import { getCharacterAsset, getNexusStateAsset, storyAssets } from '@/lib/the-ten/assets'
import { getGuide, type GuideKey } from '@/lib/the-ten/experience'

export function SignalActivation({ signalNumber, totalSignals = 10, guideKey, onContinue }: { signalNumber: number; totalSignals?: number; guideKey?: GuideKey | null; onContinue: () => void | Promise<void> }) {
  const [pending, startTransition] = useTransition()
  const guide = getGuide(guideKey)
  const portrait = guideKey ? getCharacterAsset(guideKey, 'celebrate') : null
  const firstActivationLevel = Math.max(1, Math.min(4, Math.trunc(signalNumber)))
  const destination = getNexusStateAsset(firstActivationLevel)

  return <main className="ten-signal-activation" aria-labelledby="signal-activation-title">
    <div className="ten-activation-art" aria-hidden="true">
      <Image src={storyAssets.signalActivationBackground} alt="" fill priority sizes="100vw" className="object-cover object-center" />
      <div className="ten-activation-art-shade" />
    </div>
    <div className="ten-activation-field" aria-hidden="true"><i /><i /><i /></div>
    <section>
      <p className="ten-story-eyebrow">NEXUS EVENT · SIGNAL {signalNumber}/{totalSignals}</p>
      <div className="ten-activation-state" aria-hidden="true">
        <Image src={destination} alt="" fill sizes="(max-width: 640px) 84vw, 520px" className="object-cover object-center" priority />
        <div className="ten-activation-state-ring" />
      </div>
      <h1 id="signal-activation-title">Signal restored.</h1>
      <p>One path is carrying connection again. The Nexus has recorded the change, and Baghdad will now reflect it.</p>
      <div className="ten-activation-progress" role="status" aria-label={`${firstActivationLevel} of 4 First Activation Signals restored`}>
        {Array.from({ length: 4 }, (_, index) => <span key={index} data-active={index < firstActivationLevel || undefined} />)}
      </div>
      {guide && <div className="ten-activation-guide">{portrait && <span><Image src={portrait} alt="" fill sizes="70px" className="object-contain object-bottom" /></span>}<blockquote>“The path holds. Carry its way of thinking forward.”<small>{guide.name} · Your Guide</small></blockquote></div>}
      <button type="button" disabled={pending} onClick={() => startTransition(() => { void onContinue() })}>{pending ? 'Recording activation…' : 'Continue to the epilogue'} <span aria-hidden="true">→</span></button>
    </section>
  </main>
}
