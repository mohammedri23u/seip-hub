import Link from 'next/link'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { getLearnerClassroomMeetings } from '@/lib/classroom/learner-data'
import styles from '@/components/classroom/completion.module.css'

export const metadata = { title: 'THE TEN · إكمال البرنامج الحضوري' }
export default async function InPersonCompletion() {
  const classroom = await getLearnerClassroomMeetings()
  return <LearnerShell lang="ar" active="/learner/completion" title="رحلتك تكتمل بالمشاركة." intro="متطلبات البرنامج الحضوري حسب المقترح v2.1، مع متابعة الحضور المسجل من مجموعتك.">
    <section className={styles.hero}><p>THE TEN · IN-PERSON COMPLETION</p><h2>تعلّم، شارك، وراجع تفكيرك.</h2><p>المشاركة البحثية وAI اختياريان، ولا يدخلان ضمن شروط إكمال البرنامج.</p></section>
    <section className={styles.card} aria-labelledby="own-attendance"><h2 id="own-attendance">حضوري المسجّل</h2>
      {!classroom.available ? <p role="status">{classroom.error}</p> : classroom.cohorts.length === 0 ? <p>لا توجد مجموعة حضورية مرتبطة بحسابك حاليًا. راجع المعلم لربط المجموعة.</p> : classroom.cohorts.map(cohort => {
        const records = classroom.meetings.filter(meeting => meeting.cohortId === cohort.id)
        const attended = records.filter(meeting => meeting.attendance === 'present' || meeting.attendance === 'late').length
        return <div className={styles.attendance} key={cohort.id}><strong>{cohort.name}</strong><span>{attended} من 5 لقاءات بحالة حضور أو تأخير مسجّلة</span><small>{records.filter(meeting => meeting.attendance === null).length} لقاءات مجهّزة دون حالة حضور مسجّلة. عدم التسجيل لا يعني الغياب.</small></div>
      })}
      <Link href="/learner/sessions" className="ten-text-link">عرض تفاصيل اللقاءات والحضور</Link>
    </section>
    <section className={styles.card} aria-labelledby="requirements"><h2 id="requirements">قائمة الإكمال الحضوري</h2><p>يعتمد المعلم السجل النهائي بعد مراجعة المتطلبات التالية. هذه الصفحة لا تستنتج إكمال أعمال غير مسجلة.</p><ol className={styles.requirements}>
      <li><b>01</b><div><strong>حضور أربعة لقاءات من خمسة على الأقل</strong><p>مع مراجعة المعلم لأي غياب أوحضور متأخر.</p></div></li>
      <li><b>02</b><div><strong>المرور بجميع Clinical Encounters العشرة</strong><p>تعوّض الحالة الفائتة بعمل موجّه قصير يراجعه المعلم.</p></div></li>
      <li><b>03</b><div><strong>تسليم خمسة Exit tickets</strong><p>يتأكد المعلم من الأوراق أوالسجل التعليمي لكل لقاء.</p></div></li>
      <li><b>04</b><div><strong>محاولتا Quick Pre وQuick Post</strong><p>إكمال المحاولتين التعليميتين؛ درجة Research Form ليست شرطًا للشهادة.</p></div></li>
    </ol><p className={styles.note}>تعويض الحالات وExit tickets وQuick tests v2.1 تحتاج توثيقًا واعتمادًا من المعلم؛ لا تمنح الزيارة أوالمعاينة مفتاحًا أوشهادة.</p></section>
    <details className={styles.legacy}><summary>سجل الشهادات الإلكتروني السابق</summary><p>المسار الإلكتروني السابق له شروطه وإصداراته المحفوظة. لا تُحوّل نتائجه تلقائيًا إلى متطلبات المقترح الحضوري v2.1.</p><Link href="/learner/certificate" className="ten-text-link">فتح السجل السابق</Link></details>
  </LearnerShell>
}
