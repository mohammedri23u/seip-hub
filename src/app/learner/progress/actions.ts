'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

export async function submitNexusEcho(formData: FormData) {
  const runId = String(formData.get('run_id') ?? '')
  const itemIndex = Number(formData.get('item_index') ?? NaN)
  const text = String(formData.get('text') ?? '').trim()
  if (!runId || !Number.isInteger(itemIndex) || itemIndex < 0 || text.length < 3) redirect('/learner/progress?error=echo')

  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('ten_api', {
    operation: 'echo',
    payload: { run_id: runId, item_index: itemIndex, text },
  })
  if (error) redirect('/learner/progress?error=echo')
  revalidatePath('/learner/progress')
  redirect('/learner/progress?echo=saved')
}
