'use client'

// Materialized temporarily by review-ui.mjs; never a deployed application route.
import { useState, type ComponentProps } from 'react'
import { ArrivalExperience } from '@/components/the-ten/arrival-experience'
import { GuideSelection } from '@/components/the-ten/guide-selection'
import { JourneyWorld } from '@/components/the-ten/journey-world'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { StoryPlayer } from '@/components/the-ten/experience/story-player'
import { SignalActivation } from '@/components/the-ten/experience/signal-activation'
import { LiveMission } from '@/components/the-ten/live-mission'
import { createMissionPrelude, createMissionEpilogue } from '@/lib/the-ten/experience'
import type { JourneySummary, TenCatalog } from '@/lib/the-ten/runtime'

const mission = { id: 'M01', title: 'The unconnected observations', mentor: 'Al-Razi', mentor_title: 'The Empiricist', lens: 'Question the assumption. Return to the evidence.', focus: 'Connect what is known before deciding what it means.', duration: null, premise: 'A path through the city waits for a careful observer.', signalIndex: 1, published: true }
const summary: JourneySummary = { enrolled: true, mission_completed_count: 1, mission_required_count: 4, next_stage: 'missions', missions: [mission, {...mission,id:'M02',title:'A second perspective'}, {...mission,id:'M03',title:'The next connection'}, {...mission,id:'M04',title:'A path still quiet'}].map((m,i)=>({...m,position:i+1,completed:i===0})) }
const catalog: TenCatalog = { missions: [mission], runs: [{id:'review-only',session_id:'review-only',mission_id:'M02',title:null,phase:'waiting',join_code:null,manager:false}], signals:1,staff:false,admin:false }
const episode = { runId:'review-only',missionId:'M01',title:mission.title,mentor:mission.mentor,lens:mission.lens,focus:mission.focus,guardian:'al-razi' as const,guide:'ibn-sina' as const }
const snapshot: ComponentProps<typeof LiveMission>['initial'] = {id:'review-only',revision:1,phase:'commit_open',stage_index:0,stage_count:6,title:mission.title,mission_id:'M01',mentor:mission.mentor,lens:mission.lens,focus:mission.focus,manager:false,responses:[],participants:12,count:0,initial_count:0,stage:{id:'review-stage',label:'Observation',pptText:'The available observations do not yet form a complete picture. Two accounts describe the same change differently. Only the information shown here has been released.',studentTask:'Which reasoning step would you take next?',responseType:'single_choice',options:['Compare the available observations','Commit to the first interpretation','Wait without reviewing the evidence'],collectConfidence:true}}
const noop = async () => {}
export default function ReviewPage() {
  const [view,setView] = useState('arrival')
  const [notice,setNotice] = useState('')
  return <><nav aria-label="Local fixture review" style={{position:'relative',zIndex:100,background:'#fffdf8',color:'#17363a',display:'flex',flexWrap:'wrap',gap:8,padding:8,fontSize:12}}>{['arrival','guide','world','prelude','reasoning','locked','reveal','activation','epilogue'].map(v=><button key={v} onClick={()=>{setView(v);setNotice('')}} style={{minHeight:44,padding:8,textDecoration:v===view?'underline':'none'}}>{v}</button>)}<span>{notice}</span></nav>
    {view==='arrival' && <ArrivalExperience completeAction={async()=>setView('guide')} progressAction={noop}/>}
    {view==='guide' && <GuideSelection chooseAction={async()=>setNotice('Fixture: Guide bond submitted')}/>}
    {view==='world' && <LearnerShell immersive title="Baghdad"><JourneyWorld summary={summary} catalog={catalog} experience={{enrolled:true,guide_key:'ibn-sina'}}/></LearnerShell>}
    {view==='prelude' && <StoryPlayer story={createMissionPrelude(episode)} onComplete={async()=>setView('reasoning')}/>}
    {['reasoning','locked','reveal'].includes(view) && <LiveMission key={view} initial={{...snapshot,phase:view==='reveal'?'reveal':view==='locked'?'commit_locked':'commit_open',responses:view==='locked'?[{stage_index:0,round:1,payload:{choice:0},confidence:3,justification:'Compare the observations first.'}]:[],stage:{...snapshot.stage,...(view==='reveal'?{answer:0,feedback:'Compare the available evidence before committing to an interpretation.',expectedReasoning:'Keep observation separate from inference. State what would change your interpretation.'}:{})}}} initialExperience={{guide_key:'ibn-sina'}}/>}
    {view==='activation' && <SignalActivation signalNumber={2} guideKey="ibn-sina" onContinue={async()=>setView('epilogue')}/>}
    {view==='epilogue' && <StoryPlayer story={createMissionEpilogue(episode)} onComplete={async()=>setView('world')}/>}
  </>
}
