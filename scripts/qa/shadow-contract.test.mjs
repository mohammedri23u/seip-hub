import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'

const source = readFileSync(new URL('../../src/lib/ai/shadow-contract.ts', import.meta.url), 'utf8')
const { syntheticShadowInput: input, syntheticShadowOutput: fixture, validateShadowOutput: validate } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source, { mode: 'transform' })).toString('base64')}`)
const copy = () => JSON.parse(JSON.stringify(fixture))
let checks = 0
function check(label, output, valid) { assert.equal(validate(output, input).valid, valid, label); checks++; console.log('PASS', label) }
check('Synthetic scored result matches contract and exact evidence', copy(), true)
for (const score of [-1, 3, 1.5, '2', null]) check(`Reject invalid scored value ${String(score)}`, { ...copy(), proposed_score: score }, false)
check('Reject response ID mismatch', { ...copy(), response_id: 'OTHER' }, false)
check('Reject invented evidence', { ...copy(), evidence_quotes: ['words never present in the response'] }, false)
check('Reject missing evidence for positive score', { ...copy(), evidence_quotes: [] }, false)
check('Reject missing evidence for a nonblank zero score', { ...copy(), proposed_score: 0, evidence_quotes: [] }, false)
check('Reject scored reason string instead of null', { ...copy(), reason_for_abstention: '' }, false)
check('Reject feedback beyond 1200 characters', { ...copy(), draft_feedback: 'x'.repeat(1201) }, false)
check('Reject duplicate criterion', { ...copy(), matched_criteria: ['REVISE', 'REVISE'] }, false)
check('Reject unknown criterion', { ...copy(), matched_criteria: ['OTHER'] }, false)
check('Reject matched and missing overlap', { ...copy(), missing_criteria: ['REVISE'] }, false)
check('Reject unknown review flag', { ...copy(), review_flags: ['AUTOMATIC_APPROVAL'] }, false)
check('Reject extra human score field', { ...copy(), human_score: 2 }, false)
const missing = copy(); delete missing.draft_feedback; check('Reject missing contract field', missing, false)
check('Abstain with null and reason remains unscored', { ...copy(), status: 'abstain', proposed_score: null, evidence_quotes: [], matched_criteria: [], reason_for_abstention: 'Ambiguous answer; human review required.' }, true)
check('Abstention must never become zero', { ...copy(), status: 'abstain', proposed_score: 0, reason_for_abstention: 'Unreadable' }, false)
check('Abstention requires a reason', { ...copy(), status: 'abstain', proposed_score: null }, false)
for (const raw of [null, [], 'text']) check('Reject non-object result', raw, false)
const route = readFileSync(new URL('../../src/app/classroom/ai/page.tsx', import.meta.url), 'utf8')
assert(route.includes('await requireClassroomTeacher()'))
const client = readFileSync(new URL('../../src/components/classroom/ai-workbench.tsx', import.meta.url), 'utf8')
assert(!/\bfetch\s*\(|OPENAI_API_KEY|service_role|supabase\./.test(client), 'Synthetic browser rehearsal cannot call providers or database')
console.log(`${checks} parser checks and teacher/browser boundary checks passed`)
