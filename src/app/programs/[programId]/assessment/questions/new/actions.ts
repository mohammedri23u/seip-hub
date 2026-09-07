'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

const supportedTypes = new Set(['single_best_answer', 'short_answer', 'structured_written'])

export async function createQuestion(programId: string, formData: FormData) {
  const code = String(formData.get('code') ?? '').trim().toUpperCase()
  const questionType = String(formData.get('question_type') ?? '')
  const stem = String(formData.get('stem') ?? '').trim()
  const explanation = String(formData.get('explanation') ?? '').trim()
  const difficulty = String(formData.get('difficulty_target') ?? '').trim()
  const marks = Number(formData.get('marks') ?? 1)
  const learningObjectiveId = String(formData.get('learning_objective_id') ?? '').trim()

  if (!code || !stem || !supportedTypes.has(questionType) || !Number.isFinite(marks) || marks <= 0) {
    redirect(`/programs/${programId}/assessment/questions/new?error=invalid_question`)
  }

  const options = ['A', 'B', 'C', 'D'].map((letter) => String(formData.get(`option_${letter.toLowerCase()}`) ?? '').trim())
  const correct = String(formData.get('correct_option') ?? '').trim().toUpperCase()
  if (questionType === 'single_best_answer' && (options.some((option) => !option) || !['A', 'B', 'C', 'D'].includes(correct))) {
    redirect(`/programs/${programId}/assessment/questions/new?error=invalid_options`)
  }

  const { supabase, userId } = await requireUser()
  const { data: question, error: questionError } = await supabase.from('questions').insert({
    program_id: programId,
    question_code: code,
    question_type: questionType,
    status: 'draft',
    author_id: userId,
  }).select('id').single()

  if (questionError || !question) redirect(`/programs/${programId}/assessment/questions/new?error=create_question_failed`)

  const { data: version, error: versionError } = await supabase.from('question_versions').insert({
    question_id: question.id,
    version_number: 1,
    stem,
    explanation: explanation || null,
    difficulty_target: difficulty || null,
    marks,
    created_by: userId,
  }).select('id').single()

  if (versionError || !version) {
    await supabase.from('questions').delete().eq('id', question.id)
    redirect(`/programs/${programId}/assessment/questions/new?error=create_version_failed`)
  }

  if (questionType === 'single_best_answer') {
    const optionRows = options.map((optionText, index) => ({
      question_version_id: version.id,
      option_text: optionText,
      is_correct: ['A', 'B', 'C', 'D'][index] === correct,
      position: index + 1,
    }))
    const { error } = await supabase.from('question_options').insert(optionRows)
    if (error) {
      await supabase.from('questions').delete().eq('id', question.id)
      redirect(`/programs/${programId}/assessment/questions/new?error=create_options_failed`)
    }
  }

  if (learningObjectiveId) {
    const { error } = await supabase.from('question_learning_objectives').insert({
      question_version_id: version.id,
      learning_objective_id: learningObjectiveId,
      weight: 100,
    })
    if (error) {
      await supabase.from('questions').delete().eq('id', question.id)
      redirect(`/programs/${programId}/assessment/questions/new?error=map_objective_failed`)
    }
  }

  redirect(`/programs/${programId}/assessment/questions/${question.id}`)
}
