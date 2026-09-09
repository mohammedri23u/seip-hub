import type { StoryMotionPreset } from './types'

export const experienceMotion = { scene: 420, camera: 650, activation: 700 } as const
export const storyMotionClasses: Record<StoryMotionPreset, string> = {
  still: '', drift: 'ten-story-visual-drift', focus: 'ten-story-visual-focus', fracture: 'ten-story-visual-fracture', activate: 'ten-story-visual-activate',
}
