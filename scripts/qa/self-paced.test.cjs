const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { transformSync } = require('next/dist/build/swc')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const root = path.resolve(__dirname, '../..')
// Transpile project TS/TSX in-memory, using the actual installed React renderer.
for (const ext of ['.tsx', '.ts']) require.extensions[ext] = (module, filename) => {
 const { code: outputText } = transformSync(fs.readFileSync(filename, 'utf8'), { filename, jsc: { parser: { syntax: 'typescript', tsx: filename.endsWith('.tsx') }, target: 'es2022', transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } })
 module._compile(outputText, filename)
}
const { MicroAssessmentStep } = require(path.join(root, 'src/components/the-ten/micro-assessment-step.tsx'))
const { attemptLabel, isCompleteSubmission, snapshotScore } = require(path.join(root, 'src/lib/assessment/attempt-status.ts'))
let passed = 0
function test(name, fn) { fn(); passed++; console.log('PASS', name) }
const step = { assessment_id:'fixture', attempt_id:'fixture-attempt', title:'Demo', description:null, duration_minutes:null, answered:0,total:4,position:1,compact_assessment:true,micro_assessment:false,deadline_at:'2000-01-01T00:00:00Z',server_now:'2026-10-02T10:00:00Z',timing_mode:'self_paced',item:{question_version_id:'fixture-q',position:1,marks:1,question_type:'single_best_answer',stem:'Choose the best answer.',hint_ar:'اختر جوابًا واحدًا.',options:[{id:'one',text:'Option one',position:1},{id:'two',text:'Option two',position:2}]}}
const render = s => renderToStaticMarkup(React.createElement(MicroAssessmentStep,{step:s,action:async()=>{}}))
const html=render(step)
const source=fs.readFileSync(path.join(root,'src/components/the-ten/micro-assessment-step.tsx'),'utf8')
test('No timer, automatic finalizer or elapsed-time disabling remains',()=>assert.doesNotMatch(source,/finalizeTimedAssessment|setInterval|remainingMs|role="timer"/))
test('An old expired deadline cannot disable the question fieldset',()=>assert.doesNotMatch(html,/<fieldset[^>]*disabled/))
test('Self-paced instructions are visible',()=>assert.match(html,/There is no time limit/))
test('All provided choices are rendered',()=>assert.equal((html.match(/type="radio"/g)||[]).length,2))
test('Arabic task hint remains visible',()=>assert.match(html,/اختر جوابًا واحدًا/))
test('Reopened attempt explains preservation and resumption',()=>assert.match(render({...step,reopened_at:'2026-10-02T10:04:34Z'}),/أُعيد فتح محاولتك/))
test('VSAQ stays available without a timed fieldset',()=>{ const h=render({...step,position:4,answered:3,item:{...step.item,question_type:'short_answer',options:[]}}); assert.match(h,/<textarea/); assert.doesNotMatch(h,/<fieldset[^>]*disabled/) })
const reopened={completion_kind:'reopened_in_progress',status:'in_progress',answered_items:3,total_items:4,final_score:null,known_score:null,max_score:4}
test('Reopened attempts have an explicit gradebook label',()=>assert.equal(attemptLabel(reopened),'أُعيد فتحها — أكمل بدون توقيت'))
test('Reopened attempts are not reported as completed',()=>assert.equal(isCompleteSubmission(reopened),false))
test('An unfinished reopened attempt gets no invented final zero',()=>assert.equal(snapshotScore(reopened),'غير متاحة قبل التسليم'))
console.log(`${passed}/${passed} self-paced rendering and status checks passed`)
