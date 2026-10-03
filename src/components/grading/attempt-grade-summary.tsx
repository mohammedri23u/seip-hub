import { attemptLabel, snapshotScore, type AttemptSnapshot } from '@/lib/assessment/attempt-status'
export function AttemptGradeSummary({ snapshot: a, compact = false }: { snapshot?: AttemptSnapshot; compact?: boolean }) {
 if (!a) return <p className="mt-2 text-sm text-slate-500">لم يبدأ بعد</p>
 const fmt = (v: number | null, max: number) => v === null ? '—' : `${v} / ${max}`
 const closed = ['submitted','late'].includes(a.status)
 return <div className="mt-3" dir="rtl">
  <p className={`text-sm font-semibold ${a.expired || a.missing_items > 0 && closed ? 'text-amber-900' : 'text-slate-700'}`}>{attemptLabel(a)}</p>
  <p className="mt-2 text-xs leading-6 text-slate-500">إجابات محفوظة: <bdi>{a.answered_items} / {a.total_items}</bdi> · {a.instrument_version === 'original' ? 'النسخة الأصلية' : a.timing_mode === 'self_paced' ? 'النسخة المختصرة · بدون توقيت' : 'النسخة المختصرة'}</p>
  <p className="mt-2 text-base font-semibold"><bdi>{snapshotScore(a)}</bdi></p>
  {a.reopened_at && !closed && <p className="mt-2 text-xs leading-6 text-[#1F6668]">أُعيد فتح المحاولة لإكمال الإجابات المتبقية. الإجابات والدرجات السابقة محفوظة.</p>}
  {closed && a.answered_items > 0 && <div className={`mt-3 grid gap-2 ${compact ? 'grid-cols-2' : 'sm:grid-cols-4'}`}>
   {a.mcq_max > 0 && <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">MCQ</p><p className="mt-1 font-semibold"><bdi>{fmt(a.mcq_score,a.mcq_max)}</bdi></p></div>}
   {a.written_max > 0 && <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Written / VSAQ</p><p className="mt-1 text-sm font-semibold"><bdi>{a.written_score === null ? a.pending_reviews > 0 ? 'بانتظار التصحيح' : 'لا توجد درجة مسجلة' : fmt(a.written_score,a.written_max)}</bdi></p></div>}
   {!compact && <><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">تحتاج تصحيح / اعتماد</p><p className="mt-1 font-semibold"><bdi>{a.pending_reviews} / {a.pending_approval}</bdi></p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">النهائية المعتمدة</p><p className="mt-1 font-semibold"><bdi>{a.final_score === null ? 'غير مكتملة' : `${a.final_score} / ${a.max_score} (${a.final_percent}%)`}</bdi></p></div></>}
  </div>}
  {closed && a.missing_items > 0 && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">{a.answered_items === 0 ? 'لا توجد إجابات محفوظة يمكن تصحيحها. إغلاق المؤقّت لا يعني إكمال الاختبار.' : `هناك ${a.missing_items} سؤال بدون إجابة محفوظة. المجموع الظاهر جزئي وليس نتيجة نهائية.`}</p>}
  {!compact && a.pending_reviews > 0 && <p className="mt-3 text-sm text-slate-600">صحّح الإجابات الكتابية باستخدام الـRubric حتى تظهر درجاتها هنا.</p>}
  {a.moderation_items > 0 && <p className="mt-2 text-xs text-amber-900">توجد إجابات بانتظار Moderation.</p>}
 </div>
}
