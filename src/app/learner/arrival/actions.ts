'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

export async function completeArrival(_formData: FormData) {
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('ten_experience_command', {
    operation: 'complete_arrival',
    payload: {},
    target_cohort_id: null,
  })

  if (error) redirect('/learner/arrival?error=save')
  redirect('/learner/guide')
}
