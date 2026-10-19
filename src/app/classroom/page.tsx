import Link from 'next/link'
import { getClassroomWorkspace } from '@/lib/classroom/data'
import { createClassroomMeetings } from '@/lib/classroom/actions'
import { getClassroomMeetingSummaries } from '@/lib/classroom/content'
import { ClassroomSubmit } from '@/components/classroom/submit-button'
import styles from '@/components/classroom/workspace.module.css'

type ReviewTask = { response_id: string; assessment_title: string; question_code: string; assigned_to_me: boolean; assignment_status: string; existing_review_status: string | null; finalized: boolean }
const messages: Record<string,string> = {
  initialize: 'تعذر تجهيز اللقاءات. حاول مجددًا، أو راجع مسؤول البرنامج.',
  setup: 'تعذر تجهيز اللقاءات. حاول مجددًا، أو راجع مسؤول البرنامج.',
  attendance: 'لم يُحفظ الحضور. راجع الاختيارات ثم أعد المحاولة.',
  meeting: 'لم يُحفظ سجل اللقاء. راجع المدخلات ثم أعد المحاولة.',
  invalid: 'راجع المدخلات قبل الحفظ.',
  forbidden: 'هذا الإجراء غير متاح لهذا الحساب.',
}
function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat('ar-IQ', { timeZone:'Asia/Baghdad', dateStyle:'medium', timeStyle:'short' }).format(new Date(value)) : 'لم يحدد الموعد بعد'
}
export default async function ClassroomHome({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}) {
  const query = await searchParams
  const workspace = await getClassroomWorkspace()
  const summaries = getClassroomMeetingSummaries()
  const cohorts = new Map(workspace.cohorts.map(cohort => [cohort.id,cohort]))
  const queue = await Promise.all(workspace.context.programIds.map(async programId => {
    const {data,error} = await workspace.context.supabase.rpc('ten_review_queue',{target_program_id:programId})
    return {programId,error,rows:(data ?? []) as ReviewTask[]}
  }))
  const reviewTasks = queue.flatMap(item => item.rows.filter(row => row.assigned_to_me && row.assignment_status === 'assigned' && row.existing_review_status !== 'submitted' && !row.finalized).map(row => ({...row,programId:item.programId})))
  const reviewAvailable = queue.every(item => !item.error)
  const next = [...workspace.meetings].filter(meeting => meeting.status !== 'completed').sort((a,b) => {
    if(a.scheduled_at && b.scheduled_at) return a.scheduled_at.localeCompare(b.scheduled_at)
    if(a.scheduled_at) return -1
    if(b.scheduled_at) return 1
    return a.meeting_key.localeCompare(b.meeting_key)
  })[0]
  const nextContent = summaries.find(item => item.id === next?.meeting_key)
  return <main dir="rtl" lang="ar" className={styles.page}>
    <div className={styles.container}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>THE TEN · BAGHDAD NEXUS</p><h1>جلساتك الحضورية</h1><p className={styles.intro}>افتح اللقاء، جهّز العرض، ثم تابع الحضور والتصحيح.</p></div>
        <nav aria-label="روابط المعلم" className={styles.nav}><Link href="/grading">التصحيح</Link><Link href="/learner">خطة الطالب</Link><Link href="/dashboard">حسابي</Link></nav>
      </header>
      {query.saved && <p role="status" className={styles.success}>حُفظ التغيير بنجاح.</p>}
      {query.error && <p role="alert" className={styles.error}>{messages[query.error] ?? 'لم يكتمل الإجراء. راجع البيانات ثم أعد المحاولة.'}</p>}
      {!workspace.available && <section role="alert" className={styles.error}><h2>سجل اللقاءات غير متاح حاليًا</h2><p>يمكنك فتح ملفات التدريس أدناه. تسجيل الحضور يحتاج إلى استعادة الاتصال وإعداد سجل الدفعة.</p></section>}
      <section className={styles.focus} aria-labelledby="next-meeting">
        <p className={styles.eyebrow}>اللقاء القادم</p>
        <h2 id="next-meeting">{nextContent?.titleAr ?? (workspace.meetings.length ? 'اكتملت اللقاءات المسجلة' : 'جهّز أول لقاء لدفعتك')}</h2>
        {next && nextContent ? <><p>{cohorts.get(next.cohort_id)?.name} · {dateLabel(next.scheduled_at)}</p><p>{nextContent.focus}</p><Link className={styles.primary} href={`/classroom/meetings/${next.id}`}>فتح اللقاء</Link></> : <p>ملفات اللقاءات الخمسة جاهزة أدناه. عند تجهيز سجل الدفعة، يظهر اللقاء القادم هنا.</p>}
      </section>
      <section className={styles.review} aria-labelledby="review-title">
        <div><h2 id="review-title">مهام التصحيح</h2><p>{reviewAvailable ? `لديك ${reviewTasks.length} إجابة مسندة تحتاج إلى مراجعة.` : 'تعذر تحديث العدد الآن. افتح صفحة التصحيح لمراجعة المهام.'}</p></div>
        <Link className={styles.secondary} href="/grading">فتح التصحيح</Link>
        {reviewTasks.length > 0 && <ul className={styles.taskList}>{reviewTasks.slice(0,3).map(task => <li key={task.response_id}><Link href={`/programs/${task.programId}/assessment/grading/${task.response_id}`}><bdi>{task.assessment_title} · {task.question_code}</bdi></Link></li>)}</ul>}
      </section>
      <section aria-labelledby="cohorts-title"><h2 id="cohorts-title" className={styles.sectionTitle}>دفعاتك</h2>
        {workspace.cohorts.length === 0 ? <p className={styles.empty}>لا توجد دفعة مسندة لهذا الحساب. يربط مسؤول البرنامج المعلم بدفعته.</p> : workspace.cohorts.map(cohort => {
          const records = workspace.meetings.filter(meeting => meeting.cohort_id === cohort.id)
          return <article className={styles.cohort} key={cohort.id}>
            <div className={styles.cohortHeading}><div><h3>{cohort.name}</h3><p>{records.filter(meeting => meeting.status === 'completed').length} من 5 لقاءات مكتملة</p></div>
              {records.length < 5 && workspace.available && <form action={createClassroomMeetings.bind(null,cohort.id)}><ClassroomSubmit label="تجهيز اللقاءات الخمسة" pendingLabel="جارٍ التجهيز…" /></form>}
            </div>
            <ol className={styles.meetingList}>{summaries.map(content => {
              const record = records.find(meeting => meeting.meeting_key === content.id)
              return <li key={content.id}><span className={styles.number}>{content.number}</span><div><h4>{content.titleAr}</h4><p>{record ? dateLabel(record.scheduled_at) : 'السجل لم يُجهّز بعد'}</p></div><span className={styles.status}>{record?.status === 'completed' ? 'مكتمل' : record ? 'قادم' : 'غير مسجل'}</span>{record && <Link className={styles.textLink} href={`/classroom/meetings/${record.id}`}>فتح اللقاء</Link>}</li>
            })}</ol>
          </article>
        })}
      </section>
      <section aria-labelledby="resources-title"><h2 id="resources-title" className={styles.sectionTitle}>ملفات التدريس</h2><p className={styles.muted}>نزّل المخطط والورقة قبل الجلسة. بعد استيراد المخطط إلى PowerPoint وحفظ العرض، يمكنك تقديمه دون اتصال.</p>
        <div className={styles.resourceList}>{summaries.map(content => <article key={content.id}><div><p className={styles.eyebrow}>اللقاء {content.number} · {content.durationMinutes} دقيقة</p><h3>{content.titleAr}</h3><p><bdi>{content.subtitle}</bdi></p></div><div className={styles.resourceLinks}><a href={`/classroom/${content.id}/resources/presentation`}>مخطط PowerPoint (RTF)</a><Link href={`/classroom/${content.id}/resources/worksheet`}>ورقة الطالب</Link><Link href={`/classroom/${content.id}/resources/guide`}>دليل المعلم</Link></div></article>)}</div>
      </section>
      <details className={styles.advanced}><summary>أدوات إضافية</summary><p>إدارة البرنامج والتجربة التفاعلية والتقييمات الرسمية.</p><div className={styles.nav}><Link href="/facilitator/the-ten/advanced">غرفة التحكم المتقدمة</Link><Link href="/dashboard">إدارة البرنامج</Link><Link href="/learner/world">عالم بغداد</Link></div></details>
    </div>
  </main>
}
