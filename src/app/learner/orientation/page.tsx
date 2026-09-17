import Image from 'next/image'
import Link from 'next/link'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { brandAssets, worldAssets } from '@/lib/the-ten/assets'
import { getJourneySummary } from '@/lib/the-ten/runtime'
import { completeOrientation } from './actions'
import { getLocale, localize } from '@/lib/i18n'

export default async function OrientationPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [summary, query, locale] = await Promise.all([getJourneySummary(), searchParams, getLocale()])
  const tr = (english: string, arabic: string) => localize(locale, english, arabic)
  if (!summary.enrolled || !summary.program) {
    return <LearnerShell title={tr('Baghdad Nexus is waiting', 'بغداد نِكسس بانتظارك')}><section className="ten-panel"><h2>{tr('No active learner cohort', 'لا توجد مجموعة متعلمين فعّالة')}</h2><p>{tr('Your account is signed in, but it is not attached to an active or completed learner cohort yet.', 'تم تسجيل الدخول إلى حسابك، لكنه غير مرتبط بعد بمجموعة متعلمين فعّالة أو مكتملة.')}</p><Link className="ten-action ten-spaced" href="/dashboard">{tr('Return to workspace', 'العودة إلى مساحة العمل')}</Link></section></LearnerShell>
  }

  if (summary.onboarding_complete) {
    return <LearnerShell title={tr('The gate is open', 'البوابة مفتوحة')} intro={tr('Your orientation is already complete.', 'لقد أكملت التهيئة بالفعل.')}><section className="ten-world"><div className="ten-world-stage"><div className="ten-world-copy"><p className="ten-eyebrow">THE TEN · BAGHDAD NEXUS</p><h2>{tr('Your journey has already begun.', 'لقد بدأت رحلتك بالفعل.')}</h2><p>{tr('Return to Baghdad to continue from the exact point recorded for your cohort.', 'عُد إلى بغداد لتتابع من النقطة المسجّلة لمجموعتك بالضبط.')}</p><Link className="ten-action ten-action-gold" href="/learner">{tr('Enter Baghdad', 'ادخل بغداد')} →</Link></div><figure className="ten-world-art"><Image src={worldAssets.baghdad} alt={tr('Illustrated Baghdad Nexus world', 'عالم بغداد نِكسس المصوّر')} fill sizes="100vw" className="object-cover" priority /></figure></div></section></LearnerShell>
  }

  return <LearnerShell title={tr('Before Baghdad opens', 'قبل أن تُفتح بغداد')} intro={tr('This is the only orientation gate. After it, the baseline checkpoint unlocks the world.', 'هذه بوابة التهيئة الوحيدة. بعدها تفتح نقطة خط الأساس هذا العالم.')}>
    {query.error && <p role="alert" className="ten-notice ten-notice-error">{tr('Please accept both acknowledgements so the journey can begin.', 'يرجى قبول الإقرارين كي تبدأ الرحلة.')}</p>}
    <section className="ten-world">
      <div className="ten-world-stage">
        <div className="ten-world-copy">
          <p className="ten-eyebrow">{tr('FIRST ACTIVATION', 'التفعيل الأول')}</p>
          <h2>{tr('Four signals are waiting in Baghdad.', 'أربع إشارات تنتظرك في بغداد.')}</h2>
          <p>{tr('You will move through four live clinical-reasoning missions. Your facilitator controls when each scene advances. Keep this site on your phone for private commits, confidence, revotes and reflection; discuss the reasoning with your peers in the teaching space around you.', 'ستمر بأربع مهمات مباشرة في Clinical Reasoning. يتحكم الميسّر بموعد انتقال كل مشهد. أبقِ الموقع مفتوحاً على هاتفك لتسجيل الإجابة الخاصة، والثقة، وإعادة التصويت، والتأمل؛ وناقش الاستدلال مع زملائك في مساحة التعلّم من حولك.')}</p>
          <div className="relative mt-6 h-24 w-56 overflow-hidden rounded-xl bg-[#f7f0df]"><Image src={brandAssets.lockup} alt="THE TEN — Baghdad Nexus" fill sizes="224px" className="object-cover" /></div>
        </div>
        <figure className="ten-world-art"><Image src={worldAssets.nexus} alt="The Baghdad Nexus gateway" fill sizes="(max-width:720px) 100vw, 50vw" className="object-cover" priority /></figure>
      </div>
    </section>

    <form action={completeOrientation} className="ten-panel ten-spaced">
      <input type="hidden" name="program_id" value={summary.program.id} />
      <p className="ten-eyebrow">{tr('Journey agreement', 'اتفاقية الرحلة')}</p>
      <h2>{tr('Two things before the first signal', 'أمران قبل الإشارة الأولى')}</h2>
      <label className="mt-5 flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border border-[#d8ccb6] bg-[#fffdf8] p-4"><input className="mt-1 h-5 w-5" type="checkbox" name="pledge" required /><span><strong>{tr('Learning pledge', 'تعهد التعلّم')}</strong><br /><span className="text-sm text-[#526c6e]">{tr('I will commit my own reasoning before peer discussion and treat changing my answer as a learning event, not a failure.', 'سأعتمد استدلالي الخاص قبل نقاش الأقران، وسأتعامل مع تغيير إجابتي بوصفه حدثاً تعليمياً لا إخفاقاً.')}</span></span></label>
      <label className="mt-3 flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border border-[#d8ccb6] bg-[#fffdf8] p-4"><input className="mt-1 h-5 w-5" type="checkbox" name="assessment" required /><span><strong>{tr('Assessment acknowledgement', 'إقرار التقييم')}</strong><br /><span className="text-sm text-[#526c6e]">{tr('The baseline, post-test, confidence signals, and mission responses are educational records; they are not independent claims of clinical competence.', 'خط الأساس، والاختبار البَعدي، وإشارات الثقة، وإجابات المهمات سجلات تعليمية؛ وليست ادعاءات مستقلة بالكفاءة السريرية.')}</span></span></label>
      <button className="ten-action ten-action-gold ten-spaced" type="submit">{tr('Open the first gate', 'افتح البوابة الأولى')} →</button>
    </form>
  </LearnerShell>
}
