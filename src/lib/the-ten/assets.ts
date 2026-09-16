import type { CharacterReaction } from './tokens'

export type TheTenCharacter = 'ibn-sina' | 'jabir' | 'hippocrates' | 'al-razi'

type CharacterAssetMap = Record<CharacterReaction, string | null>

const productionAssetBase = 'https://ozwelzqoasjywfnoypmq.supabase.co/storage/v1/object/public/the-ten-assets/runtime-v1'

function productionAsset(path: string) {
  return `${productionAssetBase}/${path}`
}

export const characterAssets: Record<TheTenCharacter, CharacterAssetMap> = {
  'ibn-sina': {
    neutral: '/the-ten/characters/ibn-sina/neutral.png',
    introduce: productionAsset('characters/ibn-sina/introduce.webp'),
    guide: productionAsset('characters/ibn-sina/guide.webp'),
    thinking: productionAsset('characters/ibn-sina/thinking.webp'),
    hint: null,
    correct: null,
    incorrect: null,
    partial: null,
    celebrate: productionAsset('characters/ibn-sina/celebrate.webp'),
    locked: productionAsset('characters/ibn-sina/locked.webp'),
  },
  jabir: {
    neutral: '/the-ten/characters/jabir/neutral.png',
    introduce: productionAsset('characters/jabir/introduce.webp'),
    guide: productionAsset('characters/jabir/guide.webp'),
    thinking: productionAsset('characters/jabir/thinking.webp'),
    hint: null,
    correct: null,
    incorrect: null,
    partial: null,
    celebrate: productionAsset('characters/jabir/celebrate.webp'),
    locked: productionAsset('characters/jabir/locked.webp'),
  },
  hippocrates: {
    neutral: '/the-ten/characters/hippocrates/neutral.png',
    introduce: productionAsset('characters/hippocrates/introduce.webp'),
    guide: productionAsset('characters/hippocrates/guide.webp'),
    thinking: productionAsset('characters/hippocrates/thinking.webp'),
    hint: null,
    correct: null,
    incorrect: null,
    partial: null,
    celebrate: productionAsset('characters/hippocrates/celebrate.webp'),
    locked: productionAsset('characters/hippocrates/locked.webp'),
  },
  'al-razi': {
    neutral: '/the-ten/characters/al-razi/neutral.png',
    introduce: productionAsset('characters/al-razi/introduce.webp'),
    guide: productionAsset('characters/al-razi/guide.webp'),
    thinking: productionAsset('characters/al-razi/thinking.webp'),
    hint: null,
    correct: null,
    incorrect: null,
    partial: null,
    celebrate: productionAsset('characters/al-razi/celebrate.webp'),
    locked: productionAsset('characters/al-razi/locked.webp'),
  },
}

export function getCharacterAsset(character: TheTenCharacter, reaction: CharacterReaction) {
  return characterAssets[character][reaction] ?? characterAssets[character].neutral
}

export const brandAssets = {
  lockup: '/the-ten/brand/the-ten-baghdad-nexus.png',
  crest: '/the-ten/brand/the-ten-baghdad-nexus-crest.png',
} as const

export const worldAssets = {
  baghdad: '/the-ten/world/baghdad.png',
  nexus: '/the-ten/world/nexus.png',
  baghdadHero: productionAsset('world/baghdad-hero.webp'),
  baghdadBlueHourNexusReveal: productionAsset('world/baghdad-blue-hour-nexus-reveal.webp'),
  nexusState0Dormant: productionAsset('world/nexus-state-0-dormant.webp'),
  nexusState1Signal1: productionAsset('world/nexus-state-1-signal-1.webp'),
  nexusState2Signal2: productionAsset('world/nexus-state-2-signal-2.webp'),
  nexusState3Signal3: productionAsset('world/nexus-state-3-signal-3.webp'),
  nexusState4FirstActivation: productionAsset('world/nexus-state-4-first-activation.webp'),
} as const

export const nexusStateAssets = [
  worldAssets.nexusState0Dormant,
  worldAssets.nexusState1Signal1,
  worldAssets.nexusState2Signal2,
  worldAssets.nexusState3Signal3,
  worldAssets.nexusState4FirstActivation,
] as const

export function getNexusStateAsset(level: number) {
  const safeLevel = Math.max(0, Math.min(4, Math.trunc(level)))
  return nexusStateAssets[safeLevel] ?? worldAssets.nexusState0Dormant
}

export const storyAssets = {
  guideSelectionHall: productionAsset('world/guide-selection-hall-empty.webp'),
  chroniclerDesk: productionAsset('world/chronicler-desk.webp'),
  signalActivationBackground: productionAsset('world/signal-activation-background.webp'),
} as const

export const missingCharacterAssets = Object.entries(characterAssets).flatMap(([character, poses]) =>
  Object.entries(poses).filter(([, path]) => !path).map(([reaction]) => `/the-ten/characters/${character}/${reaction}.png`),
)

// Null reaction entries are deliberate: v1 does not use answer-correctness mascot poses.
