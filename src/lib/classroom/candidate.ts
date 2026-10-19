import 'server-only'
import { requireClassroomTeacher } from './access'
import { getClassroomMeetingSummaries } from './content'
import type { ClassroomMeeting, ClassroomSlide, ClassroomSource } from './types'

const CANDIDATE_VERSION = '2.2-draft-for-clinical-signoff'

/** Reads a separately staged candidate. Approved v2.0 content and learner projections stay unchanged. */
export async function getClassroomCandidateMeeting(id: string): Promise<ClassroomMeeting | undefined> {
  const context = await requireClassroomTeacher()
  const summary = getClassroomMeetingSummaries().find(item => item.id === id)
  if (!summary) return undefined
  const { data, error } = await context.supabase.from('classroom_teaching_content').select('payload')
    .eq('content_version', '2.0-approved-foundation').maybeSingle()
  if (error) return undefined // Authorized teachers can still open the local-file preview.
  const raw: unknown = data?.payload?.classroom_v22
  if (!raw || typeof raw !== 'object') return undefined
  const candidate = raw as Record<string, unknown>
  if (candidate.version !== CANDIDATE_VERSION || candidate.clinicalReview !== 'pending_named_clinical_supervisor_signoff' || !candidate.sessions || typeof candidate.sessions !== 'object') return undefined
  const sessions = candidate.sessions as Record<string, Record<string, unknown>>
  // An incomplete upload cannot silently replace the approved deck.
  if (['S1', 'S2', 'S3', 'S4', 'S5'].some(key => !sessions[key] || !Array.isArray(sessions[key].slides) || sessions[key].slides.length !== 24)) return undefined
  const session = sessions['S' + summary.number]
  const validSlides = (session.slides as unknown[]).every(item => {
    if (!item || typeof item !== 'object') return false
    const slide = item as Record<string, unknown>
    return typeof slide.id === 'string' && typeof slide.title === 'string' && typeof slide.kind === 'string' && typeof slide.notes === 'string' && Array.isArray(slide.body) && slide.body.every(line => typeof line === 'string')
  })
  if (!validSlides || !Array.isArray(session.outcomes) || !session.outcomes.every(item => typeof item === 'string')) return undefined
  const slides = (session.slides as ClassroomSlide[]).map(slide => ({ id: slide.id, title: slide.title, body: [...slide.body], kind: slide.kind, notes: slide.notes }))
  if (slides.filter(slide => slide.kind === 'PI_reveal').length !== 1 || slides.filter(slide => slide.kind === 'DU_reveal').length !== 1) return undefined
  const refs = Array.isArray(candidate.references) ? candidate.references : []
  const selectedRefs = Array.isArray(session.references) ? session.references : []
  const sources: ClassroomSource[] = refs.filter((item): item is ClassroomSource => Boolean(item && typeof item === 'object' && typeof item.id === 'string' && selectedRefs.includes(item.id) && typeof item.title === 'string' && typeof item.url === 'string' && item.url.startsWith('https://'))).map(item => ({ id: item.id, title: item.title, url: item.url }))
  return { ...summary, learnerGoals: [...session.outcomes] as string[], slides, cases: [], sources, edition: CANDIDATE_VERSION, reviewStatus: 'pending_named_clinical_supervisor_signoff' }
}
