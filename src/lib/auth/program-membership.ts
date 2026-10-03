import type { requireUser } from './require-user'

const priority = ['program_director', 'assessment_lead', 'reviewer', 'peer_educator', 'learner']

// Memberships are a set: one person may be both director and reviewer.
export async function programMembership(
  supabase: Awaited<ReturnType<typeof requireUser>>['supabase'],
  programId: string,
  userId: string,
) {
  const { data, error } = await supabase.from('program_memberships').select('role')
    .eq('program_id', programId).eq('user_id', userId).eq('status', 'active')
  const role = error ? undefined : priority.find(candidate => data?.some(row => row.role === candidate))
  return { data: role ? { role } : null, error }
}
