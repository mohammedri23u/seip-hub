'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

export async function createSession(programId: string, cohortId: string, formData: FormData) {
  const title = String(formData.get('title') ?? '').trim()
  const scheduledAt = String(formData.get('scheduled_at') ?? '').trim()
  const durationRaw = String(formData.get('duration_minutes') ?? '').trim()
  const durationMinutes = durationRaw ? Number(durationRaw) : null

  if (!title) redirect(`/programs/${programId}/cohorts/${cohortId}?error=missing_session_title`)
  if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes <= 0)) {
    redirect(`/programs/${programId}/cohorts/${cohortId}?error=invalid_duration`)
  }

  const { supabase, userId } = await requireUser()
  const joinCode = `SEIP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      cohort_id: cohortId,
      title,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      duration_minutes: durationMinutes,
      status: scheduledAt ? 'scheduled' : 'draft',
      join_code: joinCode,
      created_by: userId,
    })
    .select('id')
    .single()

  if (error || !session) redirect(`/programs/${programId}/cohorts/${cohortId}?error=create_session_failed`)

  revalidatePath(`/programs/${programId}/cohorts/${cohortId}`)
  redirect(`/sessions/${session.id}`)
}
