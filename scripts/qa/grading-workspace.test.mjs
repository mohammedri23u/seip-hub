import assert from 'node:assert/strict'
import { weightedScore, gradingSummary, normaliseSearch } from '../../src/lib/assessment/grading-workspace.ts'
const item = (overrides = {}) => ({ marks: 1, final_score: null, final_max: null, machine_score: null, machine_max: null, review_score: null, review_max: null, calculated_mcq: null, moderation_required: false, ...overrides })
let passed = 0
function check(name, fn) { fn(); passed++; console.log('PASS', name) }
check('raw rubric score is scaled exactly once', () => assert.equal(weightedScore(3, 6, 2), 1))
check('zero is a scored answer, not a missing score', () => assert.equal(weightedScore(0, 1, 1), 0))
check('missing remains unknown', () => assert.equal(weightedScore(null, 2, 2), null))
check('invalid denominator rejected', () => assert.equal(weightedScore(1, 0, 1), null))
check('score over maximum rejected', () => assert.equal(weightedScore(3, 2, 2), null))
check('nonfinite rejected', () => assert.equal(weightedScore(NaN, 2, 2), null))
check('negative score rejected', () => assert.equal(weightedScore(-1, 2, 2), null))
check('unreviewed written answers block final total', () => { const s = gradingSummary([item()]); assert.equal(s.pending, 1); assert.equal(s.complete, false) })
check('submitted review is provisional, not final', () => { const s = gradingSummary([item({ review_score: 1, review_max: 1 })]); assert.equal(s.known, 1); assert.equal(s.awaitingApproval, 1); assert.equal(s.complete, false) })
check('micro 3 MCQs and one human grade', () => { const s = gradingSummary([item({ machine_score: 1, machine_max: 1 }),item({ machine_score: 0, machine_max: 1 }),item({ machine_score: 1, machine_max: 1 }),item({ final_score: 1, final_max: 1 })]); assert.equal(s.approved, 3); assert.equal(s.max, 4); assert.equal(s.complete, true) })
check('final beats earlier review without double counting', () => { const s = gradingSummary([item({ final_score: 1, final_max: 1, review_score: 0, review_max: 1 })]); assert.equal(s.known, 1); assert.equal(s.recorded, 1) })
check('moderation blocks complete status', () => assert.equal(gradingSummary([item({ final_score: 1, final_max: 1, moderation_required: true })]).complete, false))
check('calculated but unrecorded MCQ remains provisional', () => { const s = gradingSummary([item({ calculated_mcq: 1 })]); assert.equal(s.complete, false); assert.equal(s.awaitingApproval, 1) })
check('empty test cannot be finalized', () => assert.equal(gradingSummary([]).complete, false))
check('Arabic search normalizes hamza diacritics and tatweel', () => assert.equal(normaliseSearch('أَحــمَد'), 'احمد'))
console.log(`${passed}/${passed} grading calculation checks passed`)
