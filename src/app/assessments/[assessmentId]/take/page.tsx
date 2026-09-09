import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AssessmentExperience } from '@/components/the-ten/assessment-experience'
import { CheckpointGate } from '@/components/the-ten/checkpoint-gate'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { requireUser } from '@/lib/auth/require-user'
import { checkpointState } from '@/lib/the-ten/journey'
import { startAssessment, submitAssessment } from './actions'

type DeliveryOption = { id: string; text: string; position: number }
type DeliveryItem = { question_version_id: string; position: number; marks: number; question_type: string; stem: string; options: DeliveryOption[] }
type Delivery = { assessment_id: string; title: string; description: string | null; duration_minutes: number | null; items: DeliveryItem[] }

const backLink = (
  <Link
    href="/learner"
    className="rounded-[14px] border border-[#CFC2AA] bg-[#FFFDF8] px-4 py-2.5 text-sm font-bold text-[#17363A] transition hover:border-[#1F6668] hover:bg-white motion-reduce:transition-none"
  >
    Back to Baghdad
  </Link>
)

export default async function TakeAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { assessmentId } = await params
  const query = await searchParams
  const { supabase, userId } = await requireUser()

  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, cohort_id, title, description, assessment_type, status, opens_at, closes_at, duration_minutes')
    .eq('id', assessmentId)
    .maybeSingle()

  if (!assessment) notFound()

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('id, assessment_id, status, submitted_at, started_at')
    .eq('assessment_id', assessmentId)
    .eq('learner_id', userId)
    .maybeSingle()

  const { data: learnerMembership } = await supabase
    .from('cohort_memberships')
    .select('status')
    .eq('cohort_id', assessment.cohort_id)
    .eq('user_id', userId)
    .eq('member_type', 'learner')
    .in('status', ['active', 'completed'])
    .maybeSingle()

  const availability = checkpointState(assessment, attempt ?? undefined, { canTake: learnerMembership?.status === 'active' })
  if (availability.state === 'locked' && (!attempt || attempt.status === 'in_progress')) {
    return <LearnerShell active="/learner" title={assessment.title} actions={backLink}>
      <section className="ten-panel"><h2>{availability.label}</h2><p>{availability.reason}</p></section>
    </LearnerShell>
  }

  if (!attempt) {
    const checkpointKind = assessment.assessment_type === 'diagnostic' ? 'entry' : assessment.assessment_type === 'final' ? 'exit' : 'checkpoint'
    return (
      <LearnerShell active="/learner" immersive title={assessment.title}>
        <CheckpointGate
          title={assessment.title}
          description={assessment.description}
          durationMinutes={assessment.duration_minutes}
          kind={checkpointKind}
          startAction={
            <form action={startAssessment.bind(null, assessmentId)}>
              <button className="min-h-14 w-full rounded-[16px] bg-[#d8a94e] px-6 py-3 text-sm font-black text-[#17363a] shadow-[0_12px_30px_rgba(216,169,78,0.20)] transition hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none">
                {checkpointKind === 'entry' ? 'Open the Entry Gate →' : checkpointKind === 'exit' ? 'Enter the Exit Gate →' : 'Enter checkpoint →'}
              </button>
            </form>
          }
        />
      </LearnerShell>
    )
  }

  if (attempt.status !== 'in_progress') {
    return (
      <LearnerShell active="/learner" title={assessment.title} actions={backLink}>
        <div className="mx-auto max-w-2xl rounded-[30px] border border-[#CFE1DC] bg-[#FFFDF8] p-7 text-center shadow-[0_18px_55px_rgba(23,54,58,0.08)] sm:p-9">
          <div className={`mx-auto grid size-14 place-items-center rounded-full text-xl font-black ${attempt.status === 'invalidated' ? 'bg-[#FFF7E8] text-[#86602B]' : 'bg-[#EAF7F1] text-[#2F8A72]'}`}>{attempt.status === 'invalidated' ? '!' : '✓'}</div>
          <p className="mt-4 text-lg font-black text-[#17363A]">{attempt.status === 'invalidated' ? 'Attempt invalidated' : 'Checkpoint submitted'}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5D7172]">
            {attempt.status === 'invalidated' ? 'This attempt has been invalidated. Contact your facilitator for guidance.' : 'This attempt is locked. Your journey can continue while any written responses move through the supervised grading workflow.'}
          </p>
          <Link href="/learner" className="mt-5 inline-flex min-h-11 items-center rounded-[14px] bg-[#1F6668] px-5 py-2.5 text-sm font-black text-white">
            Continue journey →
          </Link>
        </div>
      </LearnerShell>
    )
  }

  const { data, error } = await supabase.rpc('get_assessment_delivery', { target_assessment_id: assessmentId })
  if (error || !data) notFound()
  const delivery = data as Delivery

  return (
    <LearnerShell
      active="/learner"
      title={delivery.title}
      actions={
        <span className="rounded-[14px] border border-[#D8CCB6] bg-[#FFFDF8] px-4 py-2.5 text-sm font-black text-[#17363A] shadow-sm">
          {delivery.duration_minutes ? `${delivery.duration_minutes} min` : 'Untimed'}
        </span>
      }
    >
      {query.error ? (
        <p role="alert" className="mx-auto mb-5 max-w-4xl rounded-[16px] border border-[#E4B9B4] bg-[#FCEFED] px-4 py-3 text-sm font-semibold text-[#8C403A]">
          We could not save or submit this checkpoint. This page has reloaded; re-enter and review your answers before trying again.
        </p>
      ) : null}

      <AssessmentExperience
        items={delivery.items}
        action={submitAssessment.bind(null, assessmentId, attempt.id)}
      />
    </LearnerShell>
  )
}
