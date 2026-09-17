import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { StatusBadge } from '@/components/the-ten/status-badge'
import { getLearnerJourney } from '@/lib/the-ten/learner-data'
import { requireUser } from '@/lib/auth/require-user'
import { formatJourneyDate } from '@/lib/the-ten/journey'
import { getLocale, localize } from '@/lib/i18n'

type Objective = { code: string; title: string; domain: string | null }

export default async function LearnerSession({ params }: { params: Promise<{ sessionId: string }> }) {
  const locale = await getLocale()
  const tr = (english: string, arabic: string) => localize(locale, english, arabic)
  const { sessionId } = await params
  const data = await getLearnerJourney()
  const session = data.sessions.find(s => s.id === sessionId)
  if (!session) notFound()
  const { supabase } = await requireUser()
  const objectives = await supabase.from('session_learning_objectives').select('learning_objectives(code, title, domain)').eq('session_id', sessionId)
  if (objectives.error) throw new Error(tr('Could not load the session briefing.', 'تعذّر تحميل ملخص الجلسة.'))
  const rows = (objectives.data ?? []) as unknown as { learning_objectives: Objective | Objective[] | null }[]
  const attendance = data.attendance.find(a => a.session_id === sessionId)
  return <LearnerShell active="/learner/sessions" title={session.title} intro={data.cohorts.find(c => c.id === session.cohort_id)?.name}>
    <Link className="ten-text-link" href="/learner/sessions">{tr('← All sessions', 'جميع الجلسات →')}</Link>
    <section className="ten-panel ten-spaced">
      <StatusBadge tone={session.status === 'live' ? 'accent' : 'neutral'}>{session.status === 'completed' ? tr('Session ended', 'انتهت الجلسة') : tr(session.status, session.status === 'live' ? 'مباشرة' : session.status === 'cancelled' ? 'ملغاة' : 'مجدولة')}</StatusBadge>
      <h2>{tr('Your session briefing', 'ملخص جلستك')}</h2><p className="whitespace-pre-wrap">{session.description || tr('Your facilitator will introduce the session and its clinical context.', 'سيقدّم الميسّر الجلسة وسياقها السريري.')}</p>
      <dl className="ten-session-meta"><div><dt>{tr('When', 'الموعد')}</dt><dd>{formatJourneyDate(session.scheduled_at, locale)}</dd></div><div><dt>{tr('Duration', 'المدة')}</dt><dd>{session.duration_minutes ? tr(`${session.duration_minutes} minutes`, `${session.duration_minutes} دقيقة`) : tr('To be confirmed', 'تُحدّد لاحقاً')}</dd></div><div><dt>{tr('Your attendance', 'حضورك')}</dt><dd>{attendance?.status ? tr(attendance.status, attendanceArabic(attendance.status)) : tr('Not recorded', 'غير مسجّل')}</dd></div></dl>
    </section>
    <div className="ten-two-columns ten-spaced"><section className="ten-panel"><h2>{tr('What you will work toward', 'ما ستعمل على تحقيقه')}</h2><ul className="ten-objectives">{rows.length ? rows.map((row, index) => {
      const objective = Array.isArray(row.learning_objectives) ? row.learning_objectives[0] : row.learning_objectives
      return objective ? <li key={index}><span className="ten-eyebrow">{objective.code}</span><h3>{objective.title}</h3>{objective.domain && <p>{objective.domain}</p>}</li> : null
    }) : <li>{tr('Learning objectives have not been published yet.', 'لم تُنشر أهداف التعلّم بعد.')}</li>}</ul></section>
    <section className="ten-panel"><h2>{session.status === 'completed' ? tr('After the session', 'بعد الجلسة') : tr('Taking part', 'المشاركة')}</h2>
      <p>{session.status === 'cancelled' ? tr('This session has been cancelled. Return to the session list for other opportunities.', 'أُلغيت هذه الجلسة. عُد إلى قائمة الجلسات للاطلاع على الفرص الأخرى.') : session.status === 'completed' ? tr('Revisit the learning objectives and check your attendance record. If it needs correcting, contact your facilitator.', 'راجع أهداف التعلّم وسجل حضورك. تواصل مع الميسّر إذا احتاج السجل إلى تصحيح.') : session.status === 'live' ? tr('Follow your facilitator for the session activities. Individual case questions are not available on this page yet.', 'اتبع توجيهات الميسّر في أنشطة الجلسة. أسئلة الحالات الفردية غير متاحة في هذه الصفحة بعد.') : tr('You can read this briefing now. Your facilitator will guide the activities when the session begins.', 'يمكنك قراءة هذا الملخص الآن. سيقود الميسّر الأنشطة عند بدء الجلسة.')}</p>
      <Link className="ten-action ten-spaced" href={session.status === 'completed' ? '/learner/progress' : '/learner/assessments'}>{session.status === 'completed' ? tr('Review progress', 'مراجعة التقدّم') : tr('View cohort checkpoints', 'عرض نقاط تحقّق المجموعة')} <span aria-hidden="true">{locale === 'ar' ? '←' : '→'}</span></Link>
    </section></div>
  </LearnerShell>
}

function attendanceArabic(status: string) {
  return ({ present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'غياب بعذر' } as Record<string, string>)[status] ?? status
}
