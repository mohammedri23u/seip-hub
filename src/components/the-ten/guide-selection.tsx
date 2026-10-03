'use client'

import Image from 'next/image'
import { useState } from 'react'
import { characterAssets, storyAssets } from '@/lib/the-ten/assets'
import { guides, type GuideKey } from '@/lib/the-ten/experience'
import { PendingButton } from './experience/pending-button'

type GuideSelectionProps = { chooseAction: (formData: FormData) => Promise<void> }

export function GuideSelection({ chooseAction }: GuideSelectionProps) {
  const [selected, setSelected] = useState<GuideKey>('ibn-sina')
  const [showAbility, setShowAbility] = useState(false)
  const guide = guides.find(item => item.key === selected) ?? guides[0]

  function select(key: GuideKey) { setSelected(key); setShowAbility(false) }

  return <main className="ten-guide-hall" data-experience="story">
    <a href="#guide-choice" className="ten-skip">Skip to Guide selection</a>
    <div className="ten-hall-environment" aria-hidden="true"><Image src={storyAssets.guideSelectionHall} alt="" fill sizes="(max-width: 1100px) 1672px, 100vw" quality={90} className="object-cover" preload /></div>
    <header className="ten-hall-heading"><p className="ten-scene-label">THE NEXUS / HALL OF GUIDES</p><h1>A way of seeing.<br />A mind beside yours.</h1><p>Every Guardian has something to teach you.<br />Choose the Guide who will walk with you.</p></header>
    <div className="ten-hall-body" id="guide-choice" tabIndex={-1}>
      <div className="ten-hall-assembly" aria-label="The four Guides">
        {guides.map(item => <button key={item.key} type="button" data-selected={selected === item.key} className="ten-hall-figure" aria-pressed={selected === item.key} aria-label={`Meet ${item.name}, ${item.title}`} onClick={() => select(item.key)}>
          <span className="ten-hall-character"><Image src={characterAssets[item.key].introduce ?? characterAssets[item.key].neutral!} alt="" fill sizes="(max-width: 720px) 220px, 280px" quality={90} className="object-contain object-bottom" /></span>
          <span className="ten-hall-name">{item.name}<small>{selected === item.key ? 'In focus' : item.title}</small></span>
        </button>)}
      </div>
      <section className="ten-guide-dialogue" aria-labelledby="guide-name">
        <div className="ten-guide-mobile-choices" role="group" aria-label="Choose a Guide">{guides.map(item => <button type="button" key={item.key} aria-pressed={selected === item.key} onClick={()=>select(item.key)}>{item.name}</button>)}</div>
        <div key={guide.key} className="ten-dialogue-enter"><p className="ten-scene-label">YOUR PERSONAL GUIDE / {guide.title}</p><h2 id="guide-name">{guide.name}</h2><blockquote>“{guide.philosophy}”</blockquote><p className="ten-guide-lens">{guide.lens}</p></div>
        <button type="button" className="ten-lens-toggle" aria-expanded={showAbility} aria-controls="guide-lens-preview" onClick={()=>setShowAbility(!showAbility)}><span>Explore {guide.ability.name.toLowerCase()}</span><span aria-hidden="true">{showAbility ? '−' : '+'}</span></button>
        {showAbility && <div id="guide-lens-preview" className="ten-lens-preview"><p>{guide.ability.description}</p><ol>{guide.ability.prompts.map(prompt=><li key={prompt}>{prompt}</li>)}</ol></div>}
        <form action={chooseAction}><input type="hidden" name="guide_key" value={guide.key}/><PendingButton pendingLabel="Recording your bond…">Walk with {guide.name} <span aria-hidden="true">→</span></PendingButton></form>
        <p className="ten-guide-rule">A Guide may change how you think.<br /><strong>Never what the answer is.</strong></p>
      </section>
    </div>
  </main>
}
