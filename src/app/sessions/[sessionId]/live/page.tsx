import { programMembership } from '@/lib/auth/program-membership'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {AppShell} from '@/components/app-shell'
import {requireUser} from '@/lib/auth/require-user'
import {join,advance,vote,closeout,attendance} from './actions'
const input='mt-2 block w-full rounded-xl border p-3'
const keys=['progressive_disclosure','ask_commitment','examine_commitment','hypothesis_driven_pe','pertinent_negatives','problem_representation','ranked_differential','investigation_question','diagnostic_updating','transfer_case','reduced_scaffolding','reveal_timing','scope_preserved','timing','incidents_documented']
export default async function Live({params,searchParams}:{params:Promise<{sessionId:string}>;searchParams:Promise<{error?:string}>}){
 const {sessionId}=await params;const query=await searchParams;const {supabase,userId}=await requireUser()
 const {data:session}=await supabase.from('sessions').select('id,title,cohort_id,join_code').eq('id',sessionId).maybeSingle();if(!session)notFound()
 const {data:cohort}=await supabase.from('cohorts').select('program_id').eq('id',session.cohort_id).single();if(!cohort)notFound()
 const [{data:staff},{data:admin},{data:fac}]=await Promise.all([
 programMembership(supabase, cohort.program_id, userId),
 supabase.from('platform_admins').select('user_id').eq('user_id',userId).maybeSingle(),
 supabase.from('session_facilitators').select('user_id').eq('session_id',sessionId).eq('user_id',userId).maybeSingle()])
 const manager=Boolean(admin||fac||staff?.role==='program_director')
 const {data:run}=await supabase.from('live_session_runs').select('id,status').eq('session_id',sessionId).in('status',['lobby','live','paused']).order('created_at',{ascending:false}).limit(1).maybeSingle()
 const {data:activities}=run?await supabase.from('live_activities').select('*').eq('run_id',run.id).order('position'):{data:[]}
 const ids=activities?.map(a=>a.id)??[]
 const [{data:rounds},{data:options},{data:answers}]=ids.length?await Promise.all([
 supabase.from('live_activity_rounds').select('*').in('activity_id',ids),
 supabase.from('live_activity_options').select('*').in('activity_id',ids).order('position'),
 supabase.from('live_activity_answer_keys').select('activity_id,model_answer,explanation,correct_option_id').in('activity_id',ids)]):[{data:[]},{data:[]},{data:[]}]
 const {data:responses}=rounds?.length?await supabase.from('live_activity_responses').select('round_id,learner_id,option_id,text_response').in('round_id',rounds.map(r=>r.id)):{data:[]}
 const [{data:learners},{data:recorded},{data:closed}]=manager?await Promise.all([
 supabase.from('cohort_memberships').select('user_id').eq('cohort_id',session.cohort_id).eq('member_type','learner').eq('status','active'),
 supabase.from('attendance_records').select('learner_id,status').eq('session_id',sessionId),
 supabase.from('session_closeouts').select('*').eq('session_id',sessionId).maybeSingle()]):[{data:[]},{data:[]},{data:null}]
 return <AppShell eyebrow="THE TEN · LIVE TEACHING" title={session.title} actions={<Link href={`/sessions/${sessionId}/live`} className="ten-text-link">Refresh room</Link>}>
 {query.error&&<p role="alert" className="my-4 rounded-xl bg-rose-50 p-4">Action blocked. Check room state, membership and whether a response is already committed.</p>}
 {!manager&&<form action={join.bind(null,sessionId)} className="my-5 flex flex-wrap items-end gap-4"><label>Session join code<input name="code" required className={input}/></label><button className="ten-button-primary">Join live session</button></form>}
 {manager&&<section className="my-5 rounded-xl bg-amber-50 p-5"><h2 className="font-bold">Facilitator brief</h2><p>Preserve the fixed reasoning cycle. Ask which missing information has the highest value; link each Physical Examination manoeuvre to a hypothesis. Collect individual commitments before discussion. For Peer Instruction, close vote 1 → discuss → open vote 2 → close → reveal. For Diagnostic Updating, require an explicit change in ranked hypotheses and why. Use the item-specific expected reasoning below. Avoid advanced untaught management detail.</p><p className="mt-3">Join code: <strong>{session.join_code}</strong>. Completing these supplementary activities does not automatically award a Mission Signal.</p></section>}
 <div className="space-y-5">{activities?.map(a=>{
 const round=rounds?.find(r=>r.activity_id===a.id&&r.round_number===a.current_round)
 const own=responses?.find(r=>r.round_id===round?.id&&r.learner_id===userId)
 const key=answers?.find(k=>k.activity_id===a.id)
 const opts=options?.filter(o=>o.activity_id===a.id)??[]
 const commands=a.status==='draft'?['open_round_1']:a.status==='open'?['close_responses']:a.status==='discussion'?(a.activity_type==='peer_instruction'&&a.current_round===1?['open_round_2']:['reveal']):a.status==='revealed'?['close_activity']:[]
 return <article key={a.id} className="rounded-2xl border bg-white p-6"><p className="text-sm">{a.position} · {a.activity_type.replaceAll('_',' ')} · {a.status} · Round {a.current_round}</p><h2 className="mt-2 text-xl font-bold">{a.title}</h2><p className="my-4 whitespace-pre-wrap leading-7">{a.stem}</p>
 {manager?<><p>Responses this round: {responses?.filter(r=>r.round_id===round?.id).length??0}</p><form action={advance.bind(null,sessionId,a.id)} className="my-3 flex flex-wrap gap-3">{commands.map(c=><button className="ten-button-primary" key={c} name="command" value={c}>{c.replaceAll('_',' ')}</button>)}</form></>:round?.status==='open'&&!own?<form action={vote.bind(null,sessionId,round.id)} className="space-y-3">{opts.map(o=><label className="flex gap-3 rounded-xl border p-3" key={o.id}><input type="radio" name="option" value={o.id} required/>{o.option_text}</label>)}<label>{opts.length?'Brief reasoning (optional)':'Updated hypothesis and supporting evidence'}<textarea name="reasoning" required={!opts.length} className={input}/></label><button className="ten-button-primary">Commit response</button></form>:<p>{own?'Your response is committed for this round.':'Wait for the facilitator, then refresh.'}</p>}
 {key&&<details className="mt-4 rounded-xl bg-emerald-50 p-4"><summary>{manager?'Protected expected reasoning / reveal key':'Revealed explanation'}</summary><p className="whitespace-pre-wrap">{key.model_answer}</p><p className="whitespace-pre-wrap">{key.explanation}</p>{key.correct_option_id&&<p>{opts.find(o=>o.id===key.correct_option_id)?.option_text}</p>}</details>}
 </article>})}</div>
 {manager&&<section className="mt-6 rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Verify attendance</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{learners?.map(l=><form key={l.user_id} action={attendance.bind(null,sessionId,l.user_id)} className="flex flex-wrap items-center gap-3"><span>Learner {l.user_id.slice(0,8)}</span><select aria-label={'Attendance '+l.user_id.slice(0,8)} name="status" defaultValue={recorded?.find(r=>r.learner_id===l.user_id)?.status??'absent'} className="rounded-xl border p-2">{['present','late','absent','excused'].map(s=><option key={s}>{s}</option>)}</select><button className="ten-button-secondary">Save</button></form>)}</div></section>}
 {manager&&!closed&&<form action={closeout.bind(null,sessionId)} className="mt-6 space-y-4 rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Fidelity & closeout</h2><div className="grid gap-3 md:grid-cols-2">{keys.map(k=><label key={k}>{k.replaceAll('_',' ')}<select name={k} required defaultValue="" className={input}><option value="" disabled>Choose observed result</option><option value="yes">Yes</option><option value="no">No / deviation</option></select></label>)}</div><label>Debrief<textarea name="debrief" required minLength={10} className={input}/></label><label>Misconception / error tags (comma separated)<input name="tags" className={input}/></label><label>Fidelity deviations / incidents<textarea name="deviation" className={input}/></label><button className="ten-button-primary">Commit closeout</button></form>}
 {closed&&<p className="mt-5 rounded-xl bg-emerald-50 p-5">Closeout recorded: {closed.debrief}</p>}
 </AppShell>
}
