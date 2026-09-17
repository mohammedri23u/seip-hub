import Link from 'next/link'
import { CaseCard } from './case-card'
import { StatusBadge } from './status-badge'
import { checkpointState, formatJourneyDate, isActiveLearnerCohort, isSubmitted, type JourneyData } from '@/lib/the-ten/journey'
import { getLocale, localize } from '@/lib/i18n'

export async function JourneySummary({ data }: { data: JourneyData }) {
  const locale = await getLocale(); const tr = (english: string, arabic: string) => localize(locale, english, arabic)
  const attended = data.attendance.filter(a => a.status === 'present' || a.status === 'late').length
  const submitted = data.attempts.filter(isSubmitted).length
  const released = data.assessments.filter(a => a.status === 'released' && data.attempts.some(t => t.assessment_id === a.id && isSubmitted(t))).length
  return <dl className="ten-summary"><div><dt>{tr('Attendance recorded', 'الحضور المسجّل')}</dt><dd>{attended}<span> {tr(attended === 1 ? 'session' : 'sessions', 'جلسة')}</span></dd></div><div><dt>{tr('Checkpoints submitted', 'نقاط التحقّق المرسلة')}</dt><dd>{submitted}<span> {tr(`of ${data.assessments.length} listed`, `من أصل ${data.assessments.length}`)}</span></dd></div><div><dt>{tr('Results ready to review', 'نتائج جاهزة للمراجعة')}</dt><dd>{released}<span> {tr('released', 'منشورة')}</span></dd></div></dl>
}

export async function SessionCards({ data }: { data: JourneyData }) {
  const locale = await getLocale(); const tr = (english: string, arabic: string) => localize(locale, english, arabic)
  if (!data.sessions.length) return <div className="ten-empty"><h3>{tr('No sessions announced yet', 'لم تُعلَن جلسات بعد')}</h3><p>{tr('Your scheduled sessions will appear here when your facilitator publishes them.', 'ستظهر جلساتك المجدولة هنا حين ينشرها الميسّر.')}</p></div>
  return <div className="ten-card-grid">{data.sessions.map(session => {
    const attendance = data.attendance.find(a => a.session_id === session.id)
    return <CaseCard key={session.id} title={session.title} description={session.description ?? undefined}
      badge={data.cohorts.find(c => c.id === session.cohort_id)?.name ?? tr('Session', 'جلسة')}
      state={session.status === 'cancelled' ? 'locked' : session.status === 'completed' ? 'completed' : session.status === 'live' ? 'in_progress' : 'available'}
      statusLabel={session.status === 'completed' ? tr('Session ended', 'انتهت الجلسة') : session.status === 'live' ? tr('Live session', 'جلسة مباشرة') : session.status === 'cancelled' ? tr('Cancelled', 'ملغاة') : tr('Upcoming session', 'جلسة قادمة')}
      actionLabel={session.status === 'completed' ? tr('Review session', 'مراجعة الجلسة') : tr('Open briefing', 'فتح الإحاطة')}
      meta={`${formatJourneyDate(session.scheduled_at, locale)}${session.duration_minutes ? ` · ${session.duration_minutes} ${tr('min', 'دقيقة')}` : ''} · ${tr('Attendance', 'الحضور')}: ${attendance?.status ? tr(attendance.status, attendanceArabic(attendance.status)) : tr('not recorded', 'غير مسجّل')}`}
      lockedReason={tr('This session has been cancelled. Check the other sessions for your next step.', 'أُلغيت هذه الجلسة. راجع الجلسات الأخرى لمعرفة خطوتك التالية.')}
      href={`/learner/sessions/${session.id}`} />
  })}</div>
}

export async function CheckpointCards({ data }: { data: JourneyData }) {
  const locale = await getLocale(); const tr = (english: string, arabic: string) => localize(locale, english, arabic)
  if (!data.assessments.length) return <div className="ten-empty"><h3>{tr('No checkpoints announced yet', 'لم تُعلَن نقاط تحقّق بعد')}</h3><p>{tr('Baseline, formative, and final assessments will appear here when published for your cohort.', 'ستظهر هنا تقييمات خط الأساس والتقييمات التكوينية والنهائية حين تُنشر لمجموعتك.')}</p></div>
  return <div className="ten-card-grid">{data.assessments.map(assessment => {
    const view = checkpointState(
      assessment,
      data.attempts.find(a => a.assessment_id === assessment.id),
      { canTake: isActiveLearnerCohort(data, assessment.cohort_id) },
    )
    return <CaseCard key={assessment.id} title={assessment.title} description={locale === 'ar' ? tr('Checkpoint status is based on its configured availability and your recorded attempt.', 'تعتمد حالة نقطة التحقّق على إتاحتها المضبوطة ومحاولتك المسجّلة.') : view.reason} badge={tr(assessment.assessment_type.replaceAll('_', ' '), assessmentTypeArabic(assessment.assessment_type))}
      state={view.state} statusLabel={locale === 'ar' ? ({ available: 'متاحة', in_progress: 'قيد التنفيذ', completed: 'مكتملة', locked: 'مغلقة' }[view.state]) : view.label} actionLabel={locale === 'ar' ? ({ available: 'ابدأ نقطة التحقّق', in_progress: 'استئناف نقطة التحقّق', completed: 'مراجعة', locked: 'مغلقة' }[view.state]) : view.label} href={view.href} lockedReason={view.state === 'locked' ? tr('Your facilitator controls access to this checkpoint.', 'يتحكم الميسّر بالوصول إلى نقطة التحقّق هذه.') : undefined}
      meta={`${data.cohorts.find(c => c.id === assessment.cohort_id)?.name ?? tr('Checkpoint', 'نقطة تحقّق')}${assessment.duration_minutes ? ` · ${assessment.duration_minutes} ${tr('min', 'دقيقة')}` : ` · ${tr('Untimed', 'دون توقيت')}`}`} />
  })}</div>
}

export async function CertificateSummary() {
  const locale = await getLocale(); const tr = (english: string, arabic: string) => localize(locale, english, arabic)
  return <section className="ten-panel ten-certificate" aria-labelledby="certificate-heading"><StatusBadge>{tr('Eligibility not yet available', 'الاستحقاق غير متاح بعد')}</StatusBadge><h2 id="certificate-heading">{tr('Your completion certificate', 'شهادة الإكمال')}</h2><p>{tr('Your program has not published certificate requirements here yet. Attendance and submitted checkpoints are available to review; they do not by themselves confirm eligibility.', 'لم ينشر برنامجك متطلبات الشهادة هنا بعد. يمكن مراجعة الحضور ونقاط التحقّق المرسلة، لكنها لا تؤكد الاستحقاق بمفردها.')}</p><Link className="ten-text-link" href="/learner/certificate">{tr('View completion status', 'عرض حالة الإكمال')} →</Link></section>
}

function attendanceArabic(status: string) {
  return ({ present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'غياب بعذر' } as Record<string, string>)[status] ?? status
}

function assessmentTypeArabic(type: string) {
  return ({ diagnostic: 'تشخيصي', formative: 'تكويني', summative: 'ختامي', final: 'نهائي', post_test: 'اختبار بَعدي' } as Record<string, string>)[type] ?? type
}
