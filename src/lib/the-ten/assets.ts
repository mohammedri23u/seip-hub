import type { CharacterReaction } from './tokens'

export type TheTenCharacter = 'ibn-sina' | 'jabir' | 'hippocrates' | 'al-razi'

type CharacterAssetMap = Record<CharacterReaction, string | null>

const fallback = '/the-ten/characters/placeholder-character.png'

export const characterAssets: Record<TheTenCharacter, CharacterAssetMap> = {
  'ibn-sina': {
    neutral: '/the-ten/characters/ibn-sina/neutral.png',
    introduce: null,
    guide: null,
    thinking: null,
    hint: null,
    correct: null,
    incorrect: null,
    partial: null,
    celebrate: null,
    locked: null,
  },
  jabir: {
    neutral: '/the-ten/characters/jabir/neutral.png',
    introduce: null,
    guide: null,
    thinking: null,
    hint: null,
    correct: null,
    incorrect: null,
    partial: null,
    celebrate: null,
    locked: null,
  },
  hippocrates: {
    neutral: '/the-ten/characters/hippocrates/neutral.png',
    introduce: null,
    guide: null,
    thinking: null,
    hint: null,
    correct: null,
    incorrect: null,
    partial: null,
    celebrate: null,
    locked: null,
  },
  'al-razi': {
    neutral: '/the-ten/characters/al-razi/neutral.png',
    introduce: null,
    guide: null,
    thinking: null,
    hint: null,
    correct: null,
    incorrect: null,
    partial: null,
    celebrate: null,
    locked: null,
  },
}

export function getCharacterAsset(character: TheTenCharacter, reaction: CharacterReaction) {
  return characterAssets[character][reaction] ?? characterAssets[character].neutral ?? fallback
}

export const worldAssets = {
  baghdad: '/the-ten/world/baghdad.png',
  nexus: '/the-ten/world/nexus.png',
  logo: '/the-ten/brand/the-ten-baghdad-nexus.png',
} as const

// Keep null pose entries explicit: Codex must not fabricate missing character art in code.
