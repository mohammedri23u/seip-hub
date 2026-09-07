'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

const allowedStatuses = new Set(['draft', 'review', 'approved', 'retired'])

export async function setQuestionStatus(programId: string, questionId: string, formData: FormData) {
  const status = String(formData.get('status') ?? '')
  if (!allowedStatuses.has(status)) redirect(`/programs/${programId}/assessment/questions/${questionId}?error=invalid_status`)
  const { supabase } = await requireUser()
  const { error } = await supabase.from('questions').update({ status }).eq('id', questionId).eq('program_id', programId)
  if (error) redirect(`/programs/${programId}/assessment/questions/${questionId}?error=update_failed`)
  revalidatePath(`/programs/${programId}/assessment/questions/${questionId}`)
  revalidatePath(`/programs/${programId}/assessment`)
}
