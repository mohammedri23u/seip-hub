import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getClassroomMeetingRecord } from '@/lib/classroom/data'
import { getClassroomMeeting } from '@/lib/classroom/content'
import { saveClassroomAttendance,saveClassroomMeeting } from '@/lib/classroom/actions'
import { ClassroomSubmit } from '@/components/classroom/submit-button'
import styles from '@/components/classroom/workspace.module.css'

function baghdadInput(value:string|null) {
  if(!value) return ''
  return new Date(new Date(value).getTime()+3*60*60*1000).toISOString().slice(0,16)
}
export default async function ClassroomMeetingPage({params,searchParams}:{params:Promise<{recordId:string}>;searchParams:Promise<{saved?:string;error?:string}>}) {
  const {recordId}=await params
  const query=await searchParams
  const record=await getClassroomMeetingRecord(recordId)
  if(!record) notFound()
  const {meeting,cohort,learners,attendance}=record
  const content=await getClassroomMeeting(meeting.meeting_key)
  if(!content) notFound()
  const labels:Record<string,string>={present:'حاضر',late:'متأخر',absent:'غائب',excused:'معذور'}
  return <main dir="rtl" lang="ar" className={styles.page}><div className={styles.container}>
    <header className={styles.header}><div><p className={styles.eyebrow}>THE TEN · اللقاء {content.number}</p><h1>{content.titleAr}</h1><p className={styles.intro}>{cohort.name} · {content.durationMinutes} دقيقة</p></div><nav aria-label="روابط اللقاء" className={styles.nav}><Link href="/classroom">كل اللقاءات</Link><Link href="/grading">التصحيح</Link></nav></header>
    {query.saved && <p role="status" className={styles.success}>حُفظ التغيير بنجاح.</p>}
    {query.error && <p role="alert" className={styles.error}>لم يُحفظ التغيير. تأكد من الاتصال ومن اكتمال الحقول، ثم أعد المحاولة.</p>}
    <section className={styles.focus}><p className={styles.eyebrow}>قبل البداية</p><h2>افتح العرض وجهّز ورقة الطالب</h2><p><bdi>{content.subtitle}</bdi></p><div className={styles.actions}><a className={styles.primary} href={`/classroom/${content.id}/resources/presentation`}>تنزيل مخطط PowerPoint (RTF)</a><Link className={styles.secondary} href={`/classroom/${content.id}/resources/worksheet`}>طباعة ورقة الطالب</Link><Link className={styles.secondary} href={`/classroom/${content.id}/resources/guide`}>دليل المعلم</Link></div><p className={styles.hint}>استورد ملف RTF في PowerPoint عبر Slides from Outline، وراجع ترتيب الشرائح قبل اللقاء.</p></section>
    <section className={styles.lesson} aria-labelledby="flow-title"><h2 id="flow-title">خطة اللقاء</h2><ol><li><strong>التهيئة</strong><span>اشرح المصطلحات والهدف قبل الحالة.</span></li><li><strong>المثال المحلول</strong><span>اشرح الحالة الأولى، ثم اطرح سؤالًا واحدًا.</span></li><li><strong>التطبيق الموجّه</strong><span>يناقش الطلاب الحالة الثانية مع زميل، ثم تراجعون السبب.</span></li><li><strong>ختام قصير</strong><span>اجمع Exit ticket وسجّل الملاحظة التي تحتاج متابعة.</span></li></ol><details><summary>أهداف هذا اللقاء</summary><ul>{content.learnerGoals.map(goal=><li key={goal}>{goal}</li>)}</ul></details></section>
    <section className={styles.cohort} aria-labelledby="attendance-title"><div className={styles.cohortHeading}><div><h2 id="attendance-title">الحضور</h2><p>اختر الحالة لكل طالب. الحقل الفارغ يبقى دون تسجيل.</p></div><span className={styles.status}>{attendance.filter(row => learners.some(learner => learner.id === row.learner_id)).length} من {learners.length} مسجل</span></div>
      {learners.length === 0 ? <p className={styles.empty}>لا يوجد طلاب نشطون في قائمة الدفعة حاليًا.</p> : <form action={saveClassroomAttendance.bind(null,recordId)}>
        <div className={styles.attendanceList}>{learners.map(learner=><label key={learner.id}><span><strong>{learner.full_name || 'طالب'}</strong><small><bdi>{learner.learner_code || learner.student_id || learner.id.slice(0,8)}</bdi></small></span><select aria-label={`حضور ${learner.full_name || learner.learner_code || learner.id}`} name={`attendance:${learner.id}`} defaultValue={attendance.find(row=>row.learner_id===learner.id)?.status ?? ''}><option value="">لم يُسجل</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>)}</div>
        <ClassroomSubmit label="حفظ الحضور" pendingLabel="جارٍ حفظ الحضور…" />
      </form>}
    </section>
    <section className={styles.cohort} aria-labelledby="closeout-title"><h2 id="closeout-title">سجل اللقاء</h2><p>احفظ الموعد والملاحظة، وحدد اكتمال اللقاء بعد انتهائه.</p>
      <form action={saveClassroomMeeting.bind(null,recordId)} className={styles.closeout}>
        <div className={styles.fields}><label>الموعد بتوقيت بغداد<input type="datetime-local" name="scheduled_at" defaultValue={baghdadInput(meeting.scheduled_at)} /></label><label>حالة اللقاء<select name="status" defaultValue={meeting.status}><option value="planned">قادم</option><option value="completed">مكتمل</option></select></label></div>
        <label>ملاحظة المعلم<textarea name="notes" rows={4} maxLength={4000} defaultValue={meeting.notes ?? ''} placeholder="ما الذي فهمه الطلاب؟ وما الذي يحتاج إلى مراجعة؟" /></label>
        <ClassroomSubmit label="حفظ سجل اللقاء" pendingLabel="جارٍ الحفظ…" />
        {meeting.completed_at && <p className={styles.muted}>آخر اكتمال مسجل: {new Intl.DateTimeFormat('ar-IQ',{timeZone:'Asia/Baghdad',dateStyle:'medium',timeStyle:'short'}).format(new Date(meeting.completed_at))}</p>}
      </form>
    </section>
  </div></main>
}
