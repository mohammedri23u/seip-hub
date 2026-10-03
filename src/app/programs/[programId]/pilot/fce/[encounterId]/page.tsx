import Link from 'next/link'
import {notFound} from 'next/navigation'
import {AppShell} from '@/components/app-shell'
import {requireProgramRole} from '@/lib/auth/require-program-role'
import {rate} from '../actions'
const field='mt-2 block w-full rounded-xl border p-3'
export default async function Encounter({params,searchParams}:{params:Promise<{programId:string;encounterId:string}>;searchParams:Promise<{error?:string;saved?:string}>}) {
 const {programId,encounterId}=await params;const query=await searchParams
 const {supabase,userId,role}=await requireProgramRole(programId,['program_director','assessment_lead','reviewer'])
 const {data:e}=await supabase.from('fce_encounters').select('*').eq('id',encounterId).maybeSingle();if(!e)notFound()
 const {data:s}=await supabase.from('fce_stations').select('*').eq('id',e.station_id).eq('program_id',programId).maybeSingle();if(!s)notFound()
 const [{data:ratings},{data:moderation}]=await Promise.all([supabase.from('fce_ratings').select('*').eq('encounter_id',e.id),supabase.from('fce_moderations').select('*').eq('encounter_id',e.id).maybeSingle()])
 const own=ratings?.find(r=>r.examiner_id===userId)
 const assigned=e.examiner_id===userId||e.second_examiner_id===userId
 const domains=s.examiner_package.domains as Record<string,string>
 function scores(){return Object.entries(domains).map(([code,label])=><label key={code} className="block rounded-xl border p-4"><strong>{code}</strong> · {label}<select name={code} required defaultValue="" className={field}><option value="" disabled>Select 0–2</option>{[0,1,2].map(v=><option key={v} value={v}>{v}</option>)}</select></label>)}
 return <AppShell eyebrow="THE TEN · BLINDED PERFORMANCE RATING" title={s.code+' · '+s.title} actions={<Link href={`/programs/${programId}/pilot/fce`}>FCE queue</Link>}>
 {query.error&&<p role="alert">Rating blocked. Check completeness, assignment and previous submission.</p>}{query.saved&&<p role="status">Rating saved. Original independent scores are retained.</p>}
 <p className="my-5">Encounter {e.id.slice(0,8)} · SP {e.sp_code} · Station version {s.version}. Written assessment results and AB/BA allocation are hidden.</p>
 <details className="rounded-xl border bg-white p-5"><summary className="font-bold">Station-specific examiner script, findings and anchors</summary><p className="whitespace-pre-wrap leading-7">{s.examiner_package.source_text}</p></details>
 {assigned&&!own&&!moderation&&<form action={rate.bind(null,programId,e.id,false)} className="my-6 space-y-4 rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Independent examiner score</h2><p>{s.examiner_package.anchor}</p><div className="grid gap-4 md:grid-cols-2">{scores()}</div><label>Global Integrated Reasoning Rating (separate)<select name="global" required defaultValue="" className={field}><option value="" disabled>Select</option>{[1,2,3,4,5].map(v=><option key={v}>{v}</option>)}</select></label><p>{s.examiner_package.global}</p>
 <fieldset><legend>Safety / professionalism flags</legend>{['unsafe_examination','consent_not_respected','patient_discomfort','fabricated_finding'].map(f=><label className="mr-5 inline-flex gap-2" key={f}><input type="checkbox" name="flags" value={f}/>{f.replaceAll('_',' ')}</label>)}</fieldset>
 <label>Protocol deviation / safety note<textarea name="deviation" className={field}/></label><div className="grid gap-4 sm:grid-cols-2"><label>Observed encounter seconds<input name="observed" required type="number" min="0" max="3600" className={field}/></label><label>Post-encounter seconds<input name="post" required type="number" min="0" max="3600" className={field}/></label></div><button className="ten-button-primary">Commit independent rating</button></form>}
 <section className="my-6 space-y-3"><h2 className="font-bold">Recorded ratings {role==='reviewer'?'(your rating only)':''}</h2>{ratings?.map(r=><div className="rounded-xl border bg-white p-5" key={r.id}><p>Rater {r.examiner_id===userId?'you':r.examiner_id.slice(0,8)} · Total {Object.values(r.scores as Record<string,number>).reduce((a,b)=>a+b,0)}/20 · Global {r.global_rating}/5</p><p>{Object.entries(r.scores).map(([k,v])=>k+': '+v).join(' · ')}</p><p>Flags: {r.safety_flags.join(', ')||'None recorded'}</p><p>{r.deviation_note}</p></div>)}</section>
 {role!=='reviewer'&&!moderation&&<form action={rate.bind(null,programId,e.id,true)} className="space-y-4 rounded-xl border bg-white p-6"><h2 className="font-bold">Human moderation</h2><p>All assigned raters must submit first. Original ratings and safety flags remain intact for IRR analysis.</p><div className="grid gap-4 md:grid-cols-2">{scores()}</div><label>Resolution rationale<textarea name="reason" required minLength={10} className={field}/></label><button className="ten-button-primary">Commit moderation</button></form>}
 {moderation&&<p className="rounded-xl bg-emerald-50 p-5">Moderation recorded: {moderation.rationale}. No pass/fail decision is implied.</p>}
 </AppShell>
}
