import { notFound } from 'next/navigation'
import { requireClassroomParticipant } from '@/lib/classroom/access'
import { getClassroomLearnerMeeting } from '@/lib/classroom/content'
import { ResourceDocument } from '@/components/classroom/resource-document'
import styles from '@/components/classroom/resource-print.module.css'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'ورقة الطالب | THE TEN', robots: { index: false, follow: false } }

export default async function StudentWorksheet({ params }: { params: Promise<{ meetingId: string }> }) {
  await requireClassroomParticipant()
  const { meetingId } = await params
  const meeting = getClassroomLearnerMeeting(meetingId)
  if (!meeting) notFound()

  return (
    <ResourceDocument meetingId={meeting.id} title={'ورقة الطالب — ' + meeting.titleAr} subtitle={meeting.subtitle}>
      <div className={styles.meta}><span>الاسم:</span><span>المجموعة:</span><span>التاريخ:</span></div>
      <p>اقرأ أو استمع للحالة. اختر أولاً وحدك، ثم ناقش سبب اختيارك مع زميلك. يمكنك تعديل رأيك بعد النقاش.</p>
      {meeting.cases.map((item, index) => (
        <section key={item.id} className={styles.card} aria-labelledby={'worksheet-' + item.id}>
          <p className={styles.kicker}>الحالة {index + 1} · {item.id}</p>
          <h2 id={'worksheet-' + item.id} dir="ltr">{item.title}</h2>
          <h3>مفردات اللقاء</h3><p dir="ltr">{item.vocab.join(' · ')}</p>
          <p dir="ltr">{item.stem}</p>
          <h3>السؤال</h3><p dir="ltr">{item.question}</p>
          <p>{item.hint}</p>
          <ol type="A" dir="ltr">{item.options.map(option => <li key={option}>{option}</li>)}</ol>
          <p>اختياري الأول وسبب واحد يدعمه:</p><div className={styles.answerSpace} aria-hidden="true" />
          <p>بعد النقاش: ما الذي بقي أو تغيّر في رأيي؟</p><div className={styles.answerSpace} aria-hidden="true" />
          <h3>معلومة جديدة</h3><p dir="ltr">{item.guided}</p>
          <p>ما الذي أستنتجه؟ ولماذا؟</p><div className={styles.answerSpace} aria-hidden="true" />
        </section>
      ))}
      <section className={styles.card} aria-labelledby="worksheet-exit">
        <h2 id="worksheet-exit">Exit ticket</h2>
        <p>فكرة واحدة أريد أن أتذكرها:</p><div className={styles.answerLine} aria-hidden="true" />
        <p>معلومة غيّرت طريقة تفكيري:</p><div className={styles.answerLine} aria-hidden="true" />
        <p>سؤال أريد أن أراجعه:</p><div className={styles.answerLine} aria-hidden="true" />
      </section>
    </ResourceDocument>
  )
}
