import Link from 'next/link'
import { getClassroomCandidateMeeting } from '@/lib/classroom/candidate'
import styles from '@/components/classroom/workspace.module.css'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'دليل مراجعة المنهج المرشح | THE TEN', robots: { index: false, follow: false } }
export default async function CandidateGuide({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params
  const meeting = await getClassroomCandidateMeeting(meetingId)
  return <main className={styles.page} dir="rtl" lang="ar"><div className={styles.container}><header className={styles.header}><div><p className={styles.eyebrow}>THE TEN · CLINICAL REVIEW CANDIDATE</p><h1>دليل المراجعة العلمية · v2.2</h1></div><Link className={styles.secondary} href={`/classroom/${meetingId}/candidate`}>معاينة العرض</Link></header>{!meeting ? <p className={styles.error}>لم يتأكد رفع المادة المرشحة كاملة إلى المصدر المحمي بعد.</p> : <><p className={styles.error}>هذه مادة مرشحة؛ اعتماد المشرف السريري بالاسم لم يُسجّل. لا تتضمن هذه الصفحة Research Forms أوإجابات الطلاب.</p><section className={styles.lesson}><h2>{meeting.titleAr}</h2><ul>{meeting.learnerGoals.map(goal => <li key={goal}>{goal}</li>)}</ul></section>{meeting.slides.map((slide, index) => <section className={styles.cohort} key={slide.id}><p className={styles.eyebrow}>{index + 1} / 24 · <bdi>{slide.kind}</bdi></p><h2 dir="auto">{slide.title}</h2>{slide.body.map((line, lineIndex) => <p key={lineIndex} dir="auto">{line}</p>)}<details><summary>ملاحظات المعلم والمراجعة</summary><p dir="auto">{slide.notes}</p></details></section>)}<section className={styles.cohort}><h2>المصادر</h2>{meeting.sources.map(source => <p key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.id} · {source.title}</a></p>)}</section></>}</div></main>
}
