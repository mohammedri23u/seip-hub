import assert from 'node:assert/strict'
import { attemptLabel, snapshotScore, isCompleteSubmission, isClosedEmpty } from '../../src/lib/assessment/attempt-status.ts'
const empty={status:'submitted',completion_kind:'timed_out_empty',answered_items:0,total_items:4,known_score:null,final_score:null,max_score:4}
let count=0
function test(name,fn){fn();count++;console.log('PASS',name)}
test('timeout with no responses is not completed',()=>assert.equal(isCompleteSubmission(empty),false))
test('timeout empty is identified explicitly',()=>assert.equal(isClosedEmpty(empty),true))
test('no responses do not receive a numeric zero',()=>assert.match(snapshotScore(empty),/لا توجد درجة/))
test('partial submission is not completed',()=>assert.equal(isCompleteSubmission({...empty,completion_kind:'timed_out_partial',answered_items:3}),false))
test('full submitted form is completed',()=>assert.equal(isCompleteSubmission({...empty,completion_kind:'submitted_complete',answered_items:4}),true))
test('full timed form is completed only with complete evidence',()=>assert.equal(isCompleteSubmission({...empty,completion_kind:'timed_out_complete',answered_items:4}),true))
test('ungraded written answers remain pending',()=>assert.equal(snapshotScore({...empty,answered_items:4}),'بانتظار التصحيح البشري'))
test('real score zero remains visible',()=>assert.match(snapshotScore({...empty,answered_items:3,known_score:0}),/^0 \/ 4/))
test('partial score is visibly partial',()=>assert.match(snapshotScore({...empty,answered_items:3,known_score:1}),/جزئي/))
test('final grade of zero remains final',()=>assert.match(snapshotScore({...empty,answered_items:4,final_score:0}),/^0 \/ 4 — معتمدة/))
test('in-progress scores never exposed',()=>assert.equal(snapshotScore({...empty,status:'in_progress',answered_items:3,known_score:3}),'غير متاحة قبل التسليم'))
test('no attempt means not started',()=>assert.equal(attemptLabel(undefined),'لم يبدأ بعد'))
console.log(`${count}/12 attempt-status checks passed`)
