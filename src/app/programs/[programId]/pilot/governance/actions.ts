'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireProgramRole } from '@/lib/auth/require-program-role'

export async function saveEthics(programId: string, data: FormData) {
  const { supabase, userId } = await requireProgramRole(programId, ['program_director'])
  const status = String(data.get('ethics_status'))
  if (!['pending','approved','suspended','rejected'].includes(status)) redirect(`/programs/${programId}/pilot/governance?error=invalid_status`)
  const { data: saved, error } = await supabase.from('program_data_governance').update({
    ethics_status: status, ethics_reference: String(data.get('reference') || '').trim() || null,
    ethics_evidence_url: String(data.get('evidence') || '').trim() || null,
    ethics_approved_at: String(data.get('approved_at') || '') || null, updated_by: userId,
  }).eq('program_id', programId).select('program_id').single()
  if (error || !saved) redirect(`/programs/${programId}/pilot/governance?error=not_saved`)
  revalidatePath(`/programs/${programId}/pilot`)
  redirect(`/programs/${programId}/pilot/governance?saved=1`)
}
export async function publishInformation(programId: string, data: FormData) {
  const { supabase, userId } = await requireProgramRole(programId, ['program_director'])
  const { error } = await supabase.rpc('publish_research_information', {
    target_program_id: programId, new_version: String(data.get('version') || '').trim(),
    information: String(data.get('information') || '').trim(),
    withdrawal: String(data.get('withdrawal') || '').trim(),
  })
  if (error) redirect(`/programs/${programId}/pilot/governance?error=not_published`)
  revalidatePath('/learner/research-consent')
  redirect(`/programs/${programId}/pilot/governance?saved=1`)
}
export async function requestExport(programId: string, data: FormData) {
  const { supabase, userId } = await requireProgramRole(programId, ['program_director','assessment_lead','reviewer'])
  const { error } = await supabase.from('research_export_requests').insert({
    program_id: programId, purpose: String(data.get('purpose') || '').trim(),
    dataset_key: 'longitudinal_core_v1', status: 'requested', requested_by: userId,
    scope: { included: 'submitted_human_criterion_ratings', free_text: false },
  }).select('id').single()
  if (error) redirect(`/programs/${programId}/pilot/governance?error=request_failed`)
  redirect(`/programs/${programId}/pilot/governance?saved=1`)
}
export async function decideExport(programId: string, requestId: string, data: FormData) {
  const { supabase, userId } = await requireProgramRole(programId, ['program_director'])
  const approved = data.get('decision') === 'approve'
  const { data: row, error } = await supabase.from('research_export_requests').update({
    status: approved ? 'approved' : 'rejected', approved_by: approved ? userId : null,
    decided_at: new Date().toISOString(), expires_at: approved ? new Date(Date.now()+86400000).toISOString() : null,
  }).eq('id', requestId).eq('program_id', programId).eq('status','requested').neq('requested_by',userId).select('id').single()
  if (error || !row) redirect(`/programs/${programId}/pilot/governance?error=decision_failed`)
  redirect(`/programs/${programId}/pilot/governance?saved=1`)
}
