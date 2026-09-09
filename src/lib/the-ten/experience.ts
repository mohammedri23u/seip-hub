import type { TheTenCharacter } from './assets'

export type GuideKey = TheTenCharacter

export type GuideDefinition = {
  key: GuideKey
  name: string
  title: string
  philosophy: string
  lens: string
  ability: {
    name: string
    description: string
    prompts: string[]
  }
  confirmation: string
}

export const guides: GuideDefinition[] = [
  {
    key: 'ibn-sina',
    name: 'Ibn Sina',
    title: 'The Integrator',
    philosophy: 'See the whole before judging the part.',
    lens: 'Synthesis · Prioritization · Pattern Integration',
    ability: {
      name: 'SYNTHESIZE',
      description: 'Organize what is known before committing to what it means.',
      prompts: ['Who is the patient?', 'What changed?', 'What defines this case?', 'What cannot be ignored?'],
    },
    confirmation: 'I will not give you answers. I will help you see what belongs together.',
  },
  {
    key: 'al-razi',
    name: 'Al-Razi',
    title: 'The Empiricist',
    philosophy: 'Do not protect your first conclusion. Test it.',
    lens: 'Evidence · Updating · Bias Awareness',
    ability: {
      name: 'CHALLENGE',
      description: 'Expose the assumption hiding inside your current reasoning.',
      prompts: ['What are you assuming?', 'Which revealed finding actually supports it?', 'What would make you reconsider?'],
    },
    confirmation: 'Expect me to question you precisely when you feel most certain.',
  },
  {
    key: 'jabir',
    name: 'Jabir ibn Hayyan',
    title: 'The Experimentalist',
    philosophy: 'A hypothesis becomes useful when it can be tested.',
    lens: 'Hypothesis · Probability · Investigation',
    ability: {
      name: 'TEST',
      description: 'Compare what would support, weaken or distinguish your hypothesis.',
      prompts: ['What supports it?', 'What opposes it?', 'What would change your mind?'],
    },
    confirmation: 'Bring me hypotheses. We will see whether they survive.',
  },
  {
    key: 'hippocrates',
    name: 'Hippocrates',
    title: 'The Explorer',
    philosophy: 'Before the disease, there is the patient.',
    lens: 'Observation · Safety · Reassessment',
    ability: {
      name: 'OBSERVE',
      description: 'Reframe the problem through the patient’s immediate context and priorities.',
      prompts: ['What needs attention now?', 'What could harm the patient first?', 'What has changed?'],
    },
    confirmation: 'When the problem grows complicated, return first to the patient.',
  },
]

export type ArrivalBeat = {
  id: string
  eyebrow?: string
  title: string
  body: string
  visual: 'dark' | 'baghdad' | 'nexus' | 'signals' | 'guardians' | 'seeker'
  emphasis?: string
}

export const arrivalBeats: ArrivalBeat[] = [
  {
    id: 'arrival',
    eyebrow: 'BAGHDAD · 391 AH · 1001 CE',
    title: 'Not the Baghdad history remembers.',
    body: 'For generations, Baghdad gathered knowledge from every direction. Beneath what was written, another system endured unseen.',
    visual: 'baghdad',
  },
  {
    id: 'nexus',
    eyebrow: 'BENEATH THE CITY',
    title: 'The Nexus.',
    body: 'It was never built to preserve facts. It preserved the paths between observation, evidence, hypothesis, decision and reassessment.',
    visual: 'nexus',
  },
  {
    id: 'ten',
    eyebrow: 'THE TEN',
    title: 'Ten Signals kept those paths alive.',
    body: 'Together they allowed knowledge to become judgment.',
    visual: 'signals',
    emphasis: '● ● ● ● ● ● ● ● ● ●',
  },
  {
    id: 'fracture',
    eyebrow: 'THE FRACTURE',
    title: 'Knowledge remained. Connection did not.',
    body: 'Patterns became fragments. Evidence became certainty before it was questioned. Tests became answers before they became questions.',
    visual: 'dark',
    emphasis: '○ ○ ○ ○ ○ ○ ○ ○ ○ ○',
  },
  {
    id: 'guardians',
    eyebrow: 'THE GUARDIANS',
    title: 'Four answered when the Nexus called.',
    body: 'Each understood a different path of reasoning. None could restore the system alone.',
    visual: 'guardians',
  },
  {
    id: 'seeker',
    eyebrow: 'SEEKER IDENTIFIED',
    title: 'It found you.',
    body: 'The Nexus did not search for another master. It searched for a mind still becoming one — a mind with knowledge whose way of deciding is still being formed.',
    visual: 'seeker',
  },
  {
    id: 'invitation',
    eyebrow: 'FIRST ACTIVATION',
    title: 'Four Signals can still be reached.',
    body: 'Restore them, and the Nexus may awaken again.',
    visual: 'signals',
    emphasis: '◌ ◌ ◌ ◌ ○ ○ ○ ○ ○ ○',
  },
]

export function getGuide(key: GuideKey | null | undefined) {
  return guides.find(guide => guide.key === key) ?? null
}
