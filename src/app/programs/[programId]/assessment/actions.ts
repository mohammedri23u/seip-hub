'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

export async function createLearningObjective(programId: string, formData: FormData) {
  const code = String(formData.get('code') ?? '').trim().toUpperCase()
  const title = String(formData.get('title') ?? '').trim()
  const domain = String(formData.get('domain') ?? '').trim()
  const competency = String(formData.get('competency') ?? '').trim()

  if (!code || !title) redirect(`/programs/${programId}/assessment?error=missing_learning_objective`)

  const { supabase, userId } = await requireUser()
  const { error } = await supabase.from('learning_objectives').insert({
    program_id: programId,
    code,
    title,
    domain: domain || null,
    competency: competency || null,
    status: 'active',
    created_by: userId,
  })

  if (error) redirect(`/programs/${programId}/assessment?error=create_learning_objective_failed`)
  revalidatePath(`/programs/${programId}/assessment`)
}
