import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { MetricCard } from '@/components/metric-card'
import { StatusBadge } from '@/components/status-badge'
import { requireUser } from '@/lib/auth/require-user'
import { createLearningObjective } from './actions'

export default async function AssessmentCenterPage({
  params,
  searchParams,
}: {
  params: Promise<{ programId: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { programId } = await params
  const query = await searchParams
  const { supabase, userId } = await requireUser()

  const [
    { data: program },
    { data: membership },
    { data: platformAdmin },
    { data: objectives },
    { data: cohorts },
    { data: questions },
    { data: rubrics },
  ] = await Promise.all([
    supabase.from('programs').select('id, name, code').eq('id', programId).maybeSingle(),
    supabase.from('program_memberships').select('role').eq('program_id', programId).eq('user_id', userId).eq('status', 'active').maybeSingle(),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('learning_objectives').select('id, code, title, domain, competency, status').eq('program_id', programId).order('code'),
    supabase.from('cohorts').select('id, name').eq('program_id', programId),
    supabase.from('questions').select('id, question_code, question_type, status, created_at').eq('program_id', programId).order('created_at', { ascending: false }).limit(8),
    supabase.from('rubrics').select('id, status').eq('program_id', programId),
  ])

  if (!program) notFound()
  const canManage = Boolean(platformAdmin) || membership?.role === 'program_director' || membership?.role === 'assessment_lead'
  const objectiveRows = objectives ?? []
  const cohortIds = (cohorts ?? []).map((cohort) => cohort.id)
  const assessmentQuery = cohortIds.length
    ? await supabase.from('assessments').select('id, title, assessment_type, status, cohort_id, created_at').in('cohort_id', cohortIds).order('created_at', { ascending: false }).limit(8)
    : { data: [] as Array<{ id: string; title: string; assessment_type: string; status: string; cohort_id: string; created_at: string }> }
  const assessments = assessmentQuery.data ?? []

  return (
    <AppShell
      eyebrow={`${program.code} · ASSESSMENT`}
      title="Assessment Center"
      actions={
        <>
          <Link href={`/programs/${programId}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium">Back to program</Link>
          <Link href={`/programs/${programId}/assessment/rubrics`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">Rubrics</Link>
          <Link href={`/programs/${programId}/assessment/grading`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">Grading queue</Link>
          {canManage ? <Link href={`/programs/${programId}/assessment/questions/new`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">New question</Link> : null}
          {canManage ? <Link href={`/programs/${programId}/assessment/assessments/new`} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">New assessment</Link> : null}
        </>
      }
    >
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Learning objectives" value={objectiveRows.length} />
        <MetricCard label="Questions" value={(questions ?? []).length} />
        <MetricCard label="Assessments" value={assessments.length} />
        <MetricCard label="Rubrics" value={(rubrics ?? []).length} />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div><h2 className="text-xl font-semibold">Question Bank</h2><p className="mt-1 text-sm text-slate-500">Versioned items linked to learning objectives.</p></div>
              {canManage ? <Link href={`/programs/${programId}/assessment/questions/new`} className="text-sm font-semibold text-sky-700">Author question →</Link> : null}
            </div>
            <div className="mt-5 space-y-3">
              {(questions ?? []).length ? (questions ?? []).map((question) => (
                <Link key={question.id} href={`/programs/${programId}/assessment/questions/${question.id}`} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-4 hover:bg-slate-50">
                  <div><p className="font-semibold">{question.question_code}</p><p className="mt-1 text-sm capitalize text-slate-500">{question.question_type.replaceAll('_', ' ')}</p></div>
                  <StatusBadge status={question.status} />
                </Link>
              )) : <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">No questions yet.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Assessments</h2><p className="mt-1 text-sm text-slate-500">Blueprinted exams with controlled lifecycle states.</p></div></div>
            <div className="mt-5 space-y-3">
              {assessments.length ? assessments.map((assessment) => (
                <Link key={assessment.id} href={`/assessments/${assessment.id}`} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-4 hover:bg-slate-50">
                  <div><p className="font-semibold">{assessment.title}</p><p className="mt-1 text-sm capitalize text-slate-500">{assessment.assessment_type.replaceAll('_', ' ')}</p></div>
                  <StatusBadge status={assessment.status} />
                </Link>
              )) : <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">No assessments yet.</p>}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Learning Objectives</h2>
          <p className="mt-1 text-sm text-slate-500">These power blueprinting and later learning-gap analytics.</p>
          <div className="mt-5 space-y-3">
            {objectiveRows.map((objective) => (
              <div key={objective.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{objective.code}</p><p className="mt-1 text-sm text-slate-700">{objective.title}</p></div><StatusBadge status={objective.status} /></div>
                {(objective.domain || objective.competency) ? <p className="mt-2 text-xs text-slate-500">{[objective.domain, objective.competency].filter(Boolean).join(' · ')}</p> : null}
              </div>
            ))}
          </div>

          {canManage ? (
            <form action={createLearningObjective.bind(null, programId)} className="mt-6 space-y-4 border-t border-slate-200 pt-6">
              <h3 className="font-semibold">Add learning objective</h3>
              {query.error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">Could not save the learning objective.</p> : null}
              <Input label="Code" name="code" placeholder="CR-LO-01" />
              <Input label="Title" name="title" placeholder="Generate a prioritized differential diagnosis" />
              <Input label="Domain" name="domain" placeholder="Clinical Reasoning" required={false} />
              <Input label="Competency" name="competency" placeholder="Decision-making" required={false} />
              <button className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Add objective</button>
            </form>
          ) : null}
        </div>
      </section>
    </AppShell>
  )
}

function Input({ label, name, placeholder, required = true }: { label: string; name: string; placeholder?: string; required?: boolean }) {
  return <label className="block"><span className="text-sm font-medium text-slate-700">{label}</span><input name={name} placeholder={placeholder} required={required} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label>
}
