import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const browser=process.env.TEN_BROWSER??'agent-browser'
const output=process.env.TEN_QA_OUTPUT??'/tmp/ten-qa'
const results=[]
function run(...args){return execFileSync(browser,args,{encoding:'utf8',timeout:45000}).trim()}
function evaluate(code){let value=JSON.parse(run('eval',`JSON.stringify(${code})`));return typeof value==='string'?JSON.parse(value):value}
function click(name){run('snapshot','-i');run('find','role','button','click','--name',name.replace(/\s*[→+−]\s*$/, ''),'--exact')}
function stable(){run('wait','--fn','document.getAnimations().filter(a=>a.effect?.getComputedTiming().endTime < 2000).every(a=>a.playState!=="running")')}
run('network','route','**/rest/v1/**','--abort');run('network','route','**/auth/v1/**','--abort')
for (const reduced of [false,true]) {
 run('set','media','light',...(reduced?['reduced-motion']:[]))
 run('set','viewport',reduced?'320':'390','900')
 run('open','http://127.0.0.1:3000/ten-ui-review')
 for(let i=0;i<9;i++) {
  stable()
  const scene=evaluate(`({title:document.querySelector('main h1')?.textContent,cta:document.querySelector('.ten-story-next')?.textContent.trim(),focus:document.activeElement?.id,width:document.documentElement.scrollWidth,running:document.getAnimations().filter(a=>a.playState==='running').length})`)
  assert.equal(scene.focus,'story-title')
  assert.ok(scene.width<=(reduced?320:390))
  if(reduced)assert.equal(scene.running,0)
  results.push({test:'story',reduced,index:i,...scene})
  run('eval','document.querySelectorAll("img").forEach(i=>i.loading="eager")')
  run('wait','--fn','Array.from(document.images).every(i=>i.complete && i.naturalWidth>0)')
  run('screenshot','--full',`${output}/story-${reduced?'reduced':'normal'}-${i}.png`)
  click(scene.cta)
  // Scene exit deliberately precedes replacement; wait on the actual heading change.
  if(i<8)run('wait','--fn',`document.querySelector('main h1')?.textContent !== ${JSON.stringify(scene.title)}`)
 }
 assert.ok(run('snapshot','-i').includes('A way of seeing.'))
 results.push({test:'arrival-to-guide',reduced,pass:true})
}
// Guide identity and ability are independently selectable on mobile.
for (const name of ['Al-Razi','Jabir ibn Hayyan','Hippocrates','Ibn Sina']) {
 click(name)
 assert.equal(evaluate(`document.querySelector('#guide-name').textContent`),name)
 const cta=evaluate(`document.querySelector('.ten-lens-toggle').textContent.trim()`)
 click(cta)
 assert.equal(evaluate(`document.querySelector('.ten-lens-toggle').getAttribute('aria-expanded')`),'true')
 assert.ok(evaluate(`document.querySelectorAll('.ten-lens-preview li').length`)>=3)
 results.push({test:'guide-selection',name,pass:true})
}
click('Walk with Ibn Sina')
assert.ok(run('snapshot').includes('Fixture: Guide bond submitted'))
click('world')
click('03 The next connection Awaiting facilitator')
assert.equal(evaluate(`document.querySelector('#signal-detail a')===null`),true)
click('01 The unconnected observations Signal restored')
assert.ok(evaluate(`document.querySelector('#signal-detail').textContent`).includes('recorded journey'))
results.push({test:'locked-and-restored-directory',pass:true})
click('reasoning')
run('snapshot','-i');run('find','role','radio','check','--name','Compare the available observations','--exact')
click('60%')
run('snapshot','-i');run('find','label','Why? Give one brief justification','fill','Compare the observations before drawing a conclusion.')
assert.equal(evaluate(`document.querySelector('button[type="submit"]').disabled`),false)
// REST is blocked. Failure must not claim a recorded response or clear the choice.
click('Lock my reasoning')
run('wait','--fn','!!document.querySelector(".ten-mission-error")')
assert.equal(evaluate(`document.querySelector('input[type="radio"]').checked`),true)
assert.equal(evaluate(`document.querySelector('button[type="submit"]').disabled`),false)
results.push({test:'response-validation-and-failure-preserves-choice',pass:true})
click('locked')
run('snapshot','-i');run('find','text','Your recorded reasoning','click','--exact')
assert.ok(evaluate(`document.querySelector('.ten-recorded-response').textContent`).includes('Compare the available observations'))
click('activation');stable()
assert.equal(evaluate(`document.getAnimations().filter(a=>a.playState==='running').length`),0)
click('Continue to the epilogue')
assert.ok(run('snapshot','-i').includes('A connection has been restored.'))
results.push({test:'reduced-activation-to-epilogue',pass:true})
writeFileSync(`${output}/interactions.json`,JSON.stringify(results,null,2)+'\n')
console.log(`${results.length} story / interaction assertions recorded; all passed.`)
