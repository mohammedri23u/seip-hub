import { LearnerShell } from '@/components/the-ten/learner-shell'
import { CheckpointCards } from '@/components/the-ten/journey-overview'
import { getLearnerJourney } from '@/lib/the-ten/learner-data'
import { getLocale, localize } from '@/lib/i18n'

export default async function LearnerAssessmentsPage({ searchParams }: { searchParams: Promise<{ submitted?: string; error?: string }> }) {
  const [query, data, locale] = await Promise.all([searchParams, getLearnerJourney(), getLocale()])
  const tr = (english: string, arabic: string) => localize(locale, english, arabic)
  return <LearnerShell active="/learner/assessments" title={tr('Your checkpoints', 'نقاط التحقّق')} intro={tr('Make your reasoning visible. Open a checkpoint when it is available, then return here for its status.', 'اجعل استدلالك مرئياً. افتح نقطة التحقّق حين تتاح، ثم عُد إلى هنا لمتابعة حالتها.')}>
    {query.submitted === '1' && <p role="status" className="ten-notice">{tr('Submission received. Your recorded attempt status is shown below.', 'تم استلام الإرسال. تظهر حالة محاولتك المسجّلة أدناه.')}</p>}
    {query.error && <p role="alert" className="ten-notice ten-notice-error">{tr('This checkpoint could not be started. Check its availability and try again, or contact your facilitator.', 'تعذّر بدء نقطة التحقّق. تحقّق من إتاحتها وحاول مجدداً، أو تواصل مع الميسّر.')}</p>}
    <CheckpointCards data={data} />
  </LearnerShell>
}
