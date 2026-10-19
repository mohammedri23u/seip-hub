import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
const source = readFileSync(new URL('../../src/lib/classroom/candidate-import.ts', import.meta.url), 'utf8')
const { importCandidateMeeting } = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source, { mode: 'transform' })).toString('base64'))
const fixture = { version: '2.2-draft-for-clinical-signoff', sessions: Array.from({ length: 5 }, (_, index) => ({ id: 'S' + (index + 1), clinicalReview: 'Pending named signoff', outcomes: ['Synthetic objective'], slides: Array.from({ length: 24 }, (_, i) => ({ id: `S${index + 1}-${i + 1}`, title: 'Synthetic slide', body: ['Synthetic material'], notes: 'Teacher-only synthetic note', kind: i === 9 ? 'DU_reveal' : i === 15 ? 'PI_reveal' : 'teaching' })), workedExample: { key: 'DO_NOT_PROJECT' }, exitTicket: { key: 'DO_NOT_PROJECT' } })), references: [] }
const pack = process.env.TEN_CANDIDATE_FILE ? JSON.parse(readFileSync(process.env.TEN_CANDIDATE_FILE, 'utf8')) : fixture
let reveals = 0
for (let number = 1; number <= 5; number++) {
  const summary = { id: `meeting-${number}`, number, titleAr: 'Synthetic', subtitle: 'Synthetic', durationMinutes: 75, missionCodes: ['M01'], learnerGoals: [], caseIds: [], caseTitles: [], title: 'Synthetic', mission: 'M01', focus: '', description: '' }
  const result = importCandidateMeeting(pack, summary)
  assert.equal(result.slides.length, 24)
  assert.equal(result.reviewStatus, 'pending_named_clinical_supervisor_signoff')
  assert.equal(result.cases.length, 0)
  assert(!JSON.stringify(result).includes('DO_NOT_PROJECT'))
  reveals += result.slides.filter(slide => ['DU_reveal', 'PI_reveal'].includes(slide.kind)).length
}
assert.equal(reveals, 10)
const invalid = structuredClone(fixture); invalid.sessions[0].slides[9].kind = 'teaching'
assert.throws(() => importCandidateMeeting(invalid, { number: 1 }), /PI/)
assert.throws(() => importCandidateMeeting({ ...fixture, version: 'approved' }, { number: 1 }), /v2.2/)
const stage = readFileSync(new URL('../../src/components/classroom/session-stage.tsx', import.meta.url), 'utf8')
assert(stage.includes("slide.kind === 'PI_reveal' || slide.kind === 'DU_reveal'"))
const route = readFileSync(new URL('../../src/app/classroom/[meetingId]/candidate/page.tsx', import.meta.url), 'utf8')
assert(route.includes('await getClassroomCandidateMeeting(meetingId)'))
const getter = readFileSync(new URL('../../src/lib/classroom/candidate.ts', import.meta.url), 'utf8')
assert(getter.indexOf('await requireClassroomTeacher()') < getter.indexOf(".from('classroom_teaching_content')"))
console.log('PASS 5 × 24 candidate slides,10 explicit PI/DU reveal gates, pending clinical signoff, strict projection, incomplete/version rejection, teacher authorization before protected reads')
