'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireProgramRole } from '@/lib/auth/require-program-role'
import { reviewDetail } from '@/lib/assessment/review'
import type { LearnerWorkspace } from '@/lib/assessment/grading-workspace'

export type SaveReviewState = { error?: string; warning?: string; saved?: boolean; status?: string; reviewId?: string }

export async function saveRubricReview(programId: string, responseId: string, _state: SaveReviewState, form: FormData): Promise<SaveReviewState> {
 const { supabase, userId, role } = await requireProgramRole(programId, ['program_director', 'assessment_lead', 'reviewer', 'peer_educator'])
 const detail = await reviewDetail(supabase, programId, responseId)
 if (!detail || !detail.criteria.length) return { error: 'تعذر تحميل الإجابة والـRubric أو لا تملك صلاحية تصحيحها.' }
 if (detail.my_review?.status === 'submitted' || detail.final_decision) return { error: 'هذا التصحيح مثبت. استخدم مسار Moderation عند الحاجة إلى مراجعة الدرجة.' }
 const scores: Record<string, number> = {}
 for (const criterion of detail.criteria) {
  const raw = form.get(`criterion_${criterion.id}`)
  if (typeof raw !== 'string' || raw.trim() === '') return { error: 'أدخل درجة لكل معيار. الدرجة الفارغة لا تعني صفرًا.' }
  const value = Number(raw), max = Number(criterion.max_score)
  if (!Number.isFinite(value) || value < 0 || value > max || ((detail.scientific?.binary_criteria || max === 2) && !Number.isInteger(value))) return { error: 'توجد درجة خارج النطاق أو لا تطابق خطوات الـRubric.' }
  scores[criterion.id] = value
 }
 const safetyValue = String(form.get('safety_judgment') ?? '')
 const safetyNote = String(form.get('safety_note') ?? '').trim()
 if (detail.scientific && !['safe', 'unsafe'].includes(safetyValue)) return { error: 'سجّل Safety judgment قبل الحفظ.' }
 if (detail.scientific && safetyValue === 'unsafe' && !safetyNote) return { error: 'اكتب سبب تحديد الإجابة على أنها Unsafe.' }
 const feedback = String(form.get('general_feedback') ?? '').trim()
 if (feedback.length > 10000 || safetyNote.length > 5000) return { error: 'الملاحظة طويلة جدًا؛ اختصرها قبل الحفظ.' }
 const intent = String(form.get('intent') ?? 'submit')
 if (!['submit', 'draft', 'next'].includes(intent)) return { error: 'طلب حفظ غير صالح.' }
 const submit = intent !== 'draft'
 let workspace: LearnerWorkspace | null = null
 const learnerId = String(form.get('learner_id') ?? '')
 if (learnerId) {
  if (!['program_director', 'assessment_lead'].includes(role) || !/^[0-9a-f-]{36}$/i.test(learnerId)) return { error: 'سياق الطالب غير صالح.' }
  const { data, error } = await supabase.rpc('ten_grading_workspace', { target_program_id: programId, target_learner_id: learnerId })
  workspace = data as LearnerWorkspace | null
  if (error || !workspace?.attempts.some(a => a.items.some(i => i.response_id === responseId))) return { error: 'هذه الإجابة لا تنتمي إلى الطالب المحدد.' }
 }
 const args = { target_response_id: responseId, criterion_scores: scores, feedback: feedback || null, submit_review: submit }
 const result = detail.scientific
  ? await supabase.rpc('ten_save_scientific_review', { ...args, unsafe_flag: safetyValue === 'unsafe', safety_note: safetyNote || null })
  : await supabase.rpc('ten_save_human_review', args)
 if (result.error || !result.data?.review_id) return { error: 'لم يتم الحفظ. تأكد من تسليم الاختبار ومن مطابقة الدرجات للـRubric. قد تكون الإجابة قد اعتُمدت في جلسة أخرى.' }
 let warning: string | undefined
 if (submit && form.get('send_to_moderation') === 'yes') {
  const { data: open, error: readError } = await supabase.from('moderation_cases').select('id').eq('response_id', responseId).in('status', ['open', 'in_review']).limit(1)
  if (readError) warning = 'حُفظ التصحيح، لكن تعذر التحقق من طلب Moderation. افتح قسم Moderation قبل اعتماد الدرجة.'
  else if (!open?.length) {
   const { error } = await supabase.from('moderation_cases').insert({ response_id: responseId, human_review_id: result.data.review_id, trigger_type: 'manual', reason: 'Reviewer requested moderation.', opened_by: userId })
   if (error) warning = 'حُفظ التصحيح، لكن لم ينجح إرسال طلب Moderation. لا تعتمد الدرجة قبل مراجعة الحالة.'
  }
 }
 const base = `/programs/${programId}/assessment/grading`
 for (const path of [base, `${base}/${responseId}`, `${base}/students`, '/grading', '/facilitator/the-ten']) revalidatePath(path)
 if (learnerId) revalidatePath(`${base}/students/${learnerId}`)
 if (intent === 'next' && workspace && !warning) {
  const attempt = workspace.attempts.find(a => a.items.some(i => i.response_id === responseId))!
  const current = attempt.items.find(i => i.response_id === responseId)!
  const pending = attempt.items.filter(i => i.response_id && i.response_id !== responseId && i.has_rubric && i.final_score === null && i.my_review_status !== 'submitted')
  const next = pending.find(i => i.position > current.position) ?? pending[0]
  redirect(next ? `${base}/${next.response_id}?learner=${learnerId}` : `${base}/students/${learnerId}#attempt-${attempt.id}`)
 }
 return { saved: true, status: submit ? 'submitted' : 'draft', reviewId: String(result.data.review_id), warning }
}
