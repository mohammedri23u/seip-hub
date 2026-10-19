import Image from 'next/image'
import Link from 'next/link'
import { getClassroomMeetingSummaries } from '@/lib/classroom/content'
import { classroomWeekMap } from '@/lib/classroom/journey-map'
import { worldAssets } from '@/lib/the-ten/assets'
import { NexusExplorer } from './nexus-explorer'
import styles from './learner-overview.module.css'

const participationSteps = [
  { title: 'لاحظ.', english: 'NOTICE', detail: 'حالة قصيرة على الشاشة. يشرح المعلم Vocabulary ويعرض مثالًا محلولًا قبل أن تبدأ.' },
  { title: 'فكّر وناقش.', english: 'REASON', detail: 'دوّن إجابتك أولًا، ثم ناقش زملاءك. المطلوب سبب واضح، وخطوة واحدة في كل مرة.' },
  { title: 'راجع فكرتك.', english: 'REFLECT', detail: 'تظهر معلومة جديدة؛ راجع ما تدعمه، وما الذي يبقى غير محسوم. بعدها نناقش Feedback معًا.' },
] as const

/** Server-rendered outline: only the allowlisted, learner-safe summary is rendered. */
export function ClassroomMeetingOutline({ publicView = false }: { publicView?: boolean }) {
  const meetings = getClassroomMeetingSummaries()
  return <section className={styles.meetings} id="classroom-meetings" aria-labelledby="classroom-meetings-heading" lang="ar" dir="rtl">
    <div className={styles.sectionHeading}>
      <div><p className={styles.eyebrow}>ماذا يحدث كل أسبوع؟</p><h2 id="classroom-meetings-heading">خمسة لقاءات. عشر حكايات.</h2></div>
      <span className={styles.smallNote}>لقاء واحد كل أسبوع · حالتان في اللقاء</span>
    </div>
    <ol className={styles.meetingList}>
      {meetings.map(meeting => <li key={meeting.id} className={styles.meeting}>
        <span className={styles.meetingNumber} aria-hidden="true"><small>SESSION</small>{String(meeting.number).padStart(2, '0')}</span>
        <div className={styles.meetingBody}>
          <p className={styles.meetingMeta}><span dir="ltr">S{meeting.number} · W{meeting.number} · {meeting.missionCodes.join(' + ')}</span><span> / </span>{meeting.durationMinutes} دقيقة</p>
          <h3>{meeting.titleAr}</h3>
          <p className={styles.subtitle} lang="en" dir="ltr">{meeting.subtitle}</p>
          <div className={styles.meetingTags}><span dir="ltr">{meeting.caseIds.join(' + ')}</span><span>{meeting.number === 1 ? 'بداية M01 · دون تفعيل Signal' : `اكتمال ${meeting.missionCodes[0]} · بعدها تفعيل Signal ${meeting.number - 1}`}</span></div>
          <details className={styles.learningDetails}><summary>ماذا سنتعلّم؟</summary><ul className={styles.goalList}>{meeting.learnerGoals.map(goal => <li key={goal}>{goal}</li>)}</ul></details>
          {!publicView ? <a className={styles.worksheetLink} href={`/classroom/${meeting.id}/resources/worksheet`}>فتح ورقة الطالب للطباعة<span aria-hidden="true"> ←</span></a> : null}
        </div>
      </li>)}
    </ol>
    <p className={styles.planNote}>يسبق هذه اللقاءات W0 للتهيئة وBaseline، ويليها W6 للـPost assessment والختام. المعلم يحدّد موعد مجموعتك ويوزّع الأوراق.</p>
  </section>
}

export function ClassroomOverview({ publicView = false }: { publicView?: boolean }) {
  return <div className={styles.overview} lang="ar" dir="rtl">
    <section className={styles.hero} aria-labelledby="classroom-hero-heading">
      <figure className={styles.heroArt}>
        <Image src={worldAssets.wisdomClassroom} alt="قاعة الحكمة في بغداد، بأقواسها ومكتبتها ومائدة الرحلة تحت ضوء الفوانيس" fill sizes="(max-width: 760px) 100vw, 1152px" className={styles.heroImage} preload />
        <figcaption><span dir="ltr">THE TEN</span><span dir="ltr">BAGHDAD NEXUS</span></figcaption>
      </figure>
      <div className={styles.heroCopy}>
        <p className={styles.heroEyebrow}><span aria-hidden="true" />برنامج حضوري في Clinical Reasoning</p>
        <h2 id="classroom-hero-heading">من أول سؤال،<br />تبدأ الحكاية.</h2>
        <p>بغداد تجمعنا، والحالة تفتح النقاش.<br />نتعلّم كيف نفكّر؛ معلومة، وسؤالًا، وخطوةً في كل مرة.</p>
        <div className={styles.heroActions}><a className={styles.heroPrimary} href="#classroom-meetings">اكتشف اللقاءات<span aria-hidden="true">←</span></a><a className={styles.heroSecondary} href="#nexus-explorer">استكشف عالم القصة</a></div>
        <div className={styles.heroFootnote}><span aria-hidden="true" className={styles.tinyRule} /><span>المعلم يقود اللقاء. أنت تملك مساحة التفكير.</span></div>
      </div>
    </section>
    <dl className={styles.programFacts} aria-label="البرنامج بالأرقام"><div><dt>لقاءات تدريس أسبوعية</dt><dd>05</dd></div><div><dt>Clinical Encounters</dt><dd>10</dd></div><div><dt>Missions وSignals</dt><dd>04</dd></div><div><dt>لكل لقاء تدريس</dt><dd><span dir="ltr">75</span><small> دقيقة</small></dd></div></dl>
    <aside className={styles.classroomNote}>
      <span className={styles.noteMark} aria-hidden="true">01</span>
      <div><h2>أحضر، وشارك، وخذ وقتك بالتفكير.</h2><p>يمكنك المشاركة من خلال النقاش وورقة العمل. الهاتف والحساب الإلكتروني ليسا شرطًا للمشاركة في اللقاء؛ يستخدم الحساب عند الحاجة للاختبارات ومتابعة النتائج.</p></div>
      <span className={styles.noteAside}>التعلّم<br />بيننا.</span>
    </aside>
    <section className={styles.howItWorks} aria-labelledby="classroom-participation-heading">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>داخل القاعة</p><h2 id="classroom-participation-heading">مساحة لفكرتك، قبل الإجابة.</h2></div><span className={styles.smallNote}>مثال محلول ← تدريب موجّه ← محاولتك</span></div>
      <ol className={styles.participationList}>
        {participationSteps.map((step, index) => <li key={step.title}>
          <div className={styles.stepTopline}><span className={styles.stepNumber}>0{index + 1}</span><span dir="ltr">{step.english}</span></div><h3>{step.title}</h3><p>{step.detail}</p>
        </li>)}
      </ol>
    </section>
    <section className={styles.weekSection} aria-labelledby="classroom-weeks-heading"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>خريطة الوقت</p><h2 id="classroom-weeks-heading">سبعة أسابيع. إيقاع واضح.</h2></div><span className={styles.smallNote}>تهيئة · خمسة لقاءات تدريس · ختام</span></div><ol className={styles.weekList}>{classroomWeekMap.map(week => <li key={week.code} data-phase={week.phase}><span className={styles.weekCode} dir="ltr">{week.code}</span><strong>{week.label}</strong><span className={styles.weekDuration}>{week.duration}</span><p>{week.detail}</p></li>)}</ol><p className={styles.planNote}>الخطة نسبية إلى أول أسبوع تدريس؛ تؤكَّد تواريخ مجموعتك مع المعلم. المشاركة البحثية اختيارية ومنفصلة عن الشهادة.</p></section>
    <NexusExplorer />
    <ClassroomMeetingOutline publicView={publicView} />
    {publicView ? <section className={styles.entrySection} aria-labelledby="classroom-entry-heading">
      <div><p className={styles.eyebrow}>الخطوة التالية</p><h2 id="classroom-entry-heading">لقاؤك في القاعة. ودليلك هنا.</h2><p>ادخل لمتابعة مجموعتك واختباراتك. المعلم يجد مواد اللقاء وإدارة الحضور في مساحته الخاصة.</p></div>
      <div className={styles.entryActions}>
        <Link href="/learner" className="ten-action" prefetch={false}>دليل الطالب</Link>
        <Link href="/facilitator/the-ten" className="ten-action ten-action-secondary" prefetch={false}>مساحة المعلم</Link>
      </div>
    </section> : null}
  </div>
}
