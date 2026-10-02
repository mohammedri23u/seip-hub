export type AttemptSnapshot = {
 id: string; assessment_id: string; phase: string; title: string; status: string; instrument_version: string
 reopened_at?: string | null; timing_mode?: string
 started_at: string; submitted_at: string | null; expired: boolean; deadline_at: string | null
 completion_kind: string; total_items: number; answered_items: number; saved_answers: number; missing_items: number
 max_score: number; known_score: number | null; known_items: number; approved_score: number | null; approved_items: number
 pending_reviews: number; pending_approval: number; moderation_items: number
 mcq_score: number | null; mcq_max: number; mcq_answered: number; written_score: number | null; written_max: number
 final_score: number | null; final_percent: number | null
}
export function attemptLabel(a?: AttemptSnapshot) {
 if (!a) return 'لم يبدأ بعد'
 const labels: Record<string,string> = {
  submitted_complete: 'إجابات مكتملة ومسلّمة', timed_out_complete: 'أُغلق بالوقت — جميع الإجابات محفوظة',
  timed_out_empty: 'انتهى الوقت — بدون إجابات محفوظة', submitted_empty: 'أُغلقت المحاولة بدون إجابات',
  timed_out_partial: 'انتهى الوقت — إجابات جزئية', submitted_partial: 'تسليم جزئي — إجابات ناقصة',
  reopened_in_progress: 'أُعيد فتحها — أكمل بدون توقيت', in_progress: 'قيد الإجابة — لم يسلّم', expired_unfinalized: 'انتهى الوقت — بانتظار إغلاق المحاولة', invalidated: 'محاولة ملغاة'
 }
 return labels[a.completion_kind] ?? 'حالة غير معروفة'
}
export function isCompleteSubmission(a: AttemptSnapshot) {
 return ['submitted_complete','timed_out_complete'].includes(a.completion_kind)
}
export function isClosedEmpty(a: AttemptSnapshot) {
 return ['timed_out_empty','submitted_empty'].includes(a.completion_kind)
}
export function snapshotScore(a: AttemptSnapshot) {
 if (!['submitted','late'].includes(a.status)) return 'غير متاحة قبل التسليم'
 if (a.answered_items === 0) return 'لا توجد درجة — لا توجد إجابات'
 if (a.final_score !== null) return `${a.final_score} / ${a.max_score} — معتمدة`
 if (a.known_score === null) return 'بانتظار التصحيح البشري'
 return `${a.known_score} / ${a.max_score} — مجموع جزئي`
}
