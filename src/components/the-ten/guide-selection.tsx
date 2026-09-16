'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { characterAssets, storyAssets } from '@/lib/the-ten/assets'
import { guides, type GuideKey } from '@/lib/the-ten/experience'

type GuideSelectionProps = {
  chooseAction: (formData: FormData) => Promise<void>
}

export function GuideSelection({ chooseAction }: GuideSelectionProps) {
  const [selected, setSelected] = useState<GuideKey>('ibn-sina')
  const [showAbility, setShowAbility] = useState(false)
  const guide = useMemo(() => guides.find(item => item.key === selected) ?? guides[0], [selected])

  return <main className="min-h-[100dvh] bg-[#102f32] text-[#fffdf8]">
    <section className="relative isolate min-h-[100dvh] overflow-hidden">
      <Image src={storyAssets.guideSelectionHall} alt="The Nexus Guide Selection Hall" fill sizes="100vw" className="object-cover object-center" priority />
      <div className="absolute inset-0 bg-gradient-to-b from-[#071e21]/20 via-[#102f32]/18 to-[#071e21]/92" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1500px] flex-col px-4 py-5 sm:px-7 sm:py-8">
        <header className="mx-auto max-w-3xl rounded-[1.75rem] border border-white/15 bg-[#102f32]/72 px-5 py-4 text-center shadow-2xl backdrop-blur-md sm:px-8 sm:py-5">
          <p className="text-[10px] font-black tracking-[.24em] text-[#f2d99b] sm:text-xs">THE NEXUS · GUIDE BINDING</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-6xl">Choose who walks beside you.</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#d7e8e3] sm:text-base">You will learn from every Guardian. One becomes your personal reasoning guide across the journey.</p>
        </header>

        <div className="mt-5 grid flex-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,.55fr)] xl:items-center">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#102f32]/10 p-2 shadow-[0_30px_90px_rgba(0,0,0,.22)] sm:p-4">
            <div className="pointer-events-none absolute inset-x-[8%] bottom-[6%] h-[17%] rounded-[50%] border border-[#79c7c3]/20 bg-[#46b9bd]/5 blur-sm" aria-hidden="true" />
            <div className="relative grid min-h-[430px] grid-cols-2 items-end gap-1 sm:min-h-[560px] sm:gap-3 lg:grid-cols-4 lg:gap-0">
              {guides.map(item => {
                const active = selected === item.key
                const image = characterAssets[item.key].introduce ?? characterAssets[item.key].neutral
                return <button
                  key={item.key}
                  type="button"
                  onClick={() => { setSelected(item.key); setShowAbility(false) }}
                  aria-pressed={active}
                  aria-label={`Choose ${item.name}, ${item.title}`}
                  className={`group relative flex min-h-[210px] flex-col items-center justify-end overflow-visible rounded-[1.5rem] px-1 pb-2 text-center transition duration-300 motion-reduce:transition-none sm:min-h-[360px] sm:px-2 sm:pb-4 ${active ? 'z-10 -translate-y-2' : 'opacity-75 hover:-translate-y-1 hover:opacity-100 focus-visible:opacity-100'}`}
                >
                  <span className={`absolute inset-x-[12%] bottom-[13%] h-[18%] rounded-[50%] border transition duration-300 ${active ? 'border-[#f2d99b]/65 bg-[#f2d99b]/20 shadow-[0_0_42px_rgba(242,217,155,.32)]' : 'border-[#79c7c3]/15 bg-[#46b9bd]/5'}`} aria-hidden="true" />
                  <span className="relative block h-[170px] w-full sm:h-[310px] lg:h-[350px]">
                    {image && <Image src={image} alt="" fill sizes="(max-width:640px) 45vw, (max-width:1200px) 24vw, 17vw" className={`object-contain object-bottom drop-shadow-[0_18px_24px_rgba(0,0,0,.24)] transition duration-300 motion-reduce:transition-none ${active ? 'scale-[1.045] saturate-100' : 'scale-[.96] saturate-[.82]'}`} />}
                  </span>
                  <span className={`relative mt-1 rounded-full border px-3 py-1.5 text-[9px] font-black tracking-[.12em] backdrop-blur-md sm:text-[10px] ${active ? 'border-[#f2d99b]/70 bg-[#f2d99b]/90 text-[#17363a]' : 'border-white/15 bg-[#102f32]/75 text-[#d7e8e3]'}`}>{item.name}</span>
                </button>
              })}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-[#f2d99b]/25 bg-[#0d2b2e]/90 p-5 shadow-[0_30px_90px_rgba(0,0,0,.30)] backdrop-blur-xl sm:p-7">
            <p className="text-[10px] font-black tracking-[.2em] text-[#f2d99b]">{guide.title.toUpperCase()}</p>
            <h2 className="mt-2 font-serif text-4xl leading-tight">{guide.name}</h2>
            <blockquote className="mt-4 border-l-2 border-[#f2d99b]/60 pl-4 font-serif text-xl italic leading-8 text-[#f6e7bf]">“{guide.philosophy}”</blockquote>
            <p className="mt-5 text-xs font-black tracking-[.16em] text-[#79c7c3]">REASONING LENS</p>
            <p className="mt-1 text-sm leading-6 text-[#d7e8e3]">{guide.lens}</p>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[.045] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[10px] font-black tracking-[.16em] text-[#f2d99b]">GUIDE ABILITY</p><h3 className="mt-1 font-serif text-2xl">{guide.ability.name}</h3></div>
                <button type="button" onClick={() => setShowAbility(value => !value)} className="min-h-10 rounded-full border border-[#79c7c3]/25 px-4 text-xs font-black text-[#9ddbd6] transition hover:bg-white/5 motion-reduce:transition-none">{showAbility ? 'Hide preview' : 'Preview'}</button>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#cfe1dc]">{guide.ability.description}</p>
              {showAbility && <div className="mt-4 space-y-2 border-t border-white/10 pt-4">{guide.ability.prompts.map(prompt => <div key={prompt} className="rounded-xl border border-white/10 bg-[#17363a]/65 px-3 py-2 text-sm font-bold text-[#e5efec]">{prompt}</div>)}<p className="pt-1 text-xs leading-5 text-[#91aaa7]">Your Guide structures your thinking. It never reveals or selects the answer.</p></div>}
            </div>

            <div className="mt-6 rounded-2xl border border-[#f2d99b]/20 bg-[#f2d99b]/[.06] p-4"><p className="font-serif text-lg leading-7 text-[#f6e7bf]">“{guide.confirmation}”</p></div>

            <form action={chooseAction} className="mt-6">
              <input type="hidden" name="guide_key" value={guide.key} />
              <button type="submit" className="min-h-14 w-full rounded-full border border-[#f2d99b]/60 bg-[#f2d99b] px-6 text-sm font-black text-[#17363a] shadow-[0_14px_40px_rgba(242,217,155,.18)] transition hover:-translate-y-0.5 hover:bg-[#f6e5b5] motion-reduce:transform-none motion-reduce:transition-none">Choose {guide.name} as my Guide →</button>
            </form>
            <p className="mt-3 text-center text-[11px] leading-5 text-[#8aa6a3]">Your Guide changes how you approach a decision, never what the answer is.</p>
          </aside>
        </div>
      </div>
    </section>
  </main>
}
