export const theTenTokens = {
  color: {
    parchment: '#F7F0DF',
    parchmentDeep: '#EAD9B8',
    ink: '#17363A',
    teal: '#1F6668',
    cyan: '#46B9BD',
    gold: '#D8A94E',
    goldSoft: '#F2D99B',
    success: '#2F8A72',
    danger: '#C76057',
    warning: '#C58A3E',
    white: '#FFFDF8',
  },
  radius: {
    sm: '12px',
    md: '18px',
    lg: '26px',
    xl: '34px',
  },
  motion: {
    instant: 120,
    control: 190,
    panel: 280,
    section: 380,
    celebration: 650,
  },
} as const

export type TheTenFeedbackState = 'idle' | 'selected' | 'submitting' | 'correct' | 'incorrect' | 'partial' | 'disabled'
export type CharacterReaction = 'neutral' | 'introduce' | 'guide' | 'thinking' | 'hint' | 'correct' | 'incorrect' | 'partial' | 'celebrate' | 'locked'
