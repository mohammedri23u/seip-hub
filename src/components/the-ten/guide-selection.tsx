'use client'

import Image from 'next/image'
import { useState } from 'react'
import { characterAssets, storyAssets } from '@/lib/the-ten/assets'
import { getGuides, type GuideKey } from '@/lib/the-ten/experience'
import { PendingButton } from './experience/pending-button'
import { useI18n } from '@/components/i18n-provider'
import { LanguageSwitcher } from '@/components/language-switcher'

type GuideSelectionProps = { chooseAction: (formData: FormData) => Promise<void> }

export function GuideSelection({ chooseAction }: GuideSelectionProps) {
  const { locale, tr } = useI18n()
  const guides = getGuides(locale)
  const [selected, setSelected] = useState<GuideKey>('ibn-sina')
  const [showAbility, setShowAbility] = useState(false)
  const guide = guides.find(item => item.key === selected) ?? guides[0]

  function select(key: GuideKey) { setSelected(key); setShowAbility(false) }

  return <main className="ten-guide-hall" data-experience="story">
    <a href="#guide-choice" className="ten-skip">{tr('Skip to Guide selection', 'تخطَّ إلى اختيار المرشد')}</a>
    <div className="ten-immersive-language"><LanguageSwitcher /></div>
    <div className="ten-hall-environment" aria-hidden="true"><Image src={storyAssets.guideSelectionHall} alt="" fill sizes="(max-width: 1100px) 1672px, 100vw" quality={90} className="object-cover" preload /></div>
    <header className="ten-hall-heading"><p className="ten-scene-label">{tr('THE NEXUS / HALL OF GUIDES', 'النِكسس / قاعة المرشدين')}</p><h1>{tr('A way of seeing.', 'طريقةٌ للرؤية.')}<br />{tr('A mind beside yours.', 'وعقلٌ إلى جانب عقلك.')}</h1><p>{tr('Every Guardian has something to teach you.', 'لدى كل حارسٍ ما يعلّمك إياه.')}<br />{tr('Choose the Guide who will walk with you.', 'اختر المرشد الذي سيرافقك.')}</p></header>
    <div className="ten-hall-body" id="guide-choice" tabIndex={-1}>
      <div className="ten-hall-assembly" aria-label={tr('The four Guides', 'المرشدون الأربعة')}>
        {guides.map(item => <button key={item.key} type="button" data-selected={selected === item.key} className="ten-hall-figure" aria-pressed={selected === item.key} aria-label={tr(`Meet ${item.name}, ${item.title}`, `تعرّف إلى ${item.name}، ${item.title}`)} onClick={() => select(item.key)}>
          <span className="ten-hall-character"><Image src={characterAssets[item.key].introduce ?? characterAssets[item.key].neutral!} alt="" fill sizes="(max-width: 720px) 220px, 280px" quality={90} className="object-contain object-bottom" /></span>
          <span className="ten-hall-name">{item.name}<small>{selected === item.key ? tr('In focus', 'قيد الاختيار') : item.title}</small></span>
        </button>)}
      </div>
      <section className="ten-guide-dialogue" aria-labelledby="guide-name">
        <div className="ten-guide-mobile-choices" role="group" aria-label={tr('Choose a Guide', 'اختر مرشداً')}>{guides.map(item => <button type="button" key={item.key} aria-pressed={selected === item.key} onClick={()=>select(item.key)}>{item.name}</button>)}</div>
        <div key={guide.key} className="ten-dialogue-enter"><p className="ten-scene-label">{tr('YOUR PERSONAL GUIDE', 'مرشدك الشخصي')} / {guide.title}</p><h2 id="guide-name">{guide.name}</h2><blockquote>“{guide.philosophy}”</blockquote><p className="ten-guide-lens">{guide.lens}</p></div>
        <button type="button" className="ten-lens-toggle" aria-expanded={showAbility} aria-controls="guide-lens-preview" onClick={()=>setShowAbility(!showAbility)}><span>{tr(`Explore ${guide.ability.name.toLowerCase()}`, `استكشف قدرة «${guide.ability.name}»`)}</span><span aria-hidden="true">{showAbility ? '−' : '+'}</span></button>
        {showAbility && <div id="guide-lens-preview" className="ten-lens-preview"><p>{guide.ability.description}</p><ol>{guide.ability.prompts.map(prompt=><li key={prompt}>{prompt}</li>)}</ol></div>}
        <form action={chooseAction}><input type="hidden" name="guide_key" value={guide.key}/><PendingButton pendingLabel={tr('Recording your bond…', 'جارٍ تسجيل رابطك…')}>{tr(`Walk with ${guide.name}`, `سِر مع ${guide.name}`)} <span aria-hidden="true">→</span></PendingButton></form>
        <p className="ten-guide-rule">{tr('A Guide may change how you think.', 'قد يغيّر المرشد طريقة تفكيرك.')}<br /><strong>{tr('Never what the answer is.', 'ولن يغيّر الإجابة أبداً.')}</strong></p>
      </section>
    </div>
  </main>
}
