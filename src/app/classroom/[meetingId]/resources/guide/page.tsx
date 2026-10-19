import { notFound } from 'next/navigation'
import { getClassroomMeeting } from '@/lib/classroom/content'
import { ResourceDocument } from '@/components/classroom/resource-document'
import styles from '@/components/classroom/resource-print.module.css'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'دليل المعلم | THE TEN', robots: { index: false, follow: false } }

export default async function FacilitatorGuide({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params
  const meeting = await getClassroomMeeting(meetingId)
  if (!meeting) notFound()

  return (
    <ResourceDocument meetingId={meeting.id} title={'دليل المعلم — ' + meeting.titleAr} subtitle={meeting.subtitle} teacher>
      <section aria-labelledby="guide-plan">
        <h2 id="guide-plan">إدارة اللقاء — {meeting.durationMinutes} دقيقة</h2>
        <ol>
          <li>5 دقائق: ترحيب وتعريف بهدف اللقاء.</li>
          <li>10 دقائق: شرح المفردات ومثال محلول بصوت المعلم.</li>
          <li>20 دقيقة: الحالة الأولى — تفكير فردي، نقاش ثنائي، ثم تفسير مشترك.</li>
          <li>20 دقيقة: الحالة الثانية بالطريقة نفسها.</li>
          <li>10 دقائق: مقارنة الحالتين وتوضيح كيف تغيّر المعلومة القرار.</li>
          <li>10 دقائق: مراجعة قصيرة وExit ticket.</li>
        </ol>
        <p>الوقت إرشادي. أبطئ عند الحاجة، واقرأ الحالة بصوت واضح، واطلب سبباً واحداً للاختيار. يمكن أن تكون كل المشاركة شفهية أو على الورق.</p>
        <p>مخطط الشرائح بصيغة RTF قابل للاستيراد أو النسخ إلى PowerPoint. راجع التنسيق قبل العرض؛ هذا الملف ليس عرض PPTX جاهزاً.</p>
      </section>

      {meeting.cases.map((item, index) => (
        <section key={item.id} className={styles.card} aria-labelledby={'case-' + item.id}>
          <p className={styles.kicker}>الحالة {index + 1} · {item.id}</p>
          <h2 id={'case-' + item.id} dir="ltr">{item.title}</h2>
          <h3>هدف التعلم</h3><p>{item.goal}</p>
          <h3>مفردات تشرح قبل السؤال</h3><p dir="ltr">{item.vocab.join(' · ')}</p>
          <h3>اقرأ الحالة</h3><p dir="ltr">{item.stem}</p>
          <h3>السؤال الأساسي</h3><p dir="ltr">{item.question}</p>
          <p>{item.hint}</p>
          <ol type="A" dir="ltr">{item.options.map(option => <li key={option}>{option}</li>)}</ol>
          <div className={styles.teacherNote}>
            <h3>الإجابة ومناقشتها</h3>
            <p dir="ltr">{String.fromCharCode(65 + item.key)}. {item.options[item.key]}</p>
            <p>{item.explain}</p>
          </div>
          <h3>معلومة جديدة للنقاش</h3><p dir="ltr">{item.guided}</p>
          <div className={styles.teacherNote}><h3>ما تتوقعه من النقاش</h3><p>{item.guidedKey}</p></div>
          <h3>عرض Examination</h3><p>{item.exam}</p>
          <h3>شرح دور Investigation</h3><p>{item.test}</p>
          <div className={styles.safety}><h3>Patient safety</h3><p>{item.safety}</p></div>
          <h3>للتوسع عند الحاجة</h3><p>{item.extension}</p>
        </section>
      ))}

      <section aria-labelledby="guide-exit"><h2 id="guide-exit">إغلاق اللقاء</h2><p>اطلب من كل طالب كتابة معلومة واحدة فهمها، ومعلومة جديدة غيّرت تفكيره، وسؤالاً ما زال عنده. هذه مراجعة تعليمية؛ لا تستبدل Pre/Post المعتمد أو سجلاته.</p></section>
      <section aria-labelledby="guide-sources"><h2 id="guide-sources">المصادر</h2><ul>{meeting.sources.map(source => <li key={source.id}><a className={styles.source} href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul></section>
    </ResourceDocument>
  )
}
