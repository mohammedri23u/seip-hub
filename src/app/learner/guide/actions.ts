'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

export async function chooseGuide(formData: FormData) {
  const guideKey = String(formData.get('guide_key') ?? '')
  if (!['ibn-sina','al-razi','jabir','hippocrates'].includes(guideKey)) redirect('/learner/guide?error=guide')

  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('ten_experience_command', {
    operation: 'choose_guide',
    payload: { guide_key: guideKey },
    target_cohort_id: null,
  })

  if (error) redirect('/learner/guide?error=save')
  redirect('/learner')
}
