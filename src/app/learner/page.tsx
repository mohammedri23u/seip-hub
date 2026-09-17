import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { JourneyWorld } from '@/components/the-ten/journey-world'
import { worldAssets } from '@/lib/the-ten/assets'
import { getJourneySummary, getTenCatalog, getTenExperienceState } from '@/lib/the-ten/runtime'
import { getLocale, localize } from '@/lib/i18n'

export default async function LearnerHome() {
  const [summary, catalog, experience, locale] = await Promise.all([
    getJourneySummary(),
    getTenCatalog(),
    getTenExperienceState(),
    getLocale(),
  ])
  const tr = (english: string, arabic: string) => localize(locale, english, arabic)
  const name = summary.profile?.name?.trim()

  if (!summary.enrolled) {
    return <LearnerShell title={tr('Baghdad Nexus is not assigned yet', 'لم تُسند رحلة بغداد نِكسس بعد')}><section className="ten-panel"><h2>{tr('No learner journey is attached to this account.', 'لا توجد رحلة متعلم مرتبطة بهذا الحساب.')}</h2><p>{tr('When your cohort membership is activated, your Baghdad Nexus journey will appear here without a separate setup step.', 'عند تفعيل عضويتك في المجموعة، ستظهر رحلة بغداد نِكسس هنا من دون خطوة إعداد منفصلة.')}</p><Link className="ten-action ten-spaced" href="/dashboard">{tr('Return to workspace', 'العودة إلى مساحة العمل')}</Link></section></LearnerShell>
  }

  if (!summary.onboarding_complete) {
    return <LearnerShell title={name ? tr(`${name}, the gates of Baghdad are closed`, `${name}، بوابات بغداد مغلقة`) : tr('The gates of Baghdad are closed', 'بوابات بغداد مغلقة')} intro={tr('Complete the short orientation once. It unlocks the baseline gate.', 'أكمل التهيئة القصيرة مرة واحدة لتفتح بوابة خط الأساس.')}>
      <section className="ten-world"><div className="ten-world-stage"><div className="ten-world-copy"><p className="ten-eyebrow">{tr('BEFORE THE FIRST SIGNAL', 'قبل الإشارة الأولى')}</p><h2>{tr('Meet the rules of the journey.', 'تعرّف إلى قواعد الرحلة.')}</h2><p>{tr('Commit before discussion. Revise when evidence changes. Confidence is a learning signal, not a reward.', 'التزم قبل النقاش. راجع قرارك حين يتغيّر الدليل. الثقة إشارة للتعلّم وليست مكافأة.')}</p><Link className="ten-action ten-action-gold" href="/learner/orientation">{tr('Enter orientation', 'ادخل التهيئة')} →</Link></div><figure className="ten-world-art"><Image src={worldAssets.baghdadHero} alt={tr('Baghdad Nexus waiting beyond the orientation gate', 'بغداد نِكسس خلف بوابة التهيئة')} fill sizes="100vw" className="object-cover" priority /></figure></div></section>
    </LearnerShell>
  }

  if (summary.next_stage === 'configuration') {
    return <LearnerShell title={tr('The journey is being configured', 'يجري إعداد الرحلة')}><section className="ten-panel"><h2>{tr('Baseline and post-test gates are not linked yet.', 'لم تُربط بوابتا خط الأساس والاختبار البَعدي بعد.')}</h2><p>{tr('The educational content is loaded, but this cohort still needs its entry and exit checkpoints linked by the program administrator.', 'المحتوى التعليمي محمّل، لكن ما زالت هذه المجموعة بحاجة إلى ربط نقطتي الدخول والخروج من قِبل مسؤول البرنامج.')}</p></section></LearnerShell>
  }

  if (!summary.pretest?.completed) {
    return <LearnerShell title={name ? tr(`${name}, one gate remains before Baghdad opens`, `${name}، بقيت بوابة واحدة قبل أن تُفتح بغداد`) : tr('One gate remains before Baghdad opens', 'بقيت بوابة واحدة قبل أن تُفتح بغداد')} intro={tr('Your Entry Baseline establishes the starting point. It is low-stakes and does not certify competence.', 'يحدّد خط الأساس عند الدخول نقطة البداية. هو تقييم منخفض المخاطر ولا يثبت الكفاءة.')}>
      <section className="relative overflow-hidden rounded-[2rem] border border-[#315b5d] bg-[#17363a] text-white shadow-[0_30px_90px_rgba(23,54,58,.18)]">
        <div className="grid min-h-[430px] md:grid-cols-[.9fr_1.1fr]"><div className="flex flex-col justify-center p-7 sm:p-10"><p className="text-xs font-black tracking-[.18em] text-[#f2d99b]">{tr('ENTRY GATE · BASELINE', 'بوابة الدخول · خط الأساس')}</p><h2 className="mt-3 font-serif text-4xl leading-tight">{tr('Before the city reveals its signals, show us how you reason today.', 'قبل أن تكشف المدينة إشاراتها، أظهر لنا كيف تستدل اليوم.')}</h2><p className="mt-4 leading-7 text-[#d8e7e2]">{tr('Low-stakes reasoning with unfamiliar situations. No public ranking. This establishes a starting point for reflection as your journey unfolds.', 'استدلال منخفض المخاطر في مواقف غير مألوفة، من دون ترتيب علني. يحدّد هذا نقطة بداية للتأمل مع تقدّم رحلتك.')}</p>{summary.pretest?.id ? <Link className="ten-action ten-action-gold mt-6 w-fit" href={`/assessments/${summary.pretest.id}/take`}>{tr('Begin Entry Baseline', 'ابدأ خط الأساس عند الدخول')} →</Link> : <p className="mt-6 rounded-xl border border-white/20 p-4">{tr('The baseline is not available yet.', 'خط الأساس غير متاح بعد.')}</p>}</div><div className="relative min-h-72"><Image src={worldAssets.nexusState0Dormant} alt={tr('The Nexus entry gate', 'بوابة الدخول إلى النِكسس')} fill sizes="(max-width:768px) 100vw, 55vw" className="object-cover" priority /></div></div>
      </section>
    </LearnerShell>
  }

  if (!experience.arrival_complete) redirect('/learner/arrival')
  if (!experience.guide_key) redirect('/learner/guide')

  return <LearnerShell immersive title={name ? tr(`Baghdad is open, ${name}`, `بغداد مفتوحة، ${name}`) : tr('Baghdad is open', 'بغداد مفتوحة')} intro={tr('This is your world, not a dashboard. Live missions appear as your facilitator activates them; completed signals stay part of the city.', 'هذا عالمك، وليس لوحة بيانات. تظهر المهمات المباشرة حين يفعّلها الميسّر، وتبقى الإشارات المكتملة جزءاً من المدينة.')}>
    <JourneyWorld summary={summary} catalog={catalog} experience={experience} />
  </LearnerShell>
}
