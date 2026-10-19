export type ClassroomMissionCode = 'M01' | 'M02' | 'M03' | 'M04'

/** Public, answer-free metadata. Safe to pass to a Client Component. */
export type ClassroomMeetingSummary = {
  id: string
  number: number
  titleAr: string
  subtitle: string
  durationMinutes: number
  missionCodes: ClassroomMissionCode[]
  learnerGoals: string[]
  caseIds: string[]
  caseTitles: string[]
  title: string
  mission: ClassroomMissionCode
  focus: string
  description: string
}

export type ClassroomSource = {
  id: string
  title: string
  url: string
}

export type ClassroomSlide = {
  id: string
  title: string
  body: string[]
}

/** Approved formative teaching material; never pass this type to a learner. */
export type ClassroomTeachingCase = {
  id: string
  mission: ClassroomMissionCode
  session: number
  title: string
  source: string
  goal: string
  vocab: string[]
  stem: string
  question: string
  hint: string
  options: string[]
  key: number
  explain: string
  guided: string
  guidedKey: string
  exam: string
  test: string
  safety: string
  extension: string
}

export type ClassroomMeeting = ClassroomMeetingSummary & {
  cases: ClassroomTeachingCase[]
  slides: ClassroomSlide[]
  sources: ClassroomSource[]
}

/** Deliberate allow-list: no correct option, rationale or teacher notes. */
export type ClassroomLearnerCase = {
  id: string
  title: string
  vocab: string[]
  stem: string
  question: string
  hint: string
  options: string[]
  guided: string
}

export type ClassroomLearnerMeeting = ClassroomMeetingSummary & {
  cases: ClassroomLearnerCase[]
}
