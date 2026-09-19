// Browser fixtures only. No authentication or persisted data writes.
// Usage: TEN_BROWSER=/absolute/path/to/agent-browser node scripts/qa/capture-ui.mjs
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
const browser = process.env.TEN_BROWSER ?? 'agent-browser'
const output = process.env.TEN_QA_OUTPUT ?? '/tmp/ten-qa'
mkdirSync(output, {recursive:true})
function run(...args) { return execFileSync(browser,args,{encoding:'utf8',timeout:45000}).trim() }
const records=[]
const views=['arrival','guide','world','prelude','reasoning','locked','reveal','activation','epilogue']
run('network','route','**/rest/v1/**','--abort')
run('network','route','**/auth/v1/**','--abort')
run('open','http://127.0.0.1:3000/ten-ui-review')
for (const width of [320,390,768,1440]) {
  run('set','viewport',String(width),'900')
  for (const view of views) {
    run('snapshot','-i')
    run('find','role','button','click','--name',view,'--exact')
    run('eval','document.querySelectorAll("img").forEach(i=>i.loading="eager")')
    run('wait','--fn','Array.from(document.images).every(i=>i.complete && i.naturalWidth>0)')
    run('wait','--fn','document.getAnimations().filter(a=>a.effect?.getComputedTiming().endTime < 2000).every(a=>a.playState!=="running")')
    let metrics = JSON.parse(run('eval',`JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,brokenImages:Array.from(document.images).filter(i=>!i.naturalWidth).length,headings:Array.from(document.querySelectorAll('h1')).map(h=>h.textContent),overlays:!!document.querySelector('[data-nextjs-dialog]'),smallTargets:Array.from(document.querySelectorAll('main button, main a, main summary')).filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.height<40&&!e.classList.contains('ten-skip')}).map(e=>({text:e.textContent.trim(),height:e.getBoundingClientRect().height}))})`))
    if (typeof metrics === 'string') metrics = JSON.parse(metrics)
    run('screenshot','--full',`${output}/${view}-${width}.png`)
    records.push({view,...metrics})
    console.log(`${view} ${width}: overflow=${metrics.scrollWidth>width}, broken images=${metrics.brokenImages}, small targets=${metrics.smallTargets.length}`)
  }
}
writeFileSync(`${output}/matrix.json`,JSON.stringify(records,null,2)+'\n')
