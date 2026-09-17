 'use client'
import Image from 'next/image'
import { getCharacterAsset } from '@/lib/the-ten/assets'
import { getGuide, type GuideKey } from '@/lib/the-ten/experience'
import type { CharacterReaction } from '@/lib/the-ten/tokens'
import { useI18n } from '@/components/i18n-provider'

export function GuidePresence({ guideKey, reaction = 'neutral', context = 'world', line }: { guideKey: GuideKey; reaction?: CharacterReaction; context?: 'world' | 'mission' | 'codex'; line?: string }) {
  const { locale, tr } = useI18n()
  const guide = getGuide(guideKey, locale)
  const image = getCharacterAsset(guideKey, reaction)
  if (!guide) return null
  return <aside className="ten-guide-presence" data-context={context} aria-label={tr(`Your Guide, ${guide.name}`, `مرشدك، ${guide.name}`)}>
    {image && <div className="ten-guide-presence-portrait"><Image src={image} alt="" fill sizes={context === 'world' ? '(max-width: 720px) 100px, 160px' : '72px'} quality={90} className="object-contain object-bottom" /></div>}
    <div><p>{tr('YOUR GUIDE', 'مرشدك')} · {guide.title.toUpperCase()}</p><h3>{guide.name}</h3>{line && <blockquote>“{line}”</blockquote>}</div>
  </aside>
}
