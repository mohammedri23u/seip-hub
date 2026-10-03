import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const browser=process.env.TEN_BROWSER??'agent-browser'
const output=process.env.TEN_QA_OUTPUT??'/tmp/ten-qa'
const records=[]
function run(...args){return execFileSync(browser,args,{encoding:'utf8',timeout:45000}).trim()}
function evaluate(code){let value=JSON.parse(run('eval',`JSON.stringify(${code})`));return typeof value==='string'?JSON.parse(value):value}
for(const width of [320,390,768,1440]){
 run('set','viewport',String(width),'900')
 run('open','http://127.0.0.1:3000/login')
 run('wait','--fn','Array.from(document.images).every(i=>i.complete && i.naturalWidth>0)')
 const metrics=evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,broken:Array.from(document.images).filter(i=>!i.naturalWidth).length,inputs:Array.from(document.querySelectorAll('input')).map(i=>({type:i.type,autocomplete:i.autocomplete,required:i.required})),overlay:!!document.querySelector('[data-nextjs-dialog]')})`)
 assert.equal(metrics.width,metrics.scrollWidth);assert.equal(metrics.broken,0);assert.equal(metrics.overlay,false)
 run('screenshot','--full',`${output}/login-${width}.png`)
 records.push(metrics)
}
run('snapshot','-i');run('find','role','button','click','--name','Sign in','--exact')
assert.equal(evaluate(`document.querySelector('input[type="email"]').validity.valueMissing`),true)
run('press','Tab')
const focus=evaluate(`({tag:document.activeElement.tagName,name:document.activeElement.getAttribute('name'),outline:getComputedStyle(document.activeElement).outlineWidth})`)
assert.equal(focus.name,'password');assert.notEqual(focus.outline,'0px')
run('open','http://127.0.0.1:3000/login?error=invalid')
assert.ok(run('snapshot').includes('Unable to sign in.'))
writeFileSync(`${output}/entry.json`,JSON.stringify({records,requiredValidation:true,focus,errorPresentation:true},null,2)+'\n')
// Targeted recheck of tablet Guide composition after the responsive correction.
run('open','http://127.0.0.1:3000/ten-ui-review');run('set','viewport','768','900');run('snapshot','-i');run('find','role','button','click','--name','guide','--exact')
run('wait','--fn','Array.from(document.images).filter(i=>i.loading!=="lazy").every(i=>i.complete && i.naturalWidth>0)')
run('screenshot','--full',`${output}/guide-768.png`)
console.log('Login: four widths, native validation, keyboard focus, error display passed; tablet Guide recaptured.')
