import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { requireUser } from '@/lib/auth/require-user'
import { startAssessment, submitAssessment } from './actions'

type DeliveryOption = { id: string; text: string; position: number }
type DeliveryItem = { question_version_id: string; position: number; marks: number; question_type: string; stem: string; options: DeliveryOption[] }
type Delivery = { assessment_id: string; title: string; description: string | null; duration_minutes: number | null; items: DeliveryItem[] }

export default async function TakeAssessmentPage({ params, searchParams }: { params: Promise<{ assessmentId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { assessmentId } = await params
  const query = await searchParams
  const { supabase, userId } = await requireUser()
  const { data: assessment } = await supabase.from('assessments').select('id, title, status, duration_minutes').eq('id', assessmentId).maybeSingle()
  if (!assessment) notFound()
  const { data: attempt } = await supabase.from('assessment_attempts').select('id, status, started_at').eq('assessment_id', assessmentId).eq('learner_id', userId).maybeSingle()

  if (!attempt) return <AppShell eyebrow="ASSESSMENT" title={assessment.title} actions={<Link href="/learner/assessments" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium">Back</Link>}><section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><p className="text-slate-600">Once you start, an assessment attempt is created and tied to your account.</p><p className="mt-2 text-sm text-slate-500">Duration: {assessment.duration_minutes ? `${assessment.duration_minutes} minutes` : 'Not specified'}</p><form action={startAssessment.bind(null, assessmentId)}><button className="mt-6 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white">Start assessment</button></form></section></AppShell>
  if (attempt.status !== 'in_progress') return <AppShell eyebrow="ASSESSMENT" title={assessment.title}><div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><p className="font-semibold">This attempt has already been submitted.</p><Link href="/learner/assessments" className="mt-4 inline-block text-sm font-semibold text-sky-700">Back to assessments →</Link></div></AppShell>

  const { data, error } = await supabase.rpc('get_assessment_delivery', { target_assessment_id: assessmentId })
  if (error || !data) notFound()
  const delivery = data as Delivery

  return <AppShell eyebrow="LIVE ASSESSMENT" title={delivery.title} actions={<span className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold shadow-sm">{delivery.duration_minutes ? `${delivery.duration_minutes} min` : 'Untimed'}</span>}>
    {query.error ? <p className="mb-5 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">Could not save or submit the assessment.</p> : null}
    <form action={submitAssessment.bind(null, assessmentId, attempt.id)} className="mx-auto max-w-4xl space-y-5">
      {delivery.items.map((item) => <section key={item.question_version_id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><p className="font-semibold text-slate-500">Question {item.position}</p><span className="text-sm font-semibold text-slate-500">{item.marks} marks</span></div><h2 className="mt-4 text-lg font-semibold leading-8">{item.stem}</h2>{item.question_type === 'single_best_answer' || item.question_type === 'true_false' ? <div className="mt-5 space-y-3">{item.options.map((option) => <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50"><input type="radio" name={`q_${item.question_version_id}`} value={option.id} className="mt-1" /><span><strong className="mr-2">{String.fromCharCode(64 + option.position)}.</strong>{option.text}</span></label>)}</div> : <textarea name={`q_${item.question_version_id}`} rows={6} className="mt-5 w-full rounded-2xl border border-slate-300 p-4" placeholder="Write your answer..." />}</section>)}
      <div className="rounded-3xl bg-slate-950 p-6 text-white"><p className="text-sm text-slate-300">Submitting locks this attempt. Written responses will enter the human-supervised grading workflow in Stage 4.</p><button className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950">Submit assessment</button></div>
    </form>
  </AppShell>
}
