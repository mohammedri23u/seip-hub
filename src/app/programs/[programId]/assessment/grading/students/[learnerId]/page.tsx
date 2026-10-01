import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { requireProgramRole } from '@/lib/auth/require-program-role'
import { gradingSummary, weightedScore, scoreText, type LearnerWorkspace } from '@/lib/assessment/grading-workspace'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export default async function LearnerGrading({ params }: { params: Promise<{ programId: string; learnerId: string }> }) {
 const { programId, learnerId } = await params
 if (!UUID.test(learnerId)) notFound()
 const { supabase } = await requireProgramRole(programId, ['program_director', 'assessment_lead'])
 const { data, error } = await supabase.rpc('ten_grading_workspace', { target_program_id: programId, target_learner_id: learnerId })
 if (error) notFound()
 const workspace = data as LearnerWorkspace
 if (!workspace?.learner) notFound()
 const base = `/programs/${programId}/assessment/grading`
 const phaseName = (phase: string) => phase === 'pre' ? 'Pre-test' : phase === 'post' ? 'Post-test' : 'Mission Practice'
 return <AppShell title={workspace.learner.full_name || 'ملف الطالب'} eyebrow="THE TEN · STUDENT GRADING" actions={<Link href={`${base}/students`} className="rounded-xl border bg-white px-4 py-2.5">اختيار طالب آخر</Link>}>
  <div dir="rtl" className="space-y-6">
   <p className="text-sm text-slate-600"><bdi>{workspace.learner.student_id}</bdi> · الدرجات المصحّحة لا تصبح نهائية أو منشورة تلقائيًا.</p>
   <div className="grid gap-3 sm:grid-cols-2">{['pre', 'post'].map(phase => {
    const attempt = workspace.attempts.find(a => a.phase === phase)
    return <a key={phase} href={attempt ? `#attempt-${attempt.id}` : undefined} className="rounded-2xl border bg-white p-5"><strong dir="ltr">{phaseName(phase)}</strong><p className="mt-2 text-sm text-slate-600">{!attempt ? 'لم يبدأ بعد' : attempt.status === 'in_progress' ? 'قيد الإجابة — لا يُصحّح حتى التسليم' : 'تم التسليم — افتح الإجابات أدناه'}</p></a>
   })}</div>
   {workspace.attempts.map(attempt => {
    const summary = gradingSummary(attempt.items)
    const ready = ['submitted', 'late'].includes(attempt.status)
    const next = attempt.items.find(i => i.response_id && i.has_rubric && i.final_score === null && i.my_review_status !== 'submitted')
    return <section id={`attempt-${attempt.id}`} key={attempt.id} className="scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
     <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold tracking-wide text-sky-800">{phaseName(attempt.phase)}</p><h2 dir="auto" className="mt-2 text-lg font-semibold">{attempt.title}</h2><p className="mt-2 text-xs text-slate-500">{attempt.duration_minutes === 5 ? 'النسخة المختصرة · 5 دقائق' : 'النسخة الأصلية / التدريب'}{attempt.submitted_at ? ` · تم التسليم ${new Intl.DateTimeFormat('ar-IQ', { timeZone: 'Asia/Baghdad', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(attempt.submitted_at))}` : ''}</p></div>{ready && next && <Link className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white" href={`${base}/${next.response_id}?learner=${learnerId}`}>ابدأ / أكمل التصحيح</Link>}</div>
     {!ready ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">هذا الاختبار لم يُسلّم بعد. لن تُعرض إجاباته للتصحيح أو تُحسب له درجة نهائية.</p> : <>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">{[
       ['المجموع المصحّح حتى الآن', `${scoreText(summary.known)} / ${scoreText(summary.max)}`],
       ['إجابات غير مصحّحة', summary.pending], ['بانتظار اعتماد / تسجيل', summary.awaitingApproval],
       ['المجموع النهائي المعتمد', summary.complete ? `${scoreText(summary.approved)} / ${scoreText(summary.max)}` : 'غير مكتمل'],
      ].map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs leading-5 text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold tabular-nums"><bdi>{value}</bdi></p></div>)}</div>
      <p className="mt-3 text-xs leading-6 text-slate-500">المجموع المصحّح جزئي إلى أن تكتمل جميع الإجابات. تُحوَّل درجة كل Rubric إلى وزن السؤال، وتُحسب MCQs تلقائيًا. الاعتماد غير النشر للطالب.{summary.moderation > 0 ? ` توجد ${summary.moderation} إجابة تحتاج Moderation.` : ''}</p>
      {attempt.released_at && <p className="mt-2 text-sm text-emerald-800">النتيجة المنشورة: <bdi>{attempt.released_score} / {attempt.released_max}</bdi></p>}
      <div className="mt-5 space-y-3">{attempt.items.map(item => {
       const final = weightedScore(item.final_score, item.final_max, item.marks)
       const machine = weightedScore(item.machine_score, item.machine_max, item.marks)
       const reviewed = weightedScore(item.review_score, item.review_max, item.marks)
       const score = final ?? machine ?? reviewed ?? item.calculated_mcq
       const state = item.moderation_required ? 'تحتاج Moderation' : final !== null ? 'معتمدة' : machine !== null ? 'مصحّحة آليًا' : reviewed !== null ? 'مصحّحة — بانتظار الاعتماد' : item.calculated_mcq !== null ? 'MCQ — درجة محسوبة' : !item.response_id ? 'لا توجد إجابة مسجّلة' : 'بانتظار التصحيح'
       return <article key={item.question_version_id} className="rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">السؤال {item.position} · <bdi>{item.question_code}</bdi></p><p className="mt-1 text-xs text-slate-500">{state} · <bdi>{item.question_type === 'single_best_answer' ? 'MCQ' : 'Written answer'}</bdi></p></div><div className="flex items-center gap-3"><span className="font-semibold tabular-nums"><bdi>{score === null ? '—' : scoreText(Number(score))} / {Number(item.marks)}</bdi></span>{item.response_id && item.has_rubric && <Link href={`${base}/${item.response_id}?learner=${learnerId}`} className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-900">{final !== null ? 'عرض التصحيح' : reviewed !== null ? 'مراجعة واعتماد' : 'تصحيح الإجابة'}</Link>}</div></div>
        <details className="mt-3"><summary className="cursor-pointer text-sm font-medium text-slate-700">عرض السؤال وإجابة الطالب</summary><p dir="auto" className="mt-3 whitespace-pre-wrap text-sm leading-7">{item.stem}</p><div className="mt-3 rounded-xl bg-slate-50 p-4"><p className="mb-2 text-xs font-semibold text-slate-500">إجابة الطالب</p><p dir="auto" className="whitespace-pre-wrap text-sm leading-7">{item.question_type === 'single_best_answer' ? item.options.find(o => o.id === item.selected_option_id)?.text || 'لم يختر إجابة' : item.response_text || 'إجابة فارغة'}</p>{item.question_type === 'single_best_answer' && <p dir="auto" className="mt-3 text-sm text-emerald-900">Correct answer: {item.options.filter(o => o.is_correct).map(o => o.text).join(' / ')}</p>}</div></details>
       </article>
      })}</div>
     </>}
    </section>
   })}
   {!workspace.attempts.length && <p className="rounded-2xl border border-dashed p-8 text-center text-slate-600">لم يبدأ هذا الطالب أي اختبار بعد. ستظهر الإجابات هنا بعد التسليم.</p>}
  </div>
 </AppShell>
}
