'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

export async function assignRubricToQuestion(programId: string, rubricId: string, formData: FormData) {
  const questionVersionId = String(formData.get('question_version_id') ?? '')
  const rubricVersionId = String(formData.get('rubric_version_id') ?? '')
  if (!questionVersionId || !rubricVersionId) redirect(`/programs/${programId}/assessment/rubrics/${rubricId}?error=invalid_assignment`)
  const { supabase, userId } = await requireUser()
  const { error } = await supabase.from('question_rubrics').upsert({
    question_version_id: questionVersionId,
    rubric_version_id: rubricVersionId,
    created_by: userId,
  }, { onConflict: 'question_version_id' })
  if (error) redirect(`/programs/${programId}/assessment/rubrics/${rubricId}?error=assignment_failed`)
  revalidatePath(`/programs/${programId}/assessment/rubrics/${rubricId}`)
}

export async function approveRubric(programId: string, rubricId: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('rubrics').update({ status: 'approved' }).eq('id', rubricId).eq('program_id', programId)
  if (error) redirect(`/programs/${programId}/assessment/rubrics/${rubricId}?error=approve_failed`)
  revalidatePath(`/programs/${programId}/assessment/rubrics/${rubricId}`)
}
