'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

export async function submitCompletionFeedback(formData: FormData) {
  const cohortId = String(formData.get('cohort_id') ?? '')
  const relevance = Number(formData.get('relevance') ?? NaN)
  const learningDesign = Number(formData.get('learning_design') ?? NaN)
  const mostValuable = String(formData.get('most_valuable') ?? '').trim()
  const improvement = String(formData.get('improvement') ?? '').trim()
  const additional = String(formData.get('additional') ?? '').trim()
  if (!cohortId || !Number.isInteger(relevance) || !Number.isInteger(learningDesign) || mostValuable.length < 3 || improvement.length < 3) redirect('/learner/certificate?error=feedback')

  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('submit_journey_feedback', {
    target_cohort_id: cohortId,
    relevance,
    learning_design: learningDesign,
    most_valuable_answer: mostValuable,
    improvement_answer: improvement,
    additional_answer: additional || null,
  })
  if (error) redirect('/learner/certificate?error=feedback')
  revalidatePath('/learner')
  revalidatePath('/learner/certificate')
  redirect('/learner/certificate?feedback=saved')
}

export async function claimCertificate(formData: FormData) {
  const cohortId = String(formData.get('cohort_id') ?? '')
  if (!cohortId) redirect('/learner/certificate?error=certificate')
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('claim_completion_certificate', { target_cohort_id: cohortId })
  if (error) redirect('/learner/certificate?error=certificate')
  revalidatePath('/learner/certificate')
  redirect('/learner/certificate?issued=1')
}
