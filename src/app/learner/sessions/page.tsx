import Link from 'next/link'
import { ClassroomMeetingOutline } from '@/components/classroom/learner-overview'
import styles from '@/components/classroom/learner-overview.module.css'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { SessionCards } from '@/components/the-ten/journey-overview'
import { getClassroomMeetingSummaries } from '@/lib/classroom/content'
import { getLearnerClassroomMeetings } from '@/lib/classroom/learner-data'
import { getLearnerJourney } from '@/lib/the-ten/learner-data'

const attendanceLabels = {
  present: 'حاضر',
  late: 'حاضر بتأخير',
  absent: 'غائب',
  excused: 'غياب بعذر',
} as const

function scheduledLabel(value: string | null) {
  if (!value) return 'لم يُحدد بعد'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'راجع المعلم لتأكيد الموعد'
  return new Intl.DateTimeFormat('ar-IQ', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Baghdad',
  }).format(date)
}

export default async function LearnerSessions() {
  const [classroom, legacy] = await Promise.all([
    getLearnerClassroomMeetings(),
    getLearnerJourney().then(data => ({ data, failed: false }), () => ({ data: null, failed: true })),
  ])
  const summaries = getClassroomMeetingSummaries()

  return <LearnerShell active="/learner/sessions" lang="ar" title="لقاءاتنا الحضورية"
    intro="خمسة لقاءات، وفي كل لقاء حالتان قصيرتان ونقاش يقوده المعلم. تظهر هنا المواعيد وحالة حضورك كما سجّلها المعلم لمجموعتك.">
    <section aria-labelledby="classroom-schedule-heading">
      <div className={styles.sectionHeading}>
        <div><p className={styles.eyebrow}>سجل اللقاءات الحضورية</p><h2 id="classroom-schedule-heading">مواعيدي وحضوري</h2></div>
        <span className={styles.smallNote}>جميع الأوقات بتوقيت بغداد</span>
      </div>
      {!classroom.available ? <div role="status" className="ten-notice ten-notice-error">
        <p>{classroom.error}</p><Link className="ten-text-link" href="/learner/sessions" prefetch={false}>إعادة المحاولة</Link>
      </div> : classroom.cohorts.length === 0 ? <div className="ten-notice">
        <p>لا توجد مجموعة حضورية مفعّلة مرتبطة بحسابك حالياً. راجع المعلم لتأكيد المجموعة والموعد، ويمكنك الاطلاع على خطة اللقاءات أدناه.</p>
      </div> : <ol className={styles.meetingList}>
        {summaries.map(meeting => <li className={styles.meeting} key={meeting.id}>
          <span className={styles.meetingNumber} aria-hidden="true">{String(meeting.number).padStart(2, '0')}</span>
          <div className={styles.meetingBody}>
            <p className={styles.meetingMeta}>اللقاء {meeting.number} · نحو {meeting.durationMinutes} دقيقة</p>
            <h3>{meeting.titleAr}</h3><p className={styles.subtitle}>{meeting.subtitle}</p>
            <div className={styles.cohortRecords}>
              {classroom.cohorts.map(cohort => {
                const record = classroom.meetings.find(item => item.meetingKey === meeting.id && item.cohortId === cohort.id)
                return <dl className={styles.scheduleFacts} key={cohort.id}>
                  <div><dt>المجموعة</dt><dd>{cohort.name}</dd></div>
                  <div><dt>الموعد</dt><dd>{record?.scheduledAt ?
                    <time dateTime={record.scheduledAt}>{scheduledLabel(record.scheduledAt)}</time> : 'لم يُحدد بعد'}</dd></div>
                  <div><dt>حالة اللقاء</dt><dd>{record ? record.status === 'completed' ? 'مكتمل' : 'مخطط' : 'بانتظار تجهيز المعلم'}</dd></div>
                  <div><dt>حضوري</dt><dd>{record?.attendance ? attendanceLabels[record.attendance] : 'لم يُسجل بعد'}</dd></div>
                </dl>
              })}
            </div>
            <a className={styles.worksheetLink} href={`/classroom/${meeting.id}/resources/worksheet`}>فتح ورقة الطالب للطباعة<span aria-hidden="true"> ←</span></a>
          </div>
        </li>)}
      </ol>}
      {classroom.available && classroom.cohorts.length > 0 ?
        <p className={styles.planNote}>المعلم يسجّل حضورك. ظهور «لم يُسجل بعد» يعني أن حالة الحضور لم تُسجل، ولا يُعدّ غياباً.</p> : null}
    </section>

    {(!classroom.available || classroom.cohorts.length === 0) ? <ClassroomMeetingOutline /> : null}

    <details className={styles.legacyRecords}>
      <summary>سجلات البرنامج السابقة والإضافية</summary>
      <p className={styles.planNote}>هذه سجلات البرنامج المحفوظة سابقاً أو جلساته الإضافية. سجل اللقاءات الحضورية الخمسة يظهر في القسم أعلاه.</p>
      {legacy.failed || !legacy.data ? <div role="status" className="ten-notice ten-spaced"><p>تعذّر تحميل السجلات السابقة حالياً. حدّث الصفحة وحاول مجدداً.</p></div> :
        <div dir="ltr" lang="en" className="ten-spaced"><SessionCards data={legacy.data} /></div>}
    </details>
  </LearnerShell>
}
