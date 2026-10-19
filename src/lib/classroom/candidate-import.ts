import type { ClassroomMeeting, ClassroomMeetingSummary, ClassroomSlide, ClassroomSource } from './types'

/** Strict local projection of the supplied teaching pack. Never returns research instruments or case keys. */
export function importCandidateMeeting(raw: unknown, summary: ClassroomMeetingSummary): ClassroomMeeting {
  if (!raw || typeof raw !== 'object') throw new Error('الملف ليس حزمة تدريس صالحة.')
  const pack = raw as Record<string, unknown>
  if (pack.version !== '2.2-draft-for-clinical-signoff' || !Array.isArray(pack.sessions) || pack.sessions.length !== 5) throw new Error('اختر session_content.json v2.2 الذي يضم اللقاءات الخمسة.')
  for (let number = 1; number <= 5; number++) {
    const session = pack.sessions.find(item => item && typeof item === 'object' && item.id === 'S' + number)
    if (!session || !Array.isArray(session.slides) || session.slides.length !== 24 || typeof session.clinicalReview !== 'string' || !Array.isArray(session.outcomes) || !session.outcomes.every((item: unknown) => typeof item === 'string')) throw new Error('الحزمة غير مكتملة؛ المطلوب 24 شريحة في كل لقاء وحالة المراجعة العلمية.')
    if (!session.slides.every((item: unknown) => {
      if (!item || typeof item !== 'object') return false
      const slide = item as Record<string, unknown>
      return typeof slide.id === 'string' && typeof slide.title === 'string' && typeof slide.notes === 'string' && typeof slide.kind === 'string' && Array.isArray(slide.body) && slide.body.every(line => typeof line === 'string')
    })) throw new Error('بنية الشرائح غير صالحة.')
    if (new Set(session.slides.map((slide: ClassroomSlide) => slide.id)).size !== 24 || session.slides.filter((slide: ClassroomSlide) => slide.kind === 'PI_reveal').length !== 1 || session.slides.filter((slide: ClassroomSlide) => slide.kind === 'DU_reveal').length !== 1) throw new Error('راجع هوية الشرائح وبوابات كشف PI وDU.')
  }
  const session = pack.sessions.find(item => item.id === 'S' + summary.number)
  const slides: ClassroomSlide[] = session.slides.map((slide: ClassroomSlide) => ({ id: slide.id, title: slide.title, body: [...slide.body], notes: slide.notes, kind: slide.kind }))
  const refs = Array.isArray(pack.references) ? pack.references : []
  const sources: ClassroomSource[] = refs.filter((item: unknown): item is ClassroomSource => Boolean(item && typeof item === 'object' && typeof (item as ClassroomSource).id === 'string' && typeof (item as ClassroomSource).title === 'string' && typeof (item as ClassroomSource).url === 'string' && (item as ClassroomSource).url.startsWith('https://') && Array.isArray(session.references) && session.references.includes((item as ClassroomSource).id))).map(item => ({ id: item.id, title: item.title, url: item.url }))
  return { ...summary, learnerGoals: [...session.outcomes], cases: [], sources, slides, edition: '2.2-draft-for-clinical-signoff', reviewStatus: 'pending_named_clinical_supervisor_signoff' }
}
