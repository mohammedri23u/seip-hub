import Link from 'next/link'
import { FacilitatorStudio } from '@/components/the-ten/facilitator-studio'
import { TeacherTaskCenter, type TeacherTask } from '@/components/the-ten/teacher-task-center'
import { requireUser } from '@/lib/auth/require-user'
import { getTenCatalog, getTenStudio } from '@/lib/the-ten/runtime'

type MembershipRow = { program_id: string; role: string }
type ProgramRow = { id: string; code: string; name: string }
type QueueRow = {
  response_id: string
  assessment_title: string
  question_code: string
  submitted_at: string
  existing_review_status: string | null
  finalized: boolean
  assignment_kind: 'primary' | 'second' | null
  assignment_status: 'assigned' | 'completed' | 'cancelled' | null
  assigned_to_me: boolean
}
type FacilitatorAssignment = { session_id: string; facilitator_role: string }
type SessionRow = { id: string; title: string; status: string; scheduled_at: string | null; join_code: string | null }

export default async function FacilitatorTenPage() {
  const { supabase, userId } = await requireUser()
  const [studio, catalog, membershipResult, facilitatorResult] = await Promise.all([
    getTenStudio(),
    getTenCatalog(),
    supabase.from('program_memberships').select('program_id, role').eq('user_id', userId).eq('status', 'active'),
    supabase.from('session_facilitators').select('session_id, facilitator_role').eq('user_id', userId),
  ])

  const memberships = (membershipResult.data ?? []) as MembershipRow[]
  const reviewProgramIds = [...new Set(
    memberships
      .filter(row => ['peer_educator', 'reviewer', 'assessment_lead', 'program_director'].includes(row.role))
      .map(row => row.program_id),
  )]

  const { data: programData } = reviewProgramIds.length
    ? await supabase.from('programs').select('id, code, name').in('id', reviewProgramIds)
    : { data: [] }
  const programs = (programData ?? []) as ProgramRow[]
  const programMap = new Map(programs.map(program => [program.id, program]))

  const queueResults = await Promise.all(reviewProgramIds.map(async programId => {
    const { data, error } = await supabase.rpc('ten_review_queue', { target_program_id: programId })
    if (error) return { programId, rows: [] as QueueRow[] }
    return { programId, rows: (data ?? []) as QueueRow[] }
  }))

  const ratingTasks: TeacherTask[] = queueResults.flatMap(({ programId, rows }) => {
    const program = programMap.get(programId)
    return rows
      .filter(row => row.assigned_to_me && row.assignment_status === 'assigned' && row.existing_review_status !== 'submitted' && !row.finalized)
      .map(row => ({
        id: `review-${row.response_id}`,
        kind: row.assignment_kind === 'second' ? 'second_rating' as const : 'primary_rating' as const,
        title: `${row.assessment_title} · ${row.question_code}`,
        detail: `${program?.code ?? 'SEIP'} · blinded response ${row.response_id.slice(0, 8)}`,
        href: `/programs/${programId}/assessment/grading/${row.response_id}`,
      }))
  })

  const facilitatorAssignments = (facilitatorResult.data ?? []) as FacilitatorAssignment[]
  const sessionIds = [...new Set(facilitatorAssignments.map(item => item.session_id))]
  const { data: sessionData } = sessionIds.length
    ? await supabase.from('sessions').select('id, title, status, scheduled_at, join_code').in('id', sessionIds).in('status', ['scheduled', 'live'])
    : { data: [] }
  const sessions = (sessionData ?? []) as SessionRow[]
  const sessionTasks: TeacherTask[] = sessions.map(session => ({
    id: `session-${session.id}`,
    kind: 'session',
    title: session.title,
    detail: `${session.status === 'live' ? 'Session is live now' : 'Assigned live-session facilitation'}${session.join_code ? ` · ${session.join_code}` : ''}`,
    href: `/sessions/${session.id}/live`,
    scheduledAt: session.scheduled_at,
  }))

  const tasks = [...sessionTasks.filter(task => sessions.find(session => `session-${session.id}` === task.id)?.status === 'live'), ...ratingTasks, ...sessionTasks.filter(task => sessions.find(session => `session-${session.id}` === task.id)?.status !== 'live')]

  return <main className="min-h-screen bg-[#f7f0df] px-4 py-6 text-[#17363a] sm:px-6 sm:py-10">
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black tracking-[.18em] text-[#1f6668]">THE TEN — BAGHDAD NEXUS</p><h1 className="mt-2 font-serif text-4xl sm:text-5xl">Facilitator Studio</h1><p className="mt-2 max-w-2xl leading-7 text-[#526c6e]">Start with your assigned work, then move into live-session control when needed.</p></div><Link href="/dashboard" className="ten-text-link">← SEIP workspace</Link></div>
      <TeacherTaskCenter tasks={tasks} />
      <FacilitatorStudio studio={studio} catalog={catalog} />
    </div>
  </main>
}
