import Link from 'next/link'

export type TeacherTask = {
  id: string
  kind: 'primary_rating' | 'second_rating' | 'session'
  title: string
  detail: string
  href: string
  scheduledAt?: string | null
}

function taskLabel(kind: TeacherTask['kind']) {
  if (kind === 'second_rating') return 'SECOND RATING'
  if (kind === 'primary_rating') return 'PRIMARY RATING'
  return 'LIVE SESSION'
}

function taskTone(kind: TeacherTask['kind']) {
  if (kind === 'second_rating') return 'border-[#d8a94e]/55 bg-[#fff8e8] text-[#8b6a2b]'
  if (kind === 'primary_rating') return 'border-[#73b6b2]/45 bg-[#edf7f4] text-[#1f6668]'
  return 'border-[#315b5d]/35 bg-[#f2f6f3] text-[#17363a]'
}

function formatSchedule(value?: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat('en-IQ', {
    timeZone: 'Asia/Baghdad',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function TeacherTaskCenter({ tasks }: { tasks: TeacherTask[] }) {
  const grading = tasks.filter(task => task.kind !== 'session')
  const secondRatings = tasks.filter(task => task.kind === 'second_rating')
  const sessions = tasks.filter(task => task.kind === 'session')
  const visible = tasks.slice(0, 8)
  const hiddenCount = Math.max(0, tasks.length - visible.length)

  return <section className="mb-8 overflow-hidden rounded-[2rem] border border-[#d8ccb6] bg-[#fffdf8] shadow-[0_18px_55px_rgba(23,54,58,.08)]" aria-labelledby="teacher-task-center-title">
    <div className="border-b border-[#e4d9c6] bg-[#17363a] px-5 py-5 text-white sm:px-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-[.18em] text-[#f2d99b]">YOUR WORK QUEUE</p>
          <h2 id="teacher-task-center-title" className="mt-2 font-serif text-3xl">What needs your attention</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d8e7e2]">Only work assigned to you appears here. Written responses remain blinded while you score them.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="min-w-20 rounded-2xl border border-white/15 bg-white/10 px-3 py-2"><strong className="block text-xl">{grading.length}</strong><span className="text-[10px] font-bold tracking-wide text-[#d8e7e2]">RATINGS</span></div>
          <div className="min-w-20 rounded-2xl border border-white/15 bg-white/10 px-3 py-2"><strong className="block text-xl">{secondRatings.length}</strong><span className="text-[10px] font-bold tracking-wide text-[#d8e7e2]">SECOND</span></div>
          <div className="min-w-20 rounded-2xl border border-white/15 bg-white/10 px-3 py-2"><strong className="block text-xl">{sessions.length}</strong><span className="text-[10px] font-bold tracking-wide text-[#d8e7e2]">SESSIONS</span></div>
        </div>
      </div>
    </div>

    <div className="p-4 sm:p-6">
      {visible.length ? <div className="grid gap-3 lg:grid-cols-2">
        {visible.map(task => {
          const schedule = formatSchedule(task.scheduledAt)
          return <Link key={task.id} href={task.href} className="group rounded-2xl border border-[#e2d7c5] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#b9aa91] hover:shadow-[0_10px_28px_rgba(23,54,58,.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#46b9bd]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[.12em] ${taskTone(task.kind)}`}>{taskLabel(task.kind)}</span>
                <h3 className="mt-3 font-serif text-xl text-[#17363a]">{task.title}</h3>
                <p className="mt-1 text-sm leading-6 text-[#526c6e]">{task.detail}</p>
                {schedule ? <p className="mt-2 text-xs font-bold text-[#8b6a2b]">{schedule}</p> : null}
              </div>
              <span className="mt-1 text-lg font-black text-[#1f6668]" aria-hidden="true">→</span>
            </div>
          </Link>
        })}
      </div> : <div className="rounded-2xl border border-dashed border-[#cfc1a9] bg-[#faf5e9] px-5 py-8 text-center">
        <h3 className="font-serif text-2xl text-[#17363a]">No pending tasks.</h3>
        <p className="mt-2 text-sm text-[#526c6e]">New rubric ratings, second ratings, and assigned live sessions will appear here automatically.</p>
      </div>}
      {hiddenCount ? <p className="mt-4 text-center text-sm font-bold text-[#526c6e]">+ {hiddenCount} more assigned task{hiddenCount === 1 ? '' : 's'} in your program queues.</p> : null}
    </div>
  </section>
}
