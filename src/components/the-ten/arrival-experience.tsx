'use client'

import Image from 'next/image'
import { useState } from 'react'
import { arrivalBeats } from '@/lib/the-ten/experience'
import { brandAssets, characterAssets, worldAssets } from '@/lib/the-ten/assets'

type ArrivalExperienceProps = {
  completeAction: (formData: FormData) => Promise<void>
}

export function ArrivalExperience({ completeAction }: ArrivalExperienceProps) {
  const [index, setIndex] = useState(0)
  const beat = arrivalBeats[index]
  const last = index === arrivalBeats.length - 1

  return <main className="min-h-[100dvh] bg-[#0d292c] text-[#fffdf8]">
    <section className="relative isolate min-h-[100dvh] overflow-hidden" aria-live="polite">
      <ArrivalVisual visual={beat.visual} />
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#081f22]/15 via-[#0c292c]/20 to-[#081f22]/92" />
      <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_42%,rgba(70,185,189,.12),transparent_36rem)]" />

      <div className="relative z-20 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col justify-between px-5 py-6 sm:px-8 sm:py-9">
        <header className="flex items-center justify-between gap-4">
          <div className="relative h-14 w-32 overflow-hidden rounded-xl border border-white/10 bg-[#f7f0df]/95 shadow-xl sm:h-16 sm:w-40">
            <Image src={brandAssets.lockup} alt="THE TEN — Baghdad Nexus" fill sizes="160px" className="object-cover" priority />
          </div>
          <div className="flex items-center gap-1.5" aria-label={`Story beat ${index + 1} of ${arrivalBeats.length}`}>
            {arrivalBeats.map((item, itemIndex) => <span key={item.id} className={`h-1.5 rounded-full transition-all duration-500 motion-reduce:transition-none ${itemIndex === index ? 'w-8 bg-[#f2d99b]' : itemIndex < index ? 'w-4 bg-[#79c7c3]' : 'w-4 bg-white/25'}`} />)}
          </div>
        </header>

        <div className="flex flex-1 items-end pb-6 pt-16 sm:items-center sm:pb-0 sm:pt-8">
          <div key={beat.id} className="max-w-2xl animate-[tenArrivalIn_.55s_ease-out_both] motion-reduce:animate-none">
            {beat.eyebrow && <p className="text-[11px] font-black tracking-[.22em] text-[#f2d99b] sm:text-xs">{beat.eyebrow}</p>}
            <h1 className="mt-3 max-w-xl font-serif text-4xl leading-[1.04] text-[#fffdf8] sm:text-6xl lg:text-7xl">{beat.title}</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#d7e8e3] sm:text-lg sm:leading-8">{beat.body}</p>
            {beat.emphasis && <p className="mt-6 font-mono text-lg tracking-[.35em] text-[#8ed6d0] sm:text-2xl" aria-label={beat.emphasis}>{beat.emphasis}</p>}
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-white/10 pt-5">
          <button type="button" onClick={() => setIndex(current => Math.max(0, current - 1))} disabled={index === 0} className="min-h-12 rounded-full border border-white/15 px-5 text-sm font-bold text-[#d7e8e3] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-0 motion-reduce:transition-none">Back</button>
          {!last ? <button type="button" onClick={() => setIndex(current => Math.min(arrivalBeats.length - 1, current + 1))} className="min-h-12 rounded-full border border-[#f2d99b]/50 bg-[#f2d99b] px-6 text-sm font-black text-[#17363a] shadow-[0_12px_35px_rgba(242,217,155,.18)] transition hover:-translate-y-0.5 hover:bg-[#f6e5b5] motion-reduce:transform-none motion-reduce:transition-none">Continue →</button> : <form action={completeAction}><button type="submit" className="min-h-12 rounded-full border border-[#f2d99b]/60 bg-[#f2d99b] px-7 text-sm font-black text-[#17363a] shadow-[0_12px_40px_rgba(242,217,155,.24)] transition hover:-translate-y-0.5 hover:bg-[#f6e5b5] motion-reduce:transform-none motion-reduce:transition-none">Enter the Nexus →</button></form>}
        </footer>
      </div>

      <style jsx global>{`
        @keyframes tenArrivalIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  </main>
}

function ArrivalVisual({ visual }: { visual: (typeof arrivalBeats)[number]['visual'] }) {
  if (visual === 'baghdad') {
    return <div className="absolute inset-0"><Image src={worldAssets.baghdad} alt="Illustrated Baghdad" fill sizes="100vw" className="object-cover scale-[1.035] animate-[tenWorldDrift_18s_ease-in-out_infinite_alternate] motion-reduce:animate-none" priority /></div>
  }

  if (visual === 'nexus' || visual === 'seeker') {
    return <div className="absolute inset-0"><Image src={worldAssets.nexus} alt="The Baghdad Nexus" fill sizes="100vw" className={`object-cover ${visual === 'seeker' ? 'scale-110' : 'scale-105'} animate-[tenNexusBreath_8s_ease-in-out_infinite_alternate] motion-reduce:animate-none`} priority /><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(70,185,189,.18),transparent_25rem)]" /></div>
  }

  if (visual === 'guardians') {
    const characters = [
      ['ibn-sina', 'Ibn Sina'],
      ['al-razi', 'Al-Razi'],
      ['jabir', 'Jabir ibn Hayyan'],
      ['hippocrates', 'Hippocrates'],
    ] as const
    return <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,#245b5e_0%,#123437_46%,#081f22_100%)]"><div className="absolute inset-x-4 top-[15%] mx-auto grid max-w-5xl grid-cols-4 gap-2 opacity-75 sm:gap-6">{characters.map(([key, label], itemIndex) => <div key={key} className="relative aspect-[3/4] overflow-hidden rounded-[1.5rem] border border-[#f2d99b]/20 bg-[#f7f0df]/10 shadow-2xl" style={{transform:`translateY(${itemIndex % 2 ? 24 : 0}px)`}}><Image src={characterAssets[key].neutral ?? ''} alt={label} fill sizes="25vw" className="object-cover object-top" /></div>)}</div></div>
  }

  if (visual === 'signals') {
    return <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,#255f61_0%,#12383b_38%,#081f22_100%)]"><div className="absolute left-1/2 top-[38%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 sm:h-80 sm:w-80"><div className="absolute inset-0 rounded-full border border-[#f2d99b]/25 animate-[tenSignalSpin_28s_linear_infinite] motion-reduce:animate-none" /><div className="absolute inset-[12%] rounded-full border border-[#79c7c3]/30" /><div className="absolute inset-[25%] overflow-hidden rounded-full border border-[#f2d99b]/30 bg-[#f7f0df]/95 shadow-[0_0_80px_rgba(70,185,189,.24)]"><Image src={brandAssets.crest} alt="THE TEN crest" fill sizes="180px" className="object-cover" /></div></div></div>
  }

  return <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,#173f42_0%,#0e2d30_40%,#071b1e_100%)]"><div className="absolute left-1/2 top-[40%] h-px w-[70vw] max-w-4xl -translate-x-1/2 rotate-[-8deg] bg-gradient-to-r from-transparent via-[#79c7c3]/55 to-transparent shadow-[0_0_24px_rgba(70,185,189,.65)]" /></div>
}
