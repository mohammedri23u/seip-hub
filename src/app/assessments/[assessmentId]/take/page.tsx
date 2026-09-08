import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { AssessmentExperience } from '@/components/the-ten/assessment-experience'
import { requireUser } from '@/lib/auth/require-user'
import { startAssessment, submitAssessment } from './actions'

type DeliveryOption = { id: string; text: string; position: number }
type DeliveryItem = { question_version_id: string; position: number; marks: number; question_type: string; stem: string; options: DeliveryOption[] }
type Delivery = { assessment_id: string; title: string; description: string | null; duration_minutes: number | null; items: DeliveryItem[] }

const backLink = (
  <Link
    href="/learner/assessments"
    className="rounded-[14px] border border-[#CFC2AA] bg-[#FFFDF8] px-4 py-2.5 text-sm font-bold text-[#17363A] transition hover:border-[#1F6668] hover:bg-white motion-reduce:transition-none"
  >
    Back to journey
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
    .select('id, title, status, duration_minutes')
    .eq('id', assessmentId)
    .maybeSingle()

  if (!assessment) notFound()

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('id, status, started_at')
    .eq('assessment_id', assessmentId)
    .eq('learner_id', userId)
    .maybeSingle()

  if (!attempt) {
    return (
      <AppShell eyebrow="THE TEN · ASSESSMENT" title={assessment.title} actions={backLink}>
        <section className="mx-auto max-w-2xl overflow-hidden rounded-[32px] border border-[#D8CCB6] bg-[#FFFDF8] shadow-[0_22px_70px_rgba(23,54,58,0.10)]">
          <div className="border-b border-[#E4D9C5] bg-[#17363A] px-6 py-7 text-[#FFFDF8] sm:px-8">
            <div className="inline-flex rounded-full border border-[#D8A94E]/50 bg-[#D8A94E]/10 px-3 py-1.5 text-xs font-black tracking-[0.16em] text-[#F2D99B]">
              NEXUS CHECKPOINT
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight">Ready to begin?</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#D9E6E3]">
              Once you enter this checkpoint, your attempt is linked to your account. Move carefully through each question and submit when you are satisfied with your reasoning.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-[#E1D3BA] bg-[#FFF7E7] p-4">
                <p className="text-xs font-black tracking-[0.12em] text-[#8B6A2B]">DURATION</p>
                <p className="mt-1 font-bold text-[#17363A]">
                  {assessment.duration_minutes ? `${assessment.duration_minutes} minutes` : 'Untimed'}
                </p>
              </div>
              <div className="rounded-[18px] border border-[#CFE1DC] bg-[#EEF8F5] p-4">
                <p className="text-xs font-black tracking-[0.12em] text-[#1F6668]">ATTEMPT STATE</p>
                <p className="mt-1 font-bold text-[#17363A]">Not started</p>
              </div>
            </div>

            <form action={startAssessment.bind(null, assessmentId)}>
              <button className="mt-6 min-h-12 w-full rounded-[16px] bg-[#1F6668] px-6 py-3 text-sm font-black text-white shadow-[0_12px_30px_rgba(31,102,104,0.18)] transition hover:-translate-y-0.5 hover:bg-[#195A5C] motion-reduce:transform-none motion-reduce:transition-none">
                Enter assessment
              </button>
            </form>
          </div>
        </section>
      </AppShell>
    )
  }

  if (attempt.status !== 'in_progress') {
    return (
      <AppShell eyebrow="THE TEN · ASSESSMENT" title={assessment.title} actions={backLink}>
        <div className="mx-auto max-w-2xl rounded-[30px] border border-[#CFE1DC] bg-[#FFFDF8] p-7 text-center shadow-[0_18px_55px_rgba(23,54,58,0.08)] sm:p-9">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#EAF7F1] text-xl font-black text-[#2F8A72]">✓</div>
          <p className="mt-4 text-lg font-black text-[#17363A]">Checkpoint submitted</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5D7172]">
            This attempt is locked. Your journey can continue while any written responses move through the supervised grading workflow.
          </p>
          <Link href="/learner/assessments" className="mt-5 inline-flex min-h-11 items-center rounded-[14px] bg-[#1F6668] px-5 py-2.5 text-sm font-black text-white">
            Continue journey →
          </Link>
        </div>
      </AppShell>
    )
  }

  const { data, error } = await supabase.rpc('get_assessment_delivery', { target_assessment_id: assessmentId })
  if (error || !data) notFound()
  const delivery = data as Delivery

  return (
    <AppShell
      eyebrow="THE TEN · LIVE CHECKPOINT"
      title={delivery.title}
      actions={
        <span className="rounded-[14px] border border-[#D8CCB6] bg-[#FFFDF8] px-4 py-2.5 text-sm font-black text-[#17363A] shadow-sm">
          {delivery.duration_minutes ? `${delivery.duration_minutes} min` : 'Untimed'}
        </span>
      }
    >
      {query.error ? (
        <p role="alert" className="mx-auto mb-5 max-w-4xl rounded-[16px] border border-[#E4B9B4] bg-[#FCEFED] px-4 py-3 text-sm font-semibold text-[#8C403A]">
          We could not save or submit this checkpoint. Your current page is still open; review your answers and try again.
        </p>
      ) : null}

      <AssessmentExperience
        items={delivery.items}
        action={submitAssessment.bind(null, assessmentId, attempt.id)}
      />
    </AppShell>
  )
}
