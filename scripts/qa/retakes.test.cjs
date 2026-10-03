const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { transformSync } = require('next/dist/build/swc')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const root = path.resolve(__dirname, '../..')
for (const ext of ['.tsx', '.ts']) require.extensions[ext] = (module, filename) => {
 const { code } = transformSync(fs.readFileSync(filename, 'utf8'), { filename, jsc: { parser: { syntax: 'typescript', tsx: filename.endsWith('.tsx') }, target: 'es2022', transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } })
 module._compile(code, filename)
}
const { AssessmentRetakeBanner } = require(path.join(root, 'src/components/the-ten/assessment-retake-notice.tsx'))
const { retakeTarget, isLegacyRetakeForm } = require(path.join(root, 'src/lib/assessment/retakes.ts'))
const { attemptLabel, isCompleteSubmission, snapshotScore } = require(path.join(root, 'src/lib/assessment/attempt-status.ts'))
const n = { required:true, pre_assessment_id:'11111111-1111-4111-8111-111111111111', post_assessment_id:'22222222-2222-4222-8222-222222222222', previous_pre_assessment_id:'33333333-3333-4333-8333-333333333333', previous_post_assessment_id:'44444444-4444-4444-8444-444444444444', requested_at:'2026-10-03T00:00:00Z', policy_code:'test' }
const archived = { completion_kind:'superseded_legacy', superseded_by_retake:true, status:'invalidated', answered_items:15,total_items:15,final_score:null,known_score:null,max_score:30 }
const render = notice => renderToStaticMarkup(React.createElement(AssessmentRetakeBanner,{notice,link:true}))
let passed=0
function test(name,fn){fn();passed++;console.log('PASS',name)}
test('Unaffected learners do not see a retake notice',()=>assert.equal(render(null),''))
test('Completed replacement does not continue asking for a retake',()=>assert.equal(render({...n,required:false}),''))
test('Required retake explains the four-item untimed format',()=>{const h=render(n);assert.match(h,/3 MCQs/);assert.match(h,/VSAQ/);assert.match(h,/بدون توقيت إجباري/)})
test('Required retake links to the assigned new form',()=>assert.match(render(n),new RegExp('/assessments/'+n.pre_assessment_id+'/take')))
test('Old form has no launch link in the retake banner',()=>assert.doesNotMatch(render(n),new RegExp('/assessments/'+n.previous_pre_assessment_id+'/take')))
test('Invalid target cannot produce a navigation URL',()=>assert.equal(retakeTarget({...n,pre_assessment_id:'javascript:alert(1)'}),null))
test('Both original forms are recognized as retired',()=>{assert.equal(isLegacyRetakeForm(n.previous_pre_assessment_id,n),true);assert.equal(isLegacyRetakeForm(n.previous_post_assessment_id,n),true)})
test('Current form is not retired',()=>assert.equal(isLegacyRetakeForm(n.pre_assessment_id,n),false))
test('Unrelated form is not retired',()=>assert.equal(isLegacyRetakeForm('55555555-5555-4555-8555-555555555555',n),false))
test('Archive label does not imply student misconduct',()=>assert.match(attemptLabel(archived),/مؤرشفة/))
test('Complete historical answers do not complete the current test',()=>assert.equal(isCompleteSubmission(archived),false))
test('Archive does not silently contribute a zero score',()=>assert.equal(snapshotScore(archived),'محاولة مؤرشفة — لا تدخل الدرجة الحالية'))
test('Defensive archive flag prevents old completion counting',()=>assert.equal(isCompleteSubmission({...archived,completion_kind:'submitted_complete'}),false))
test('Actual current submission remains complete',()=>assert.equal(isCompleteSubmission({...archived,superseded_by_retake:false,completion_kind:'submitted_complete',status:'submitted'}),true))
console.log(`${passed}/${passed} retake rendering and status checks passed`)
