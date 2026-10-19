import Image from 'next/image'
import Link from 'next/link'
import { getClassroomMeetingSummaries } from '@/lib/classroom/content'
import { worldAssets } from '@/lib/the-ten/assets'
import styles from './learner-overview.module.css'

const participationSteps = [
  { title: 'شاهد الحالة', detail: 'يعرض المعلم حالة قصيرة، ويشرح المصطلحات المطلوبة.' },
  { title: 'فكّر ثم ناقش', detail: 'دوّن فكرتك، ناقش زملاءك، واشرح سبب اختيارك.' },
  { title: 'راجع تفكيرك', detail: 'استمع إلى الشرح، وعدّل إجابتك عندما تظهر معلومة جديدة.' },
] as const

/** Server-rendered outline: only the allowlisted, learner-safe summary is rendered. */
export function ClassroomMeetingOutline({ publicView = false }: { publicView?: boolean }) {
  const meetings = getClassroomMeetingSummaries()
  return <section className={styles.meetings} id="classroom-meetings" aria-labelledby="classroom-meetings-heading" lang="ar" dir="rtl">
    <div className={styles.sectionHeading}>
      <div><p className={styles.eyebrow}>خطة البرنامج</p><h2 id="classroom-meetings-heading">خمسة لقاءات، خطوة بخطوة.</h2></div>
      <span className={styles.smallNote}>حالتان قصيرتان في كل لقاء</span>
    </div>
    <ol className={styles.meetingList}>
      {meetings.map(meeting => <li key={meeting.id} className={styles.meeting}>
        <span className={styles.meetingNumber} aria-hidden="true">{String(meeting.number).padStart(2, '0')}</span>
        <div className={styles.meetingBody}>
          <p className={styles.meetingMeta}>اللقاء {meeting.number} <span>·</span> نحو {meeting.durationMinutes} دقيقة</p>
          <h3>{meeting.titleAr}</h3>
          <p className={styles.subtitle}>{meeting.subtitle}</p>
          <ul className={styles.goalList}>{meeting.learnerGoals.map(goal => <li key={goal}>{goal}</li>)}</ul>
          {!publicView ? <a className={styles.worksheetLink} href={`/classroom/${meeting.id}/resources/worksheet`}>فتح ورقة الطالب للطباعة<span aria-hidden="true"> ←</span></a> : null}
        </div>
      </li>)}
    </ol>
    <p className={styles.planNote}>هذه خطة اللقاءات؛ المعلم يحدّد موعد مجموعتك ويوزّع ورقة العمل. لا يلزم إنجاز مسار إلكتروني قبل الحضور.</p>
  </section>
}

export function ClassroomOverview({ publicView = false }: { publicView?: boolean }) {
  return <div className={styles.overview} lang="ar" dir="rtl">
    <section className={styles.hero} aria-labelledby="classroom-hero-heading">
      <div className={styles.heroCopy}>
        <p className={styles.heroEyebrow}>اللقاء يبدأ في القاعة</p>
        <h2 id="classroom-hero-heading">الحالة على الشاشة.<br />والنقاش بيننا.</h2>
        <p>حالات أبسط، سؤال واحد في كل خطوة، ومثال يشرحه المعلم قبل أن تجرّب بنفسك.</p>
        <a className="ten-action ten-action-gold" href="#classroom-meetings">تعرّف على اللقاءات الخمسة</a>
      </div>
      <figure className={styles.heroArt}>
        <Image src={worldAssets.baghdadHero} alt="بغداد من عالم THE TEN" fill sizes="(max-width: 760px) 100vw, 50vw" className={styles.heroImage} preload />
        <figcaption>THE TEN · BAGHDAD NEXUS</figcaption>
      </figure>
    </section>
    <aside className={styles.classroomNote}>
      <span className={styles.noteMark} aria-hidden="true">✓</span>
      <div><h2>أحضر، وشارك، وخذ وقتك بالتفكير.</h2><p>يمكنك المشاركة من خلال النقاش وورقة العمل. الهاتف والحساب الإلكتروني ليسا شرطًا للمشاركة في اللقاء؛ يستخدم الحساب عند الحاجة للاختبارات ومتابعة النتائج.</p></div>
    </aside>
    <section className={styles.howItWorks} aria-labelledby="classroom-participation-heading">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>داخل القاعة</p><h2 id="classroom-participation-heading">شنو المطلوب منك؟</h2></div></div>
      <ol className={styles.participationList}>
        {participationSteps.map((step, index) => <li key={step.title}>
          <span className={styles.stepNumber}>0{index + 1}</span><h3>{step.title}</h3><p>{step.detail}</p>
        </li>)}
      </ol>
    </section>
    <ClassroomMeetingOutline publicView={publicView} />
    {publicView ? <section className={styles.entrySection} aria-labelledby="classroom-entry-heading">
      <div><h2 id="classroom-entry-heading">عندك حساب للبرنامج؟</h2><p>ادخل لمتابعة مجموعتك واختباراتك. المعلم يجد مواد اللقاء وإدارة الحضور في مساحة المعلم.</p></div>
      <div className={styles.entryActions}>
        <Link href="/learner" className="ten-action" prefetch={false}>دليل الطالب</Link>
        <Link href="/facilitator/the-ten" className="ten-action ten-action-secondary" prefetch={false}>مساحة المعلم</Link>
      </div>
    </section> : null}
  </div>
}
