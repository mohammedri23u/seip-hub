import type { CharacterReaction } from '../tokens'
import type { TheTenCharacter } from '../assets'

export type GuideKey = TheTenCharacter
export type StoryMode = 'story' | 'reasoning' | 'reveal'
export type StoryLayout = 'left' | 'center' | 'split' | 'portrait'
export type StoryVisualKey = 'dark' | 'baghdad' | 'nexus' | 'signals' | 'guardians' | 'seeker'
export type StoryMotionPreset = 'still' | 'drift' | 'focus' | 'fracture' | 'activate'
export type StoryAtmospherePreset = 'quiet' | 'city' | 'nexus' | 'fracture' | 'gold'

export type StoryScene = {
  id: string
  eyebrow?: string
  title: string
  narration?: string
  dialogue?: string
  speaker?: string
  visualKey: StoryVisualKey
  character?: GuideKey
  characterReaction?: CharacterReaction
  layout?: StoryLayout
  motion?: StoryMotionPreset
  atmosphere?: StoryAtmospherePreset
  ctaLabel?: string
  allowPrevious?: boolean
  progressionRule?: string
  worldStateRequirement?: number
  emphasis?: string
}

export type StoryDefinition = {
  id: string
  title: string
  version: number
  replayable?: boolean
  scenes: StoryScene[]
}

export type StoryProgressRecord = {
  last_scene_id?: string
  first_viewed_at?: string
  updated_at?: string
  completed_at?: string
}

export type GuideUseRecord = {
  guide_key: GuideKey
  used_at: string
}

export type GuideDefinition = {
  key: GuideKey
  name: string
  title: string
  philosophy: string
  lens: string
  ability: { name: string; description: string; prompts: string[] }
  confirmation: string
}

export type MissionEpisodeInput = {
  runId: string
  missionId: string
  title: string
  mentor: string
  lens: string
  focus?: string | null
  guide?: GuideKey | null
}
