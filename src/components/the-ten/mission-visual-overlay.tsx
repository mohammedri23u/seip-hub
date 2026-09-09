import Image from 'next/image'
import { DecorSprite, MissionSystemIcon } from '@/components/the-ten/art-sprite'
import { getCharacterAsset } from '@/lib/the-ten/assets'

const missionVisuals = {
  M01: {
    character: 'ibn-sina',
    accent: '#d8a94e',
    label: 'SEE THE PATTERN',
    motif: 'geometric-star' as const,
    motif2: 'baghdad-arch' as const,
  },
  M02: {
    character: 'al-razi',
    accent: '#46b9bd',
    label: 'QUESTION THE EVIDENCE',
    motif: 'astrolabe' as const,
    motif2: 'lantern' as const,
  },
  M03: {
    character: 'jabir',
    accent: '#c8794d',
    label: 'TEST THE HYPOTHESIS',
    motif: 'astrolabe' as const,
    motif2: 'geometric-star' as const,
  },
  M04: {
    character: 'hippocrates',
    accent: '#2f8a72',
    label: 'TREAT THE PATIENT',
    motif: 'palm' as const,
    motif2: 'waves' as const,
  },
} as const

type MissionId = keyof typeof missionVisuals
type MissionPhase = 'waiting' | 'commit_open' | 'commit_locked' | 'discussion' | 'revote_open' | 'reveal' | 'transfer' | 'debrief' | 'completed'

export function MissionVisualOverlay({ missionId, phase }: { missionId?: MissionId; phase?: MissionPhase }) {
  if (!missionId) return null
  const visual = missionVisuals[missionId]
  const reaction = phase === 'discussion' || phase === 'revote_open'
    ? 'thinking'
    : phase === 'completed'
      ? 'celebrate'
      : phase === 'waiting'
        ? 'locked'
        : 'guide'
  const portrait = getCharacterAsset(visual.character, reaction)
  const revealed = phase === 'reveal' || phase === 'debrief' || phase === 'completed'

  return <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
    <div className="absolute left-[-5rem] top-[28%] hidden h-[25rem] w-[19rem] opacity-[.15] lg:block">
      {portrait ? <Image src={portrait} alt="" fill sizes="304px" className="object-contain object-bottom drop-shadow-[0_28px_28px_rgba(23,54,58,.18)]" /> : null}
    </div>

    <div className="absolute right-[-2.5rem] top-[22%] hidden opacity-[.13] md:block">
      <MissionSystemIcon missionId={missionId} size={190} label="" />
    </div>

    <DecorSprite name={visual.motif} size={118} className="absolute right-[2%] top-[61%] hidden rotate-[8deg] opacity-[.10] md:block" />
    <DecorSprite name={visual.motif2} size={104} className="absolute bottom-[3%] left-[3%] hidden opacity-[.10] md:block" />

    <div className="absolute right-3 top-[5.3rem] grid h-[4.4rem] w-[4.4rem] place-items-center rounded-full border bg-[#fffdf8]/80 shadow-[0_12px_34px_rgba(23,54,58,.10)] backdrop-blur-sm md:hidden" style={{ borderColor: `${visual.accent}88` }}>
      <MissionSystemIcon missionId={missionId} size={58} label="" />
    </div>

    <div className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 rounded-full border border-[#d8ccb6]/70 bg-[#fffdf8]/78 px-4 py-2 text-[9px] font-black tracking-[.18em] text-[#526c6e] shadow-lg backdrop-blur-sm lg:block">
      <span style={{ color: visual.accent }}>{missionId}</span> · {visual.label} · {revealed ? 'SIGNAL REVEALED' : 'SIGNAL ACTIVE'}
    </div>
  </div>
}
