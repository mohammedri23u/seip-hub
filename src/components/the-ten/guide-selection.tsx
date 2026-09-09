'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { characterAssets, worldAssets } from '@/lib/the-ten/assets'
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
      <Image src={worldAssets.nexus} alt="The Nexus selection hall" fill sizes="100vw" className="object-cover opacity-35 scale-105" priority />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(70,185,189,.12),transparent_30rem)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a2427]/30 via-[#102f32]/72 to-[#071e21]/96" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col px-4 py-5 sm:px-7 sm:py-8">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-black tracking-[.24em] text-[#f2d99b] sm:text-xs">THE NEXUS · GUIDE BINDING</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-6xl">Choose who walks beside you.</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#d7e8e3] sm:text-base">You will meet every Guardian. One becomes your personal reasoning guide across the journey.</p>
        </header>

        <div className="mt-7 grid flex-1 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,.75fr)] lg:items-center">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {guides.map(item => {
              const active = selected === item.key
              const image = characterAssets[item.key].introduce ?? characterAssets[item.key].neutral
              return <button key={item.key} type="button" onClick={() => { setSelected(item.key); setShowAbility(false) }} aria-pressed={active} className={`group relative min-h-[255px] overflow-hidden rounded-[1.75rem] border text-left shadow-2xl transition duration-300 motion-reduce:transition-none sm:min-h-[330px] ${active ? 'border-[#f2d99b] bg-[#f7f0df] text-[#17363a] shadow-[0_0_0_2px_rgba(242,217,155,.16),0_24px_70px_rgba(0,0,0,.28)] lg:-translate-y-2' : 'border-white/15 bg-[#17363a]/72 text-white hover:border-[#79c7c3]/60 hover:bg-[#17363a]/90'}`}>
                <div className="absolute inset-x-0 top-0 h-[72%] overflow-hidden">
                  {image && <Image src={image} alt={item.name} fill sizes="(max-width:1024px) 50vw, 30vw" className={`object-cover object-top transition duration-500 motion-reduce:transition-none ${active ? 'scale-[1.035]' : 'opacity-80 grayscale-[.15] group-hover:scale-[1.025] group-hover:opacity-100'}`} />}
                  <div className={`absolute inset-0 bg-gradient-to-t ${active ? 'from-[#f7f0df] via-transparent to-transparent' : 'from-[#17363a] via-transparent to-transparent'}`} />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <span className={`text-[9px] font-black tracking-[.18em] ${active ? 'text-[#9a6b20]' : 'text-[#f2d99b]'}`}>{active ? 'SELECTED GUIDE' : 'GUARDIAN'}</span>
                  <h2 className="mt-1 font-serif text-xl leading-tight sm:text-2xl">{item.name}</h2>
                  <p className={`mt-1 text-xs font-bold sm:text-sm ${active ? 'text-[#1f6668]' : 'text-[#9fc7c2]'}`}>{item.title}</p>
                </div>
              </button>
            })}
          </div>

          <aside className="rounded-[2rem] border border-[#f2d99b]/25 bg-[#0d2b2e]/88 p-5 shadow-[0_30px_90px_rgba(0,0,0,.28)] backdrop-blur-xl sm:p-7">
            <p className="text-[10px] font-black tracking-[.2em] text-[#f2d99b]">{guide.title.toUpperCase()}</p>
            <h2 className="mt-2 font-serif text-4xl leading-tight">{guide.name}</h2>
            <blockquote className="mt-4 border-l-2 border-[#f2d99b]/60 pl-4 font-serif text-xl italic leading-8 text-[#f6e7bf]">“{guide.philosophy}”</blockquote>
            <p className="mt-5 text-xs font-black tracking-[.16em] text-[#79c7c3]">REASONING LENS</p>
            <p className="mt-1 text-sm leading-6 text-[#d7e8e3]">{guide.lens}</p>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[.045] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black tracking-[.16em] text-[#f2d99b]">GUIDE ABILITY</p><h3 className="mt-1 font-serif text-2xl">{guide.ability.name}</h3></div><button type="button" onClick={() => setShowAbility(value => !value)} className="min-h-10 rounded-full border border-[#79c7c3]/25 px-4 text-xs font-black text-[#9ddbd6] transition hover:bg-white/5 motion-reduce:transition-none">{showAbility ? 'Hide preview' : 'Preview'}</button></div>
              <p className="mt-2 text-sm leading-6 text-[#cfe1dc]">{guide.ability.description}</p>
              {showAbility && <div className="mt-4 space-y-2 border-t border-white/10 pt-4">{guide.ability.prompts.map(prompt => <div key={prompt} className="rounded-xl border border-white/10 bg-[#17363a]/65 px-3 py-2 text-sm font-bold text-[#e5efec]">{prompt}</div>)}<p className="pt-1 text-xs leading-5 text-[#91aaa7]">Your Guide structures your thinking. It never reveals or selects the answer.</p></div>}
            </div>

            <div className="mt-6 rounded-2xl border border-[#f2d99b]/20 bg-[#f2d99b]/[.06] p-4">
              <p className="font-serif text-lg leading-7 text-[#f6e7bf]">“{guide.confirmation}”</p>
            </div>

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
