import assert from 'node:assert/strict'
import { checkpointState, nextJourneyAction, isSubmitted } from '../src/lib/the-ten/journey.ts'
import { formativeAnswerReducer as reduce, initialAnswerState, validFormativeFeedback } from '../src/lib/the-ten/case-flow.ts'
import { releasedScoreOutcome } from '../src/lib/the-ten/feedback.ts'

const now = Date.parse('2026-09-08T12:00:00Z')
const assessment = { id: 'a', title: 'Baseline', cohort_id: 'c', assessment_type: 'diagnostic', status: 'live', opens_at: null, closes_at: null, duration_minutes: null }
const attempt = { id: 't', assessment_id: 'a', status: 'in_progress', submitted_at: null }
assert.equal(checkpointState(assessment, undefined, now).state, 'available')
assert.equal(checkpointState(assessment, attempt, now).state, 'in_progress')
for (const fields of [{ status: 'scheduled' }, { opens_at: '2026-09-09T12:00:00Z' }, { closes_at: '2026-09-07T12:00:00Z' }, { status: 'grading' }, { status: 'released' }]) {
  assert.equal(checkpointState({ ...assessment, ...fields }, attempt, now).state, 'locked')
}
assert.equal(checkpointState({ ...assessment, closes_at: '2026-09-08T12:00:00Z' }, attempt, now).state, 'in_progress')
assert.equal(checkpointState(assessment, { ...attempt, status: 'invalidated' }, now).href, undefined)
assert.equal(isSubmitted({ ...attempt, status: 'invalidated' }), false)
assert.equal(isSubmitted({ ...attempt, status: 'late' }), true)
assert.equal(checkpointState(assessment, { ...attempt, status: 'submitted' }, now).href, '/learner/progress')
assert.equal(checkpointState({ ...assessment, status: 'released' }, { ...attempt, status: 'submitted' }, now).href, '/learner/results/t')

const data = { name: null, cohorts: [{ id: 'c', name: 'Cohort' }], assessments: [assessment], attempts: [], sessions: [{ id: 's', title: 'Session', status: 'live' }], attendance: [] }
assert.equal(nextJourneyAction(data, now).href, '/assessments/a/take')
assert.equal(nextJourneyAction({ ...data, assessments: [] }, now).href, '/learner/sessions/s')
assert.equal(nextJourneyAction({ ...data, assessments: [], sessions: [] }, now).href, '/learner/progress')
assert.equal(nextJourneyAction({ ...data, cohorts: [], assessments: [], sessions: [] }, now).href, '/learner/orientation')

assert.equal(reduce(initialAnswerState, { type: 'submit' }), initialAnswerState)
let state = reduce(initialAnswerState, { type: 'select', optionId: 'o' })
state = reduce(state, { type: 'submit' })
assert.equal(state.status, 'submitting')
assert.equal(reduce(state, { type: 'select', optionId: 'other' }), state)
assert.equal(reduce(state, { type: 'submit' }), state)
const feedback = { questionId: 'q', optionId: 'o', outcome: 'partial', explanation: 'A missing reasoning step.' }
assert.equal(validFormativeFeedback(feedback, 'other', 'o'), false)
assert.equal(validFormativeFeedback({ ...feedback, explanation: '' }, 'q', 'o'), false)
assert.equal(validFormativeFeedback(feedback, 'q', 'o'), true)
assert.equal(reduce(state, { type: 'resolve', feedback: { ...feedback, optionId: 'other' } }), state)
const failed = reduce(state, { type: 'fail' })
assert.equal(failed.status, 'selected')
assert.equal(failed.selected, 'o')
state = reduce(state, { type: 'resolve', feedback })
assert.equal(state.status, 'review')
assert.equal(state.selected, 'o')
assert.equal(reduce(state, { type: 'select', optionId: 'other' }), state)
assert.equal(reduce(state, { type: 'fail' }), state)
for (const [score, max, expected] of [[0, 2, 'incorrect'], [1, 2, 'partial'], [2, 2, 'correct'], [3, 2, null], [-1, 2, null], [0, 0, null], [NaN, 2, null]]) {
  assert.equal(releasedScoreOutcome(score, max), expected)
}
console.log('THE TEN: checkpoint windows, invalidation/release gates, next actions, feedback integrity, retry, duplicate-submit and locked-answer checks passed.')
