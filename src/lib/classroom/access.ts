import 'server-only'

import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

/** The existing THE TEN program; other programs never authorize classroom access. */
export const CLASSROOM_PROGRAM_CODE = 'SEIP26'

export type ClassroomAccess = Awaited<ReturnType<typeof classroomAccess>>

async function classroomAccess() {
  const context = await requireUser()
  const [profileResult, adminResult, programResult, membershipResult, facilitatorResult] = await Promise.all([
    context.supabase.from('profiles').select('id,status').eq('id', context.userId).maybeSingle(),
    context.supabase.from('platform_admins').select('user_id').eq('user_id', context.userId).maybeSingle(),
    context.supabase.from('programs').select('id').eq('code', CLASSROOM_PROGRAM_CODE).eq('status', 'active'),
    context.supabase.from('program_memberships').select('program_id,role').eq('user_id', context.userId).eq('status', 'active'),
    context.supabase.from('session_facilitators').select('session_id').eq('user_id', context.userId).in('facilitator_role', ['lead', 'facilitator']),
  ])
  // A suspended profile or managed account restricted by RLS must not access teaching resources.
  if (profileResult.error || profileResult.data?.status !== 'active' || programResult.error ||
      membershipResult.error || facilitatorResult.error || adminResult.error) notFound()
  const programIds = (programResult.data ?? []).map(program => program.id as string)
  if (programIds.length === 0) notFound()
  const isAdmin = Boolean(adminResult.data)
  const memberships = membershipResult.data ?? []
  const canManageProgramIds = isAdmin ? programIds : memberships
    .filter(membership => membership.role === 'program_director' && programIds.includes(membership.program_id))
    .map(membership => membership.program_id as string)
  const { data: visibleCohorts, error: cohortError } = await context.supabase.from('cohorts')
    .select('id,program_id,status').in('program_id', programIds)
  if (cohortError) notFound()
  const allowedCohorts = visibleCohorts ?? []
  const sessionIds = (facilitatorResult.data ?? []).map(item => item.session_id as string)
  const assignedCohortIds: string[] = []
  if (sessionIds.length > 0) {
    const { data: sessions, error } = await context.supabase.from('sessions')
      .select('cohort_id').in('id', sessionIds).in('cohort_id', allowedCohorts.map(cohort => cohort.id))
    if (error) notFound()
    assignedCohortIds.push(...(sessions ?? []).map(session => session.cohort_id as string))
  }
  const cohortIds = allowedCohorts.filter(cohort =>
    canManageProgramIds.includes(cohort.program_id) || (cohort.status === 'active' && assignedCohortIds.includes(cohort.id) && memberships.some(membership => membership.program_id === cohort.program_id && ['peer_educator', 'reviewer', 'assessment_lead'].includes(membership.role))),
  ).map(cohort => cohort.id as string)
  return { ...context, isAdmin, programIds, canManageProgramIds, cohortIds }
}

/** Directors/admins or actual facilitators of a THE TEN cohort. */
export async function requireClassroomTeacher() {
  const context = await classroomAccess()
  if (!context.isAdmin && context.canManageProgramIds.length === 0 && context.cohortIds.length === 0) notFound()
  return context
}

/** Teacher, or an active THE TEN learner enrolled in an active cohort. */
export async function requireClassroomParticipant() {
  const context = await classroomAccess()
  if (context.isAdmin || context.canManageProgramIds.length > 0 || context.cohortIds.length > 0) return context
  const { data: memberships, error } = await context.supabase.from('cohort_memberships')
    .select('cohort_id,cohorts!inner(program_id,status)')
    .eq('user_id', context.userId).eq('member_type', 'learner').eq('status', 'active')
    .in('cohorts.program_id', context.programIds).eq('cohorts.status', 'active')
  const { data: programMembership, error: programError } = await context.supabase.from('program_memberships')
    .select('program_id').eq('user_id', context.userId).eq('role', 'learner').eq('status', 'active')
    .in('program_id', context.programIds)
  if (error || programError || !memberships?.length || !programMembership?.length) notFound()
  return context
}
