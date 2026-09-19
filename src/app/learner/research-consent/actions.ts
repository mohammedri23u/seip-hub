'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

export async function recordResearchChoice(programId: string, decision: 'granted' | 'declined', expectedVersion: string, formData: FormData) {
  if (decision === 'granted' && formData.get('acknowledged') !== 'on') redirect('/learner/research-consent?error=acknowledgement_required')
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('record_versioned_research_consent', {
    target_program_id: programId,
    decision,
    expected_version: expectedVersion,
    acknowledged: formData.get('acknowledged') === 'on',
  })
  if (error) redirect('/learner/research-consent?error=save_failed')
  revalidatePath('/learner/research-consent')
  redirect('/learner/research-consent?saved=1')
}

export async function withdrawResearchChoice(programId: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('withdraw_research_consent', {
    target_program_id: programId,
  })
  if (error) redirect('/learner/research-consent?error=withdraw_failed')
  revalidatePath('/learner/research-consent')
  redirect('/learner/research-consent?withdrawn=1')
}
