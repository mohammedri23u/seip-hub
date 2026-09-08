'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

export async function completeOrientation(formData: FormData) {
  const programId = String(formData.get('program_id') ?? '')
  const pledge = formData.get('pledge') === 'on'
  const assessment = formData.get('assessment') === 'on'
  if (!programId || !pledge || !assessment) redirect('/learner/orientation?error=acknowledgements')

  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('complete_journey_orientation', {
    target_program_id: programId,
    pledge_accepted: pledge,
    assessment_acknowledged: assessment,
  })
  if (error) redirect('/learner/orientation?error=save')
  redirect('/learner')
}
