import Link from 'next/link'
import { ClassroomOverview } from '@/components/classroom/learner-overview'
import { AssessmentRetakeBanner } from '@/components/the-ten/assessment-retake-notice'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { getJourneySummary } from '@/lib/the-ten/runtime'

export default async function LearnerHome() {
  const summary = await getJourneySummary()
  const name = summary.profile?.name?.trim()

  return <LearnerShell lang="ar" title={name ? `أهلًا ${name}، هذا دليلك للقاء.` : 'دليلك للقاء الحضوري.'}
    intro="اللقاء يقوده المعلم بالـPowerPoint. شارك بالنقاش وورقة العمل، وارجع إلى حسابك عندما تحتاج الاختبارات أو النتائج.">
    <ClassroomOverview />
    <section className="ten-panel ten-spaced" lang="ar" dir="rtl" aria-labelledby="account-learning-heading">
      <p className="ten-eyebrow">عند الحاجة إلى حسابك</p>
      <h2 id="account-learning-heading">اختباراتي ومتابعتي</h2>
      <p>معلومات اللقاءات أعلاه متاحة قبل خطوات التهيئة الإلكترونية. الاختبارات الرسمية ومتابعة النتائج تبقى داخل حسابك وبحسب تعليمات المعلم.</p>
      <div className="ten-spaced"><AssessmentRetakeBanner notice={summary.assessment_retake} link /></div>
      {!summary.enrolled ? <p>لم تُربط بك مجموعة بعد. تواصل مع المعلم لترتيب حسابك، ويمكنك المشاركة في اللقاء الحضوري.</p> :
        <div className="mt-5 flex flex-wrap gap-3">
          {summary.next_stage === 'pretest' && summary.pretest?.id && !summary.pretest.completed ?
            <Link className="ten-action" href={`/assessments/${summary.pretest.id}/take`}>فتح Pre-test</Link> : null}
          {summary.next_stage === 'posttest' && summary.posttest?.id && !summary.posttest.completed ?
            <Link className="ten-action" href={`/assessments/${summary.posttest.id}/take`}>فتح Post-test</Link> : null}
          <Link className="ten-action ten-action-secondary" href="/learner/progress">اختباراتي ونتائجي</Link>
          <Link className="ten-text-link" href="/learner/world">استكشاف عالم بغداد الاختياري</Link>
        </div>
      }
      {summary.enrolled && !summary.onboarding_complete ?
        <p className="text-sm">قبل استخدام المسار الإلكتروني، يمكنك إكمال <Link className="ten-text-link" href="/learner/orientation">دليل الاستخدام الإلكتروني</Link>. هذه الخطوة لا تمنع حضور اللقاء.</p> : null}
    </section>
  </LearnerShell>
}
