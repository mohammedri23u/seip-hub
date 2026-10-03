'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveRubricReview } from '@/app/programs/[programId]/assessment/grading/[responseId]/save-review'
import type { ReviewDetail } from '@/lib/assessment/review'
import { scoreText } from '@/lib/assessment/grading-workspace'

export function RubricReviewForm({ programId, responseId, detail, learnerId }: { programId: string; responseId: string; detail: ReviewDetail; learnerId?: string }) {
 const router = useRouter()
 const [state, action, pending] = useActionState(saveRubricReview.bind(null, programId, responseId), {})
 const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(detail.criteria.map(c => [c.id, detail.my_review?.criterion_scores[c.id] === undefined ? '' : String(detail.my_review.criterion_scores[c.id])])))
 const priorSafety = detail.scientific?.safety_reviews.find(s => s.human_review_id === detail.my_review?.id)
 const [safety, setSafety] = useState(priorSafety ? priorSafety.unsafe_flag ? 'unsafe' : 'safe' : '')
 const [dirty, setDirty] = useState(false)
 const locked = detail.my_review?.status === 'submitted' || Boolean(detail.final_decision) || state.status === 'submitted'
 const max = detail.criteria.reduce((sum, c) => sum + Number(c.max_score), 0)
 const filled = detail.criteria.filter(c => values[c.id]?.trim() && Number.isFinite(Number(values[c.id])))
 const total = filled.reduce((sum, c) => sum + Number(values[c.id]), 0)
 useEffect(() => { if (state.saved) { setDirty(false); router.refresh() } }, [state, router])
 useEffect(() => {
  const warn = (e: BeforeUnloadEvent) => { if (dirty && !locked) { e.preventDefault(); e.returnValue = '' } }
  window.addEventListener('beforeunload', warn)
  return () => window.removeEventListener('beforeunload', warn)
 }, [dirty, locked])
 return <form action={action} onChange={() => setDirty(true)} className="mt-5 space-y-4" dir="rtl">
  {learnerId && <input type="hidden" name="learner_id" value={learnerId} />}
  <div className="sticky top-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-white/95 p-4 shadow-sm backdrop-blur">
   <div><p className="text-xs text-slate-500">مجموع الـRubric الحالي</p><p className="mt-1 text-xl font-semibold tabular-nums"><bdi>{scoreText(total)} / {scoreText(max)}</bdi></p></div><p className="text-sm text-slate-600">{filled.length} / {detail.criteria.length} معايير{filled.length < detail.criteria.length ? ' — غير مكتمل' : ' — مكتمل'}</p>
  </div>
  {state.error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{state.error}</p>}
  {state.saved && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">{state.status === 'draft' ? 'حُفظت مسودة التصحيح.' : 'حُفظ التصحيح بنجاح. الاعتماد النهائي منفصل ولا يحدث تلقائيًا.'}</p>}
  {state.warning && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{state.warning}</p>}
  <fieldset disabled={pending || locked} className="space-y-4 disabled:opacity-80">
   <legend className="sr-only">درجات معايير الـRubric</legend>
   {detail.criteria.map(c => <div key={c.id} className="rounded-2xl border border-slate-200 p-4">
    <div className="flex items-start justify-between gap-4"><div><p dir="auto" className="font-semibold">{c.code} · {c.title}</p>{c.description && <p dir="auto" className="mt-2 text-sm leading-6 text-slate-600">{c.description}</p>}</div><bdi className="shrink-0 text-sm font-semibold">max {Number(c.max_score)}</bdi></div>
    {c.scoring_guidance && <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3"><p className="text-xs font-semibold text-amber-900">Scoring guidance</p><p dir="auto" className="mt-2 whitespace-pre-wrap text-sm leading-7">{c.scoring_guidance}</p></div>}
    <label className="mt-4 block"><span className="mb-2 block text-sm font-semibold">الدرجة لهذا المعيار</span>{detail.scientific?.binary_criteria ? <select name={`criterion_${c.id}`} value={values[c.id]} required onChange={e => setValues(v => ({ ...v, [c.id]: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 sm:max-w-52"><option value="">اختر الدرجة</option><option value="0">0 — المعيار غير متحقق</option><option value="1">1 — المعيار متحقق</option></select> : <input name={`criterion_${c.id}`} value={values[c.id]} onChange={e => setValues(v => ({ ...v, [c.id]: e.target.value }))} type="number" inputMode="decimal" min="0" max={Number(c.max_score)} step={Number(c.max_score) === 2 ? '1' : '0.001'} required className="w-full rounded-xl border border-slate-300 px-3 py-3 sm:max-w-52" />}</label>
   </div>)}
   {detail.scientific && <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
    <h3 className="font-semibold">Safety judgment</h3><p className="mt-2 text-sm leading-6 text-slate-600">هل تتضمن الإجابة قرارًا غير آمن؟ هذا حكم مستقل، وليس خصمًا تلقائيًا من الدرجة.</p>
    {detail.scientific.unsafe_response && <p dir="auto" className="mt-3 rounded-xl bg-white p-3 text-sm leading-6">{detail.scientific.unsafe_response}</p>}
    <label className="mt-3 block"><span className="mb-2 block text-sm font-semibold">حكم المصحّح</span><select name="safety_judgment" value={safety} required onChange={e => setSafety(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3"><option value="">اختر الحكم</option><option value="safe">لا توجد إشارة Unsafe محددة في الإجابة</option><option value="unsafe">توجد إجابة أو خطوة Unsafe</option></select></label>
    <label className="mt-3 block"><span className="mb-2 block text-sm font-semibold">تفسير الحكم {safety === 'unsafe' ? '(مطلوب)' : '(اختياري)'}</span><textarea name="safety_note" defaultValue={priorSafety?.note ?? ''} required={safety === 'unsafe'} maxLength={5000} rows={3} className="w-full rounded-xl border border-slate-300 bg-white p-3" /></label>
   </section>}
   <label className="block"><span className="mb-2 block text-sm font-semibold">Feedback للطالب</span><textarea name="general_feedback" defaultValue={detail.my_review?.general_feedback ?? ''} maxLength={10000} rows={4} placeholder="اذكر ما أُنجز بشكل صحيح، وما يحتاج تحسينًا." className="w-full rounded-xl border border-slate-300 px-3 py-3" /></label>
   <label className="flex items-start gap-3 rounded-xl border p-4"><input type="checkbox" name="send_to_moderation" value="yes" className="mt-1" /><span className="text-sm">تحتاج الإجابة إلى Moderation قبل الاعتماد.</span></label>
   <div className="grid gap-3 sm:grid-cols-2"><button type="submit" name="intent" value="submit" className="rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white">{pending ? 'جارٍ الحفظ…' : 'حفظ وتثبيت التصحيح'}</button>{learnerId && <button type="submit" name="intent" value="next" className="rounded-xl bg-sky-800 px-4 py-3 font-semibold text-white">حفظ والانتقال للإجابة التالية</button>}<button type="submit" name="intent" value="draft" className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm">حفظ كمسودة</button></div>
  </fieldset>
  {locked && <p className="rounded-xl bg-slate-50 p-4 text-sm">التصحيح مثبت. اعتمد الدرجة من قسم المراجعات أدناه عند استيفاء متطلبات الاعتماد، أو استخدم Moderation.</p>}
 </form>
}
