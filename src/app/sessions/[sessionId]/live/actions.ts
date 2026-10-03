'use server'
import {redirect} from 'next/navigation'
import {revalidatePath} from 'next/cache'
import {requireUser} from '@/lib/auth/require-user'
export async function join(sessionId:string,data:FormData){
 const {supabase}=await requireUser()
 const {error}=await supabase.rpc('join_live_session',{target_join_code:String(data.get('code')||'')})
 redirect(`/sessions/${sessionId}/live?${error?'error=join':'joined=1'}`)
}
export async function advance(sessionId:string,activityId:string,data:FormData){
 const {supabase}=await requireUser()
 const {error}=await supabase.rpc('advance_live_activity',{target_activity_id:activityId,command:String(data.get('command'))})
 if(error)redirect(`/sessions/${sessionId}/live?error=transition`)
 revalidatePath(`/sessions/${sessionId}/live`)
}
export async function vote(sessionId:string,roundId:string,data:FormData){
 const {supabase,userId}=await requireUser()
 const {error}=await supabase.from('live_activity_responses').insert({round_id:roundId,learner_id:userId,option_id:String(data.get('option')||'')||null,text_response:String(data.get('reasoning')||'').trim()||null})
 if(error)redirect(`/sessions/${sessionId}/live?error=vote`)
 revalidatePath(`/sessions/${sessionId}/live`)
}
const keys=['progressive_disclosure','ask_commitment','examine_commitment','hypothesis_driven_pe','pertinent_negatives','problem_representation','ranked_differential','investigation_question','diagnostic_updating','transfer_case','reduced_scaffolding','reveal_timing','scope_preserved','timing','incidents_documented']
export async function closeout(sessionId:string,data:FormData){
 const {supabase,userId}=await requireUser()
 const checklist=Object.fromEntries(keys.map(k=>[k,data.get(k)==='yes'?true:data.get(k)==='no'?false:null]))
 const {error}=await supabase.from('session_closeouts').insert({session_id:sessionId,checklist,debrief:String(data.get('debrief')||''),error_tags:String(data.get('tags')||'').split(',').map(s=>s.trim()).filter(Boolean),deviation_note:String(data.get('deviation')||'')||null,closed_by:userId}).select('session_id').single()
 if(error)redirect(`/sessions/${sessionId}/live?error=closeout`)
 revalidatePath(`/sessions/${sessionId}/live`)
}
export async function attendance(sessionId:string,learnerId:string,data:FormData){
 const {supabase,userId}=await requireUser()
 const {error}=await supabase.from('attendance_records').upsert({session_id:sessionId,learner_id:learnerId,status:String(data.get('status')),method:'manual',verified_by:userId},{onConflict:'session_id,learner_id'}).select('id').single()
 if(error)redirect(`/sessions/${sessionId}/live?error=attendance`)
 revalidatePath(`/sessions/${sessionId}/live`)
}
