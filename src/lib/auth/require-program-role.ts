import { programMembership } from '@/lib/auth/program-membership'
import { notFound } from 'next/navigation'
import { requireUser } from './require-user'

export async function requireProgramRole(programId: string, roles: string[]) {
  const context = await requireUser()
  const [{ data: membership, error }, { data: admin }] = await Promise.all([
    programMembership(context.supabase, programId, context.userId),
    context.supabase.from('platform_admins').select('user_id').eq('user_id', context.userId).maybeSingle(),
  ])
  if (!admin && (error || !membership || !roles.includes(membership.role))) notFound()
  return { ...context, role: admin ? 'program_director' : membership!.role }
}
