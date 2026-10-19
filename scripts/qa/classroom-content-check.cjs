const assert = require('node:assert/strict')
const fs = require('node:fs')
const { stripTypeScriptTypes } = require('node:module')
const path = require('node:path')
const root = path.resolve(__dirname, '../..')
const learnerApproved = JSON.parse(fs.readFileSync(root + '/src/lib/classroom/content.learner.v2.json', 'utf8'))

// Synthetic teacher fixture: deliberately contains no real answer keys or teacher content.
const approved = {
  cases: learnerApproved.cases.map((item, index) => ({
    id: item.id,
    mission: index < 4 ? 'M01' : index < 6 ? 'M02' : index < 8 ? 'M03' : 'M04',
    session: Math.floor(index / 2) + 1,
    title: 'Synthetic encounter ' + (index + 1),
    source: learnerApproved.sources[index][0],
    goal: 'Synthetic test goal',
    vocab: ['Synthetic vocabulary'],
    stem: 'Synthetic test case.',
    question: 'Synthetic test question?',
    hint: 'Synthetic test hint.',
    options: ['Synthetic choice A', 'Synthetic choice B'],
    key: 0,
    explain: 'Synthetic test explanation.',
    guided: 'Synthetic test follow-up?',
    guidedKey: 'Synthetic test response.',
    exam: 'Synthetic examination note.',
    test: 'Synthetic investigation note.',
    safety: 'Synthetic safety note.',
    extension: 'Synthetic extension note.',
  })),
  slides: Array.from({ length: 20 }, (_, index) => ({
    id: 'synthetic-slide-' + (index + 1),
    title: 'شريحة اختبار ' + (index + 1),
    body: ['Synthetic test slide.'],
  })),
  sources: learnerApproved.sources,
}

function load(file, bindings) {
  const source = fs.readFileSync(root + '/' + file, 'utf8')
  const names = [...source.matchAll(/export (?:async )?(?:function|const) ([A-Za-z0-9_]+)/g)].map(match => match[1])
  const compiled = stripTypeScriptTypes(source, { mode: 'transform' })
    .replace(/^import 'server-only';?\s*$/gm, '')
    .replace(/^import (\w+) from '([^']+)';?\s*$/gm, "const $1 = require('$2')")
    .replace(/^import \{ ([^}]+) \} from '([^']+)';?\s*$/gm, "const { $1 } = require('$2')")
    .replace(/^export /gm, '') + '\nmodule.exports = {' + names.join(',') + '};'
  const module = { exports: {} }
  Function('require', 'module', 'exports', compiled)(id => {
    if (Object.hasOwn(bindings, id)) return bindings[id]
    throw new Error('Unexpected import ' + id)
  }, module, module.exports)
  return module.exports
}

let permitted = true
let authChecks = 0
let databaseReads = 0
let databaseMode = 'valid'
const access = { requireClassroomTeacher: async () => {
  authChecks++
  if (!permitted) throw new Error('denied')
  return { supabase: { from(table) {
    assert.equal(table, 'classroom_teaching_content')
    return { select(fields) {
      assert.equal(fields, 'payload')
      return { eq(column, version) {
        assert.equal(column, 'content_version')
        assert.equal(version, '2.0-approved-foundation')
        return { async maybeSingle() {
          databaseReads++
          if (databaseMode === 'error') return { error: { message: 'denied' }, data: null }
          if (databaseMode === 'invalid') return { error: null, data: { payload: { cases: [] } } }
          return { error: null, data: { payload: approved } }
        } }
      } }
    } }
  } } }
} }

const content = load('src/lib/classroom/content.ts', {
  './content.learner.v2.json': learnerApproved,
  './access': access,
})
const summaries = content.getClassroomMeetingSummaries()
const forbidden = new Set(['key', 'guidedKey', 'explain', 'exam', 'test', 'safety', 'extension', 'slides', 'goal'])
function safe(value) {
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    assert(!forbidden.has(key), 'Learner property leak: ' + key)
    safe(child)
  }
}
safe(learnerApproved)
safe(summaries)
assert.equal(summaries.length, 5)
assert.equal(new Set(summaries.flatMap(meeting => meeting.caseIds)).size, 10)
assert.deepEqual(summaries.map(meeting => meeting.missionCodes), [['M01'], ['M01'], ['M02'], ['M03'], ['M04']])
for (const summary of summaries) {
  safe(content.getClassroomLearnerMeeting(summary.id))
  assert.equal(content.getClassroomLearnerMeeting(summary.id).cases.length, 2)
}
assert.equal(authChecks, 0, 'Learner/public getters must not request teacher data')
assert.equal(databaseReads, 0)
assert(!fs.existsSync(root + '/src/lib/classroom/content.v2.json'))
assert(!fs.readFileSync(root + '/src/lib/classroom/content.ts', 'utf8').includes('.private'))
assert.equal(content.getClassroomLearnerMeeting('missing'), undefined)

const resourceDocument = fs.readFileSync(root + '/src/components/classroom/resource-document.tsx', 'utf8')
assert(resourceDocument.includes("href={'/classroom/' + meetingId + '/resources/presentation'}"),
  'Teacher presentation download must include the current meeting ID')
assert(resourceDocument.includes("href={teacher ? '/classroom' : '/learner/sessions'}"),
  'Teacher return link must point to the classroom overview')
const route = load('src/app/classroom/[meetingId]/resources/presentation/route.ts', {
  '@/lib/classroom/content': content,
})
;(async () => {
  for (const summary of summaries) {
    const teacher = await content.getClassroomMeeting(summary.id)
    assert.equal(teacher.cases.length, 2)
    for (const item of teacher.cases) {
      assert(Number.isInteger(item.key) && item.key >= 0 && item.key < item.options.length)
      assert(teacher.sources.some(source => source.id === item.source))
    }
    const response = await route.GET(new Request('https://example.test'), { params: Promise.resolve({ meetingId: summary.id }) })
    const rtf = await response.text()
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store, max-age=0')
    assert(response.headers.get('Content-Disposition').endsWith('_outline.rtf"'))
    assert(rtf.startsWith('{\\rtf1'))
    assert(rtf.includes('\\outlinelevel0'))
    assert(!/[\u0600-\u06ff]/.test(rtf))
  }
  assert.deepEqual((await content.getClassroomMeeting('meeting-1')).slides, approved.slides)
  const readsBeforeMissing = databaseReads
  assert.equal(await content.getClassroomMeeting('missing'), undefined)
  assert.equal(databaseReads, readsBeforeMissing)
  const missing = await route.GET(new Request('https://example.test'), { params: Promise.resolve({ meetingId: 'missing' }) })
  assert.equal(missing.status, 404)
  databaseMode = 'error'
  await assert.rejects(() => content.getClassroomMeeting('meeting-1'), /unavailable/)
  databaseMode = 'invalid'
  await assert.rejects(() => content.getClassroomMeeting('meeting-1'), /unavailable/)
  databaseMode = 'valid'
  permitted = false
  const readsBeforeDeny = databaseReads
  await assert.rejects(() => content.getClassroomMeeting('meeting-1'), /denied/)
  await assert.rejects(() => route.GET(new Request('https://example.test'), { params: Promise.resolve({ meetingId: 'meeting-1' }) }), /denied/)
  assert.equal(databaseReads, readsBeforeDeny)
  console.log('PASS: safe JSON has no answer keys/teacher fields/slides; sync public+learner getters perform no auth/DB calls; 5 async teacher meetings read the protected versioned DB payload; 20 source slides preserved; RTF downloads private/no-store; missing meetings 404; denied auth blocks DB reads; DB errors and invalid payload fail closed; full source absent from src and never imported; resource download URL retains its meeting ID and teacher return link points to the overview.')
})().catch(error => { console.error(error); process.exitCode = 1 })
