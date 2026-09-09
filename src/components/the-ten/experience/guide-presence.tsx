import Image from 'next/image'
import { getCharacterAsset } from '@/lib/the-ten/assets'
import { getGuide, type GuideKey } from '@/lib/the-ten/experience'
import type { CharacterReaction } from '@/lib/the-ten/tokens'

export function GuidePresence({ guideKey, reaction = 'neutral', context = 'world', line }: { guideKey: GuideKey; reaction?: CharacterReaction; context?: 'world' | 'mission' | 'codex'; line?: string }) {
  const guide = getGuide(guideKey)
  const image = getCharacterAsset(guideKey, reaction)
  if (!guide) return null
  return <aside className="ten-guide-presence" data-context={context} aria-label={`Your Guide, ${guide.name}`}>
    {image && <div className="ten-guide-presence-portrait"><Image src={image} alt="" fill sizes={context === 'world' ? '120px' : '72px'} className="object-cover object-top" /></div>}
    <div><p>YOUR GUIDE · {guide.title.toUpperCase()}</p><h3>{guide.name}</h3>{line && <blockquote>“{line}”</blockquote>}</div>
  </aside>
}
