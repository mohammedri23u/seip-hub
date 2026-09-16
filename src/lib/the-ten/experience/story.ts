import type { MissionEpisodeInput, StoryDefinition, StoryScene } from './types'

export const arrivalStory: StoryDefinition = {
  id: 'arrival', title: 'The Arrival', version: 1,
  scenes: [
    { id: 'arrival', eyebrow: 'BAGHDAD · 391 AH · 1001 CE', title: 'Not the Baghdad history remembers.', narration: 'For generations, Baghdad gathered knowledge from every direction. Beneath what was written, another system endured unseen.', visualKey: 'baghdad', layout: 'left', motion: 'drift', atmosphere: 'city', ctaLabel: 'Follow the hidden path', allowPrevious: false },
    { id: 'nexus', eyebrow: 'BENEATH THE CITY', title: 'The Nexus.', narration: 'It was never built to preserve facts. It preserved the paths between observation, evidence, hypothesis, decision and reassessment.', visualKey: 'nexus', layout: 'left', motion: 'focus', atmosphere: 'nexus', ctaLabel: 'Enter the chamber' },
    { id: 'ten', eyebrow: 'THE TEN', title: 'Ten Signals kept those paths alive.', narration: 'Together they allowed knowledge to become judgment.', visualKey: 'signals', layout: 'center', motion: 'focus', atmosphere: 'nexus', emphasis: '● ● ● ● ● ● ● ● ● ●', ctaLabel: 'Listen' },
    { id: 'fracture', eyebrow: 'THE FRACTURE', title: 'Knowledge remained. Connection did not.', narration: 'Pathways separated. Information fragmented. Evidence became certainty before it was questioned. Tests became answers before they became questions.', visualKey: 'dark', layout: 'center', motion: 'fracture', atmosphere: 'fracture', emphasis: '○ ○ ○ ○ ○ ○ ○ ○ ○ ○', ctaLabel: 'Find what remains' },
    { id: 'guardians', eyebrow: 'THE GUARDIANS', title: 'Four answered when the Nexus called.', narration: 'Each understood a different path of reasoning. None could restore the system alone.', visualKey: 'guardians', layout: 'center', motion: 'focus', atmosphere: 'quiet', ctaLabel: 'Approach' },
    { id: 'seeker', eyebrow: 'SEEKER IDENTIFIED', title: 'It found you.', narration: 'The Nexus did not search for another master. It searched for a mind still becoming one — a mind with knowledge whose way of deciding is still being formed.', visualKey: 'seeker', layout: 'left', motion: 'focus', atmosphere: 'nexus', ctaLabel: 'Answer the call' },
    { id: 'invitation', eyebrow: 'FIRST ACTIVATION', title: 'Four Signals can still be reached.', narration: 'Restore them, and the Nexus may awaken again.', visualKey: 'signals', layout: 'center', motion: 'activate', atmosphere: 'gold', emphasis: '◌ ◌ ◌ ◌ ○ ○ ○ ○ ○ ○', ctaLabel: 'Enter the Nexus' },
  ],
}

export const arrivalBeats = arrivalStory.scenes.map(scene => ({ id: scene.id, eyebrow: scene.eyebrow, title: scene.title, body: scene.narration ?? scene.dialogue ?? '', visual: scene.visualKey, emphasis: scene.emphasis }))

export function createMissionPrelude(input: MissionEpisodeInput): StoryDefinition {
  const scenes: StoryScene[] = [
    { id: 'signal-detected', eyebrow: `${input.missionId} · SIGNAL DETECTED`, title: input.title, narration: input.focus || 'A disturbance has reached the Nexus. Its meaning will emerge only as the facilitator releases the mission.', visualKey: 'baghdad', layout: 'left', motion: 'drift', atmosphere: 'city', ctaLabel: 'Trace the signal', allowPrevious: false },
    { id: 'reasoning-lens', eyebrow: `${input.mentor.toUpperCase()} · REASONING LENS`, title: input.lens, narration: 'Carry this way of thinking into the mission. It is a lens, not an answer.', visualKey: 'nexus', character: input.guide ?? undefined, characterReaction: 'guide', layout: input.guide ? 'portrait' : 'center', motion: 'focus', atmosphere: 'nexus', ctaLabel: 'Prepare to reason' },
    { id: 'world-quiets', eyebrow: 'LIVE REASONING', title: 'The world quiets.', narration: 'From here, only the facilitator can reveal the next clinical clue. Commit privately. Discuss openly. Revise only when the evidence changes your reasoning.', visualKey: 'dark', layout: 'center', motion: 'still', atmosphere: 'quiet', ctaLabel: 'Enter the waiting room' },
  ]
  return { id: `mission:${input.runId}:prelude`, title: `${input.title} prelude`, version: 1, replayable: true, scenes }
}

export function createMissionEpilogue(input: MissionEpisodeInput): StoryDefinition {
  return { id: `mission:${input.runId}:epilogue`, title: `${input.title} epilogue`, version: 1, replayable: true, scenes: [
    { id: 'consequence', eyebrow: 'THE PATH HOLDS', title: 'A connection has been restored.', narration: 'Not because every decision was effortless, but because evidence, judgment and reassessment remained connected.', visualKey: 'nexus', character: input.guide ?? undefined, characterReaction: 'guide', layout: input.guide ? 'portrait' : 'center', motion: 'focus', atmosphere: 'nexus', ctaLabel: 'Return to Baghdad', allowPrevious: false },
    { id: 'world-changed', eyebrow: 'WORLD STATE UPDATED', title: 'Baghdad will remember this Signal.', narration: 'The city now carries a visible trace of this completed path. Another Signal will answer when its prepared mission becomes live.', visualKey: 'baghdad', layout: 'left', motion: 'drift', atmosphere: 'gold', ctaLabel: 'See the changed world' },
  ] }
}
