'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

export async function saveDataGovernance(programId: string, formData: FormData) {
  const { supabase, userId } = await requireUser()
  const retentionRaw = String(formData.get('retention_days') ?? '').trim()
  const retentionDays = retentionRaw ? Number(retentionRaw) : null
  const dataControllerContact = String(formData.get('data_controller_contact') ?? '').trim() || null
  const privacyNoticeUrl = String(formData.get('privacy_notice_url') ?? '').trim() || null

  if (retentionDays !== null && (!Number.isInteger(retentionDays) || retentionDays <= 0)) {
    redirect(`/programs/${programId}/pilot?error=invalid_retention`)
  }

  const { error } = await supabase.from('program_data_governance').update({
    retention_days: retentionDays,
    data_controller_contact: dataControllerContact,
    privacy_notice_url: privacyNoticeUrl,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }).eq('program_id', programId)

  if (error) redirect(`/programs/${programId}/pilot?error=governance_save_failed`)
  revalidatePath(`/programs/${programId}/pilot`)
  redirect(`/programs/${programId}/pilot?saved=governance`)
}

export async function saveAssessmentQuality(programId: string, formData: FormData) {
  const { supabase, userId } = await requireUser()
  const targetRaw = String(formData.get('double_rating_target_count') ?? '').trim()
  const targetCount = targetRaw ? Number(targetRaw) : null
  const selectionRule = String(formData.get('double_rating_selection_rule') ?? '').trim() || null

  if (targetCount !== null && (!Number.isInteger(targetCount) || targetCount <= 0)) {
    redirect(`/programs/${programId}/pilot?error=invalid_double_rating_target`)
  }

  const payload = {
    program_id: programId,
    blind_scoring: formData.get('blind_scoring') === 'on',
    rater_calibration_required: formData.get('rater_calibration_required') === 'on',
    double_rating_required: formData.get('double_rating_required') === 'on',
    double_rating_target_count: targetCount,
    double_rating_selection_rule: selectionRule,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('program_assessment_quality_settings').upsert(payload, { onConflict: 'program_id' })
  if (error) redirect(`/programs/${programId}/pilot?error=quality_save_failed`)
  revalidatePath(`/programs/${programId}/pilot`)
  redirect(`/programs/${programId}/pilot?saved=quality`)
}
