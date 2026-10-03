import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { requireProgramRole } from '@/lib/auth/require-program-role'
import { schedule } from './actions'
const field='block w-full rounded-xl border p-3 mt-2'
export default async function FCE({params,searchParams}:{params:Promise<{programId:string}>;searchParams:Promise<{error?:string}>}) {
 const {programId}=await params; const query=await searchParams
 const {supabase,role}=await requireProgramRole(programId,['program_director','assessment_lead','reviewer'])
 const [{data:stations},{data:cohorts},{data:raters}]=await Promise.all([
 supabase.from('fce_stations').select('*').eq('program_id',programId).order('code'),
 supabase.from('cohorts').select('id,name').eq('program_id',programId),
 supabase.from('program_memberships').select('user_id,role').eq('program_id',programId).eq('status','active').in('role',['reviewer','assessment_lead','program_director'])])
 const {data:learners}=cohorts?.length?await supabase.from('cohort_memberships').select('cohort_id,user_id').in('cohort_id',cohorts.map(c=>c.id)).eq('member_type','learner').eq('status','active'):{data:[]}
 const {data:encounters}=stations?.length?await supabase.from('fce_encounters').select('*').in('station_id',stations.map(s=>s.id)).order('created_at',{ascending:false}):{data:[]}
 return <AppShell eyebrow="THE TEN · OPTIONAL SECONDARY ASSESSMENT" title="Focused Clinical Encounter" actions={<Link href={`/programs/${programId}/pilot`}>Pilot controls</Link>}>
 <p className="my-5 rounded-xl bg-amber-50 p-4">Production candidate. No pass/fail cut score. Two core stations /20 each; Global Rating 1–5 remains separate. Reserve stations are not established parallel forms. Local SME review, SP rehearsal and examiner calibration remain required.</p>
 {query.error&&<p role="alert">Scheduling was blocked. Check assignments and membership.</p>}
 <div className="grid gap-5 lg:grid-cols-2">{stations?.map(s=><article key={s.id} className="rounded-2xl border bg-white p-5"><h2 className="font-bold">{s.code} · {s.title}</h2><p>{s.core?'Core':'Reserve — not equivalent'} · {s.version} · {s.review_status}</p><p className="mt-3">{s.candidate_instructions}</p><a className="ten-text-link" href={s.source_url}>Source package</a></article>)}</div>
 {role!=='reviewer'&&<form action={schedule.bind(null,programId)} className="my-6 grid gap-4 rounded-2xl border bg-white p-6 sm:grid-cols-2">
 <h2 className="font-bold sm:col-span-2">Schedule encounter / dry run</h2>
 <label>Station<select name="station" required className={field}>{stations?.filter(s=>s.core).map(s=><option value={s.id} key={s.id}>{s.code} · {s.title}</option>)}</select></label>
 <label>Learner (coded account)<select name="learner" required className={field}>{learners?.map(l=><option key={l.cohort_id+l.user_id} value={l.cohort_id+':'+l.user_id}>{cohorts?.find(c=>c.id===l.cohort_id)?.name} · {l.user_id.slice(0,8)}</option>)}</select></label>
 <label>Primary examiner<select name="examiner" required className={field}>{raters?.map(r=><option key={r.user_id} value={r.user_id}>{r.role} · {r.user_id.slice(0,8)}</option>)}</select></label>
 <label>Independent second examiner<select name="second" className={field}><option value="">Not sampled</option>{raters?.map(r=><option key={r.user_id} value={r.user_id}>{r.role} · {r.user_id.slice(0,8)}</option>)}</select></label>
 <label>Coded SP identifier<input name="sp" required className={field}/></label><label>Schedule<input name="scheduled" type="datetime-local" className={field}/></label><button className="ten-button-primary">Schedule</button>
 </form>}
 <section className="mt-6 space-y-3"><h2 className="font-bold">Assigned encounters</h2>{encounters?.map(e=><Link key={e.id} className="block rounded-xl border bg-white p-4" href={`/programs/${programId}/pilot/fce/${e.id}`}>{stations?.find(s=>s.id===e.station_id)?.code} · Encounter {e.id.slice(0,8)} · {e.second_examiner_id?'Double rated':'Single rated'}</Link>)}</section>
 </AppShell>
}
