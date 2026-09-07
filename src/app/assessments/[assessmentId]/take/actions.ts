'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

type DeliveryItem = { question_version_id: string; question_type: string; options: Array<{ id: string }> }
type Delivery = { items: DeliveryItem[] }

export async function startAssessment(assessmentId: string) {
  const { supabase, userId } = await requireUser()
  const { data: existing } = await supabase.from('assessment_attempts').select('id, status').eq('assessment_id', assessmentId).eq('learner_id', userId).maybeSingle()
  if (existing) redirect(`/assessments/${assessmentId}/take`)
  const { error } = await supabase.from('assessment_attempts').insert({ assessment_id: assessmentId, learner_id: userId, status: 'in_progress' })
  if (error) redirect(`/learner/assessments?error=start_failed`)
  redirect(`/assessments/${assessmentId}/take`)
}

export async function submitAssessment(assessmentId: string, attemptId: string, formData: FormData) {
  const { supabase, userId } = await requireUser()
  const { data: attempt } = await supabase.from('assessment_attempts').select('id, learner_id, status').eq('id', attemptId).eq('assessment_id', assessmentId).maybeSingle()
  if (!attempt || attempt.learner_id !== userId || attempt.status !== 'in_progress') redirect('/learner/assessments')
  const { data: deliveryData, error: deliveryError } = await supabase.rpc('get_assessment_delivery', { target_assessment_id: assessmentId })
  if (deliveryError || !deliveryData) redirect(`/assessments/${assessmentId}/take?error=delivery_failed`)
  const delivery = deliveryData as Delivery

  for (const item of delivery.items) {
    const field = `q_${item.question_version_id}`
    if (item.question_type === 'single_best_answer' || item.question_type === 'true_false') {
      const selectedOptionId = String(formData.get(field) ?? '').trim()
      if (selectedOptionId) {
        const { error } = await supabase.from('student_responses').upsert({ attempt_id: attemptId, question_version_id: item.question_version_id, selected_option_id: selectedOptionId, text_response: null }, { onConflict: 'attempt_id,question_version_id' })
        if (error) redirect(`/assessments/${assessmentId}/take?error=save_failed`)
      }
    } else {
      const textResponse = String(formData.get(field) ?? '').trim()
      const { error } = await supabase.from('student_responses').upsert({ attempt_id: attemptId, question_version_id: item.question_version_id, selected_option_id: null, text_response: textResponse }, { onConflict: 'attempt_id,question_version_id' })
      if (error) redirect(`/assessments/${assessmentId}/take?error=save_failed`)
    }
  }

  const { error } = await supabase.from('assessment_attempts').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', attemptId).eq('learner_id', userId).eq('status', 'in_progress')
  if (error) redirect(`/assessments/${assessmentId}/take?error=submit_failed`)
  redirect('/learner/assessments?submitted=1')
}
