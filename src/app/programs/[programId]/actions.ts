'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

export async function createCohort(programId: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const startDate = String(formData.get('start_date') ?? '').trim()
  const endDate = String(formData.get('end_date') ?? '').trim()

  if (!name) redirect(`/programs/${programId}?error=missing_cohort_name`)

  const { supabase, userId } = await requireUser()
  const { data: cohort, error } = await supabase
    .from('cohorts')
    .insert({
      program_id: programId,
      name,
      start_date: startDate || null,
      end_date: endDate || null,
      status: 'active',
      created_by: userId,
    })
    .select('id')
    .single()

  if (error || !cohort) redirect(`/programs/${programId}?error=create_cohort_failed`)

  revalidatePath(`/programs/${programId}`)
  redirect(`/programs/${programId}/cohorts/${cohort.id}`)
}
