import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { attachLearnerMembershipStatus, checkpointState, nextJourneyAction, isSubmitted, retainedLearnerMembershipStatuses } from '../src/lib/the-ten/journey.ts'
import { formativeAnswerReducer as reduce, initialAnswerState, validFormativeFeedback } from '../src/lib/the-ten/case-flow.ts'
import { releasedScoreOutcome } from '../src/lib/the-ten/feedback.ts'
import { assessmentResponseRows, assessmentResponseValues, InvalidAssessmentResponse } from '../src/lib/assessment/submission.ts'

const now = Date.parse('2026-09-08T12:00:00Z')
const assessment = { id: 'a', title: 'Baseline', cohort_id: 'c', assessment_type: 'diagnostic', status: 'live', opens_at: null, closes_at: null, duration_minutes: null }
const attempt = { id: 't', assessment_id: 'a', status: 'in_progress', submitted_at: null }
assert.equal(checkpointState(assessment, undefined, { now }).state, 'available')
assert.equal(checkpointState(assessment, attempt, { now }).state, 'in_progress')
for (const fields of [{ status: 'scheduled' }, { opens_at: '2026-09-09T12:00:00Z' }, { closes_at: '2026-09-07T12:00:00Z' }, { status: 'grading' }, { status: 'released' }]) {
  assert.equal(checkpointState({ ...assessment, ...fields }, attempt, { now }).state, 'locked')
}
assert.equal(checkpointState({ ...assessment, closes_at: '2026-09-08T12:00:00Z' }, attempt, { now }).state, 'in_progress')
assert.equal(checkpointState(assessment, { ...attempt, status: 'invalidated' }, { now }).href, undefined)
assert.equal(isSubmitted({ ...attempt, status: 'invalidated' }), false)
assert.equal(isSubmitted({ ...attempt, status: 'late' }), true)
assert.equal(checkpointState(assessment, { ...attempt, status: 'submitted' }, { now }).href, '/learner/progress')
assert.equal(checkpointState({ ...assessment, status: 'released' }, { ...attempt, status: 'submitted' }, { now }).href, '/learner/results/t')
assert.equal(checkpointState(assessment, undefined, { now, canTake: false }).label, 'Cohort completed')
assert.equal(checkpointState({ ...assessment, status: 'released' }, { ...attempt, status: 'submitted' }, { now, canTake: false }).href, '/learner/results/t')

assert.deepEqual(retainedLearnerMembershipStatuses, ['active', 'completed'])
assert.deepEqual(attachLearnerMembershipStatus(
  [{ id: 'active', name: 'Active' }, { id: 'completed', name: 'Completed' }, { id: 'other', name: 'Other' }],
  [{ cohort_id: 'active', status: 'active' }, { cohort_id: 'completed', status: 'completed' }],
), [
  { id: 'active', name: 'Active', membership_status: 'active' },
  { id: 'completed', name: 'Completed', membership_status: 'completed' },
])

const data = { name: null, cohorts: [{ id: 'c', name: 'Cohort', membership_status: 'active' }], assessments: [assessment], attempts: [], sessions: [{ id: 's', cohort_id: 'c', title: 'Session', status: 'live' }], attendance: [] }
assert.equal(nextJourneyAction(data, now).href, '/assessments/a/take')
assert.equal(nextJourneyAction({ ...data, assessments: [] }, now).href, '/learner/sessions/s')
assert.equal(nextJourneyAction({ ...data, assessments: [], sessions: [] }, now).href, '/learner/progress')
assert.equal(nextJourneyAction({ ...data, cohorts: [], assessments: [], sessions: [] }, now).href, '/learner/orientation')
const completedHistory = { ...data, cohorts: [{ id: 'c', name: 'Completed cohort', membership_status: 'completed' }] }
assert.equal(nextJourneyAction(completedHistory, now).href, '/learner/progress')
const mixedJourney = {
  ...completedHistory,
  cohorts: [...completedHistory.cohorts, { id: 'current', name: 'Current cohort', membership_status: 'active' }],
  sessions: [...completedHistory.sessions, { id: 'current-session', cohort_id: 'current', title: 'Current session', status: 'live' }],
}
assert.equal(nextJourneyAction(mixedJourney, now).href, '/learner/sessions/current-session')

const multipleItem = { question_version_id: 'multiple', question_type: 'multiple_response', options: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }
let formData = new FormData()
assert.deepEqual(assessmentResponseValues(multipleItem, formData), { selected_option_id: null, selected_option_ids: [], text_response: null })
assert.deepEqual(assessmentResponseRows([multipleItem], formData, 'attempt'), [{
  attempt_id: 'attempt',
  question_version_id: 'multiple',
  selected_option_id: null,
  selected_option_ids: [],
  text_response: null,
}])
formData.append('q_multiple', 'b')
assert.deepEqual(assessmentResponseValues(multipleItem, formData), { selected_option_id: null, selected_option_ids: ['b'], text_response: null })
formData.append('q_multiple', 'a')
assert.deepEqual(assessmentResponseValues(multipleItem, formData), { selected_option_id: null, selected_option_ids: ['a', 'b'], text_response: null })
formData.append('q_multiple', 'b')
assert.deepEqual(assessmentResponseValues(multipleItem, formData), { selected_option_id: null, selected_option_ids: ['a', 'b'], text_response: null })
assert.deepEqual(assessmentResponseRows([multipleItem], formData, 'attempt'), [{
  attempt_id: 'attempt',
  question_version_id: 'multiple',
  selected_option_id: null,
  selected_option_ids: ['a', 'b'],
  text_response: null,
}])
formData = new FormData()
formData.append('q_multiple', 'not-delivered')
assert.throws(() => assessmentResponseValues(multipleItem, formData), InvalidAssessmentResponse)

const singleItem = { ...multipleItem, question_version_id: 'single', question_type: 'single_best_answer' }
formData = new FormData()
assert.equal(assessmentResponseValues(singleItem, formData), null)
formData.append('q_single', 'c')
assert.deepEqual(assessmentResponseValues(singleItem, formData), { selected_option_id: 'c', selected_option_ids: null, text_response: null })
formData.append('q_single', 'a')
assert.throws(() => assessmentResponseValues(singleItem, formData), InvalidAssessmentResponse)

formData = new FormData()
formData.append('q_written', '  Clinical reasoning  ')
assert.deepEqual(assessmentResponseValues({ question_version_id: 'written', question_type: 'structured_written', options: [] }, formData), {
  selected_option_id: null,
  selected_option_ids: null,
  text_response: 'Clinical reasoning',
})
formData = new FormData()
formData.append('q_short', '  Probability first, then test.  ')
assert.deepEqual(assessmentResponseValues({ question_version_id: 'short', question_type: 'short_answer', options: [] }, formData), {
  selected_option_id: null,
  selected_option_ids: null,
  text_response: 'Probability first, then test.',
})
const mixedForm = new FormData()
mixedForm.append('q_single', 'a')
mixedForm.append('q_multiple', 'c')
assert.deepEqual(assessmentResponseRows([singleItem, multipleItem], mixedForm, 'attempt'), [
  { attempt_id: 'attempt', question_version_id: 'single', selected_option_id: 'a', selected_option_ids: null, text_response: null },
  { attempt_id: 'attempt', question_version_id: 'multiple', selected_option_id: null, selected_option_ids: ['c'], text_response: null },
])
mixedForm.append('q_multiple', 'not-delivered')
assert.throws(() => assessmentResponseRows([singleItem, multipleItem], mixedForm, 'attempt'), InvalidAssessmentResponse)

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

const [scratchpadSource, reasoningToolSource, liveMissionSource, toolChannelMigration, assessmentV2Migration, analyticsMigration, assessmentExperienceSource, analyticsPageSource] = await Promise.all([
  readFile(new URL('../src/components/the-ten/mission-scratchpad.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/the-ten/mission-reasoning-tool.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/the-ten/live-mission.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260908232400_ten_tool_realtime_channel.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260909072000_ten_assessment_architecture_v2.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260909074500_ten_program_analytics_v1.sql', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/the-ten/assessment-experience.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/programs/[programId]/analytics/page.tsx', import.meta.url), 'utf8'),
])
assert.match(scratchpadSource, /supabase\.channel\(`ten-tool:\$\{initial\.id\}`/)
assert.doesNotMatch(scratchpadSource, /supabase\.channel\(`ten:\$\{initial\.id\}`/)
assert.match(reasoningToolSource, /supabase\.channel\(`ten-tool:\$\{initial\.id\}`/)
assert.doesNotMatch(reasoningToolSource, /supabase\.channel\(`ten:\$\{initial\.id\}`/)
assert.match(liveMissionSource, /supabase\.channel\(`ten:\$\{initial\.id\}`/)
assert.doesNotMatch(liveMissionSource, /supabase\.channel\(`ten-tool:\$\{initial\.id\}`/)
assert.match(toolChannelMigration, /realtime\.send\(state_payload, 'state', 'ten-tool:' \|\| new\.id::text, true\)/)

for (const code of ['TEN-LO-01','TEN-LO-10','TEN-RUB-REP','TEN-RUB-EVID','TEN-RUB-TEST','TEN-RUB-SAFE','TEN-CRQ-PRE-01','TEN-CRQ-PRE-04','TEN-CRQ-POST-01','TEN-CRQ-POST-04']) {
  assert.match(assessmentV2Migration, new RegExp(code))
}
assert.match(assessmentV2Migration, /duration_minutes=30/)
assert.match(assessmentV2Migration, /'short_answer'/)
assert.match(assessmentExperienceSource, /PART II · GENERATE, DON’T RECOGNIZE/)
assert.match(assessmentExperienceSource, /Human-reviewed rubrics/)
assert.match(analyticsMigration, /create or replace function public\.ten_program_analytics/)
assert.match(analyticsMigration, /revoke all on function public\.ten_program_analytics\(uuid\) from public, anon/)
assert.match(analyticsMigration, /private\.has_program_role\(target_program_id, array\['program_director','assessment_lead'\]\)/)
assert.match(analyticsPageSource, /Reasoning Signals/)
assert.match(analyticsPageSource, /Interpretation boundary/)

console.log('THE TEN: cohort-history/current-mission separation, checkpoint gates, mixed-format assessment normalization, assessment-v2/rubric wiring, feedback integrity, retry, duplicate-submit, released-score, analytics authorization scaffolding and isolated supplemental realtime-channel checks passed.')
