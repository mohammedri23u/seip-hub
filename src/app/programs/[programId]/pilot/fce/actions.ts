'use server'
import { redirect } from 'next/navigation'
import { requireProgramRole } from '@/lib/auth/require-program-role'
const codes=['H1','H2','PE1','PE2','PE3','PE4','PE5','PR','DDx','JUST']
export async function schedule(programId:string, data:FormData) {
 const {supabase}=await requireProgramRole(programId,['program_director','assessment_lead'])
 const {data:station}=await supabase.from('fce_stations').select('id').eq('id',String(data.get('station'))).eq('program_id',programId).maybeSingle()
 if(!station) redirect(`/programs/${programId}/pilot/fce?error=station`)
 const [cohort,learner]=String(data.get('learner')).split(':')
 const {data:id,error}=await supabase.rpc('schedule_fce',{target_station:station.id,target_cohort:cohort,target_learner:learner,examiner:String(data.get('examiner')),second_examiner:String(data.get('second')||'')||null,sp:String(data.get('sp')||''),scheduled:String(data.get('scheduled')||'')||null})
 if(error) redirect(`/programs/${programId}/pilot/fce?error=schedule`)
 redirect(`/programs/${programId}/pilot/fce/${id}`)
}
export async function rate(programId:string,encounterId:string,moderate:boolean,data:FormData) {
 const {supabase}=await requireProgramRole(programId,moderate?['program_director','assessment_lead']:['program_director','assessment_lead','reviewer'])
 const domain_scores=Object.fromEntries(codes.map(k=>[k,data.get(k)===null||data.get(k)===''?null:Number(data.get(k))]))
 const args=moderate?{target_encounter:encounterId,domain_scores,reason:String(data.get('reason')||'')}:{target_encounter:encounterId,domain_scores,global_score:Number(data.get('global')),flags:data.getAll('flags').map(String),deviation:String(data.get('deviation')||'')||null,observed_seconds:Number(data.get('observed')),post_seconds:Number(data.get('post'))}
 const {error}=await supabase.rpc(moderate?'moderate_fce':'submit_fce_rating',args)
 redirect(`/programs/${programId}/pilot/fce/${encounterId}?${error?'error=blocked':'saved=1'}`)
}
