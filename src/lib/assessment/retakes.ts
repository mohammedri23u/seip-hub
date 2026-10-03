export type AssessmentRetakeNotice = {
 required: boolean
 pre_assessment_id: string
 post_assessment_id: string
 previous_pre_assessment_id: string
 previous_post_assessment_id: string
 requested_at: string
 policy_code: string
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function retakeTarget(notice?: AssessmentRetakeNotice | null): string | null {
 return notice && UUID.test(notice.pre_assessment_id) ? `/assessments/${notice.pre_assessment_id}/take` : null
}
export function isLegacyRetakeForm(assessmentId: string, notice?: AssessmentRetakeNotice | null): boolean {
 return Boolean(notice && UUID.test(assessmentId) && [notice.previous_pre_assessment_id, notice.previous_post_assessment_id].includes(assessmentId))
}
