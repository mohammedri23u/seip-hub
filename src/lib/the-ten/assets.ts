import type { CharacterReaction } from './tokens'

export type TheTenCharacter = 'ibn-sina' | 'jabir' | 'hippocrates' | 'al-razi'

type CharacterAssetMap = Record<CharacterReaction, string | null>

export const characterAssets: Record<TheTenCharacter, CharacterAssetMap> = {
  'ibn-sina': {
    neutral: null, // TODO approved: /the-ten/characters/ibn-sina/neutral.png
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
    neutral: null, // TODO approved: /the-ten/characters/jabir/neutral.png
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
    neutral: null, // TODO approved: /the-ten/characters/hippocrates/neutral.png
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
    neutral: null, // TODO approved: /the-ten/characters/al-razi/neutral.png
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
  return characterAssets[character][reaction] ?? characterAssets[character].neutral
}

export const worldAssets: Record<'baghdad' | 'nexus' | 'logo', string | null> = {
  baghdad: null, // TODO approved: /the-ten/world/baghdad.png
  nexus: null, // TODO approved: /the-ten/world/nexus.png
  logo: null, // TODO approved: /the-ten/brand/the-ten-baghdad-nexus.png
}

export const missingCharacterAssets = Object.entries(characterAssets).flatMap(([character, poses]) =>
  Object.entries(poses).filter(([, path]) => !path).map(([reaction]) => `/the-ten/characters/${character}/${reaction}.png`),
)

// Keep null pose entries explicit: Codex must not fabricate missing character art in code.
