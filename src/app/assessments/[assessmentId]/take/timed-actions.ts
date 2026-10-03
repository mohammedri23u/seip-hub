'use server'

import { requireUser } from '@/lib/auth/require-user'

/** Compatibility for already-open timed clients; self-paced attempts are never closed by this RPC. */
export async function finalizeTimedAssessment(attemptId: string): Promise<{ completed: boolean }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attemptId)) {
    throw new Error('Invalid attempt identifier')
  }
  const { supabase } = await requireUser()
  const { data, error } = await supabase.rpc('finalize_timed_assessment', {
    target_attempt_id: attemptId,
  })
  if (error) throw new Error('The timed checkpoint could not be finalized. Reopen it to retry.')
  return { completed: Boolean((data as { completed?: boolean } | null)?.completed) }
}
