import 'server-only'

import learnerApproved from './content.learner.v2.json'
import { requireClassroomTeacher } from './access'
import type {
  ClassroomLearnerCase,
  ClassroomLearnerMeeting,
  ClassroomMeeting,
  ClassroomMeetingSummary,
  ClassroomSlide,
  ClassroomSource,
  ClassroomTeachingCase,
} from './types'

const cases: ClassroomLearnerCase[] = learnerApproved.cases
const CONTENT_VERSION = '2.0-approved-foundation'

type MeetingDefinition = Omit<ClassroomMeetingSummary, 'title' | 'mission' | 'focus' | 'description' | 'caseTitles'>

const definitions: MeetingDefinition[] = [
  {
    id: 'meeting-1', number: 1, titleAr: 'ألم الصدر وضيق النفس',
    subtitle: 'Chest pressure and dyspnea', durationMinutes: 75,
    missionCodes: ['M01'], caseIds: ['E01', 'E02'],
    learnerGoals: ['نقرأ حالة قصيرة ونحدد المعلومات المهمة.', 'نتدرّب على سؤال واضح من History.', 'نناقش كيف تغيّر المعلومات الجديدة القرار.'],
  },
  {
    id: 'meeting-2', number: 2, titleAr: 'السعال والصفير',
    subtitle: 'Cough, fever and episodic wheeze', durationMinutes: 75,
    missionCodes: ['M01'], caseIds: ['E03', 'E04'],
    learnerGoals: ['نربط الأعراض بتسلسلها الزمني.', 'نتدرّب على قراءة Findings بسيطة.', 'نراجع قرارنا بعد ظهور معلومة جديدة.'],
  },
  {
    id: 'meeting-3', number: 3, titleAr: 'ألم البطن خطوة بخطوة',
    subtitle: 'Dyspepsia and migrating abdominal pain', durationMinutes: 75,
    missionCodes: ['M02'], caseIds: ['E05', 'E06'],
    learnerGoals: ['نسأل عن الأدوية ومكان الألم.', 'نرتّب المعلومات قبل اقتراح Diagnosis.', 'نشرح سبب اختيارنا بجملة واحدة.'],
  },
  {
    id: 'meeting-4', number: 4, titleAr: 'اليرقان وأعراض الجهاز البولي',
    subtitle: 'Acute jaundice and fever with flank pain', durationMinutes: 75,
    missionCodes: ['M03'], caseIds: ['E07', 'E08'],
    learnerGoals: ['نميّز وصف العرض عن معرفة سببه.', 'نقرأ نتيجة Test ضمن الحالة.', 'نتدرّب على ملاحظة تغير حالة المريض.'],
  },
  {
    id: 'meeting-5', number: 5, titleAr: 'العطش والخفقان',
    subtitle: 'Thirst, frequent urination and palpitations', durationMinutes: 75,
    missionCodes: ['M04'], caseIds: ['E09', 'E10'],
    learnerGoals: ['نربط مجموعة أعراض بسؤال سريري واضح.', 'نختار Test يجيب عن السؤال.', 'نفرّق بين النتيجة الأولية ومعرفة السبب.'],
  },
]

function summaryFor(definition: MeetingDefinition): ClassroomMeetingSummary {
  return {
    ...definition,
    missionCodes: [...definition.missionCodes],
    learnerGoals: [...definition.learnerGoals],
    caseIds: [...definition.caseIds],
    caseTitles: definition.caseIds.map(id => cases.find(item => item.id === id)!.title),
    title: definition.titleAr,
    mission: definition.missionCodes[0],
    focus: definition.subtitle,
    description: 'جلسة حضورية يقودها المعلم، بحالتين قصيرتين ونقاش وورقة عمل. المشاركة لا تتطلب استخدام الهاتف.',
  }
}

function slidesFor(definition: MeetingDefinition, teachingCases: ClassroomTeachingCase[], firstMeetingSlides: ClassroomSlide[], sources: ClassroomSource[]): ClassroomSlide[] {
  if (definition.number === 1) return firstMeetingSlides
  const slides: ClassroomSlide[] = [
    { id: 'intro', title: definition.titleAr, body: ['THE TEN — BAGHDAD NEXUS', definition.subtitle] },
    { id: 'goals', title: 'ماذا سنتدرّب عليه؟', body: definition.learnerGoals },
  ]
  teachingCases.forEach(item => {
    slides.push(
      { id: item.id + '-vocabulary', title: 'مفردات الحالة — ' + item.id, body: item.vocab },
      { id: item.id + '-case', title: item.title, body: [item.stem] },
      { id: item.id + '-question', title: 'فكّر وحدك ثم ناقش', body: [item.question, ...item.options.map((option, index) => String.fromCharCode(65 + index) + '. ' + option), item.hint] },
      { id: item.id + '-feedback', title: 'نراجع الفكرة معاً', body: [String.fromCharCode(65 + item.key) + '. ' + item.options[item.key], item.explain] },
      { id: item.id + '-update', title: 'معلومة جديدة', body: [item.guided] },
      { id: item.id + '-reasoning', title: 'كيف نفسّرها؟', body: [item.guidedKey] },
      { id: item.id + '-safety', title: 'متى تتغيّر الأولوية؟', body: [item.safety] },
    )
  })
  slides.push(
    { id: 'reflection', title: 'خلاصة اللقاء', body: ['ما المعلومة الأهم في كل حالة؟', 'ما الذي غيّر رأيك؟', 'اكتب فكرة واحدة تريد أن تتذكرها.'] },
    { id: 'references', title: 'المصادر', body: sources.filter(source => teachingCases.some(item => item.source === source.id)).map(source => source.title + ' — ' + source.url) },
  )
  return slides
}

/** Contains only metadata; this is the only content getter suitable for a public overview. */
export function getClassroomMeetingSummaries(): ClassroomMeetingSummary[] {
  return definitions.map(summaryFor)
}

type TeachingContentPayload = {
  cases: ClassroomTeachingCase[]
  slides: ClassroomSlide[]
  sources: [string, string, string][]
}

function teachingPayload(payload: unknown): TeachingContentPayload {
  if (!payload || typeof payload !== 'object') throw new Error('Classroom teaching content is unavailable.')
  const value = payload as Record<string, unknown>
  const teachingFields = ['id', 'mission', 'title', 'source', 'goal', 'stem', 'question', 'hint', 'explain', 'guided', 'guidedKey', 'exam', 'test', 'safety', 'extension']
  const validCases = Array.isArray(value.cases) && value.cases.length === 10 && value.cases.every(item => {
    if (!item || typeof item !== 'object') return false
    const candidate = item as Record<string, unknown>
    return teachingFields.every(field => typeof candidate[field] === 'string') &&
      Array.isArray(candidate.options) && candidate.options.length > 0 && candidate.options.every(option => typeof option === 'string') &&
      Array.isArray(candidate.vocab) && candidate.vocab.every(term => typeof term === 'string') &&
      Number.isInteger(candidate.key) && (candidate.key as number) >= 0 && (candidate.key as number) < candidate.options.length
  })
  const validSlides = Array.isArray(value.slides) && value.slides.length === 20 && value.slides.every(item =>
    item && typeof item === 'object' && typeof item.id === 'string' && typeof item.title === 'string' &&
    Array.isArray(item.body) && item.body.every((line: unknown) => typeof line === 'string'),
  )
  const validSources = Array.isArray(value.sources) && value.sources.every(item =>
    Array.isArray(item) && item.length === 3 && item.every(field => typeof field === 'string'),
  )
  if (!validCases || !validSlides || !validSources) throw new Error('Classroom teaching content is unavailable.')
  return payload as TeachingContentPayload
}

/** Teacher authorization is enforced here; answer keys are held only in the protected database. */
export async function getClassroomMeeting(id: string): Promise<ClassroomMeeting | undefined> {
  const context = await requireClassroomTeacher()
  const definition = definitions.find(item => item.id === id)
  if (!definition) return undefined
  const { data, error } = await context.supabase.from('classroom_teaching_content')
    .select('payload').eq('content_version', CONTENT_VERSION).maybeSingle()
  if (error || !data?.payload) throw new Error('Classroom teaching content is unavailable.')
  const approved = teachingPayload(data.payload)
  const teachingCases = definition.caseIds.map(caseId => approved.cases.find(item => item.id === caseId))
  if (teachingCases.some(item => !item)) throw new Error('Classroom teaching content is incomplete.')
  const meetingCases = teachingCases as ClassroomTeachingCase[]
  const sources: ClassroomSource[] = approved.sources.map(([sourceId, title, url]) => ({ id: sourceId, title, url }))
  return {
    ...summaryFor(definition),
    cases: meetingCases,
    slides: slidesFor(definition, meetingCases, approved.slides, sources),
    sources: sources.filter(source => meetingCases.some(item => item.source === source.id)),
  }
}

/** Safe projection for authenticated participants. No object spreading of teaching cases. */
export function getClassroomLearnerMeeting(id: string): ClassroomLearnerMeeting | undefined {
  const definition = definitions.find(item => item.id === id)
  if (!definition) return undefined
  const learnerCases: ClassroomLearnerCase[] = definition.caseIds.map(caseId => {
    const item = cases.find(candidate => candidate.id === caseId)!
    return {
      id: item.id, title: item.title, vocab: [...item.vocab],
      stem: item.stem, question: item.question, hint: item.hint,
      options: [...item.options], guided: item.guided,
    }
  })
  return { ...summaryFor(definition), cases: learnerCases }
}
