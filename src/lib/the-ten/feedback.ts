import type { CharacterReaction } from './tokens'

export type FeedbackOutcome = 'correct' | 'incorrect' | 'partial'
export const feedbackPresentation: Record<FeedbackOutcome, { title: string; reaction: CharacterReaction }> = {
  correct: { title: 'Correct', reaction: 'correct' },
  incorrect: { title: 'Review your reasoning', reaction: 'incorrect' },
  partial: { title: 'Partially correct', reaction: 'partial' },
}

/** Only pass a released backend score. Never call this on a selected answer. */
export function releasedScoreOutcome(score: number, maximum: number): FeedbackOutcome | null {
  if (!Number.isFinite(score) || !Number.isFinite(maximum) || maximum <= 0 || score < 0 || score > maximum) return null
  return score === maximum ? 'correct' : score === 0 ? 'incorrect' : 'partial'
}
