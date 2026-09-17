'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GuidePresence } from './experience/guide-presence'
import { SignalRegister } from './experience/signal-register'
import { getNexusStateAsset, storyAssets, worldAssets } from '@/lib/the-ten/assets'
import { computeWorldState } from '@/lib/the-ten/experience'
import type { JourneySummary, TenCatalog, TenExperienceState } from '@/lib/the-ten/runtime'
import { useI18n } from '@/components/i18n-provider'

export function JourneyWorld({ summary, catalog, experience }: { summary: JourneySummary; catalog: TenCatalog; experience: TenExperienceState }) {
  const { locale, tr } = useI18n()
  const router = useRouter()
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') router.refresh() }
    const interval = window.setInterval(refresh, 45000)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', refresh) }
  }, [router])
  const missions = summary.missions ?? []
  const completed = summary.mission_completed_count ?? 0
  const reachable = summary.mission_required_count ?? missions.length
  const world = computeWorldState(completed, reachable, locale)
  const [focused, setFocused] = useState<string | null>(null)
  const entries = missions.map(mission => ({
    ...mission,
    content: catalog.missions.find(item => item.id === mission.id),
    run: catalog.runs.find(item => item.mission_id === mission.id && item.phase !== 'completed') ?? catalog.runs.find(item => item.mission_id === mission.id),
  }))
  const current = entries.find(item=>item.id===focused) ?? entries.find(item=>item.run && !item.completed) ?? entries[0]
  const status = (entry: typeof entries[number]) => entry.completed ? tr('Signal restored', 'تمت استعادة الإشارة') : !entry.run ? tr('Awaiting facilitator', 'بانتظار الميسّر') : entry.run.phase === 'completed' ? tr('Room closed · review available', 'أُغلقت الغرفة · المراجعة متاحة') : entry.run.phase === 'waiting' ? tr('Waiting room open', 'غرفة الانتظار مفتوحة') : tr('Reasoning in progress', 'الاستدلال جارٍ')

  return <div className="ten-living-world" data-experience="world" data-world-state={world.level}>
    <section className="ten-city" aria-labelledby="baghdad-world-title">
      <div className="ten-city-art"><Image src={worldAssets.baghdadHero} alt={tr('Baghdad seen from a scholar’s window, with the river and Nexus paths joining its architecture', 'بغداد من نافذة عالم، حيث يلتقي النهر ومسارات النِكسس بعمارتها')} fill preload sizes="(max-width: 720px) 1280px, (min-width: 1672px) 1672px, 100vw" quality={90} className="object-cover" /></div>
      <header className="ten-city-heading"><p className="ten-scene-label">{tr('BAGHDAD / FIRST ACTIVATION', 'بغداد / التفعيل الأول')}</p><h2 id="baghdad-world-title">{completed ? tr('The city remembers.', 'المدينة تتذكّر.') : tr('Every connection begins somewhere.', 'لكل رابط نقطة بداية.')}</h2><p>{world.description}</p></header>
      <div className="ten-city-state"><span>{String(completed).padStart(2,'0')}</span><p>{tr('of THE TEN', 'من THE TEN')}<br />{tr('Signals restored', 'إشارات مستعادة')}</p></div>
      <div className="ten-city-paths" aria-label={tr('Signals in the city', 'الإشارات في المدينة')}>{entries.slice(0,8).map((entry,index) => {
        const position = { left: `${42 + (index / Math.max(1, Math.min(entries.length,8)-1)) * 46}%`, top: `${43 + (index % 2) * 15}%` }
        return entry.run ? <a key={entry.id} href="#signal-directory" style={position} data-restored={entry.completed} onClick={()=>setFocused(entry.id)} aria-label={tr(`Explore Signal ${index+1}: ${entry.title}. ${status(entry)}`, `استكشف الإشارة ${index+1}: ${entry.title}. ${status(entry)}`)}><i aria-hidden="true"/><span>{tr('Signal', 'الإشارة')} {String(index+1).padStart(2,'0')}<small>{entry.completed ? tr('Restored', 'مستعادة') : tr('Open path', 'مسار مفتوح')}</small></span></a> : <span key={entry.id} style={position} data-restored={entry.completed}><i aria-hidden="true"/><span>{tr('Signal', 'الإشارة')} {String(index+1).padStart(2,'0')}<small>{entry.completed ? tr('Restored', 'مستعادة') : tr('Not yet open', 'لم تُفتح بعد')}</small></span></span>
      })}</div>
      {experience.guide_key && <GuidePresence guideKey={experience.guide_key} context="world" reaction="guide" line={completed ? tr('Carry what you learned into the next connection.', 'احمل ما تعلمته إلى الرابط التالي.') : tr('Begin with what you can observe.', 'ابدأ بما تستطيع ملاحظته.')}/>}
      <a href="#signal-directory" className="ten-city-explore">{tr('Explore the reachable Signals', 'استكشف الإشارات المتاحة')} <span aria-hidden="true">↓</span></a>
    </section>

    <section className="ten-signal-directory" id="signal-directory" aria-labelledby="signal-directory-title">
      <header><p className="ten-eyebrow">{tr('PATHS THROUGH BAGHDAD', 'مسارات عبر بغداد')}</p><h2 id="signal-directory-title">{tr('Follow a Signal.', 'اتبع إشارة.')}</h2><p>{completed} {tr(`of ${reachable} reachable Signals restored`, `من ${reachable} إشارات متاحة تمت استعادتها`)}</p><SignalRegister completed={completed} reachable={reachable}/></header>
      <div className="ten-signal-index">
        <div role="group" aria-label={tr('Explore mission Signals', 'استكشف إشارات المهمات')}>{entries.map((entry,index)=><button type="button" key={entry.id} className="ten-signal-entry" aria-pressed={current?.id===entry.id} aria-controls="signal-detail" onClick={()=>setFocused(entry.id)}><span className="ten-signal-number" data-restored={entry.completed}>{String(index+1).padStart(2,'0')}</span><span><strong className="ten-clinical-content" lang="en">{entry.title}</strong><small>{status(entry)}</small></span><span aria-hidden="true">↗</span></button>)}</div>
        {current ? <article id="signal-detail" className="ten-signal-detail" key={current.id}>
          <p className="ten-eyebrow">{status(current)}</p><h3 className="ten-clinical-content" lang="en">{current.title}</h3>
          {(current.content?.mentor ?? current.mentor) && <p className="ten-guardian-credit">{tr('Mission Guardian', 'حارس المهمة')} / {current.content?.mentor ?? current.mentor}</p>}
          <p className={current.content?.premise || current.content?.focus ? 'ten-clinical-content' : undefined} lang={current.content?.premise || current.content?.focus ? 'en' : undefined}>{current.content?.premise ?? current.content?.focus ?? tr('A reasoning path through Baghdad. Its clinical information appears only as the facilitator releases it.', 'مسار للاستدلال عبر بغداد. لا تظهر معلوماته السريرية إلا حين يكشفها الميسّر.')}</p>
          {current.run ? <Link className="ten-scene-action" href={`/learner/mission/${current.run.id}`}>{current.run.phase==='completed' ? tr('Review this path', 'راجع هذا المسار') : current.run.phase==='waiting' ? tr('Enter the waiting room', 'ادخل غرفة الانتظار') : tr('Return to the mission', 'عُد إلى المهمة')} <span aria-hidden="true">→</span></Link> : <p className="ten-path-note">{current.completed ? tr('This Signal is part of your recorded journey. Its record remains in your Codex.', 'هذه الإشارة جزء من رحلتك المسجّلة، وسيبقى سجلها في سجلّك.') : tr('This path opens when your facilitator starts its prepared session.', 'يُفتح هذا المسار حين يبدأ الميسّر جلسته المُعدّة.')}</p>}
          {current.completed && <Link className="ten-text-link" href="/learner/progress">{tr('Read your Codex', 'اقرأ سجلّك')} <span aria-hidden="true">→</span></Link>}
        </article> : <p className="ten-path-note">{tr('The city is quiet. Your prepared Signals will appear here when available.', 'المدينة هادئة. ستظهر إشاراتك المُعدّة هنا حين تتاح.')}</p>}
      </div>
    </section>

    <section className="ten-nexus-observation" aria-labelledby="nexus-observation-title">
      <figure><Image src={getNexusStateAsset(world.level)} alt={tr(`The Nexus: ${world.name}`, `النِكسس: ${world.name}`)} fill sizes="(max-width: 720px) 100vw, 55vw" quality={90} className="object-cover" /></figure>
      <div><p className="ten-eyebrow">{tr('BENEATH THE CITY', 'تحت المدينة')} / {world.name}</p><h2 id="nexus-observation-title">{tr('A world held', 'عالمٌ تحفظه')}<br />{tr('by connection.', 'الروابط.')}</h2><p>{summary.next_stage === 'posttest' ? tr('Your reachable Signals are restored. The Exit Transfer Check is the next part of your journey.', 'تمت استعادة إشاراتك المتاحة. فحص الانتقال عند الخروج هو الجزء التالي من رحلتك.') : summary.next_stage === 'feedback' ? tr('Your post-test is recorded. A final reflection remains.', 'تم تسجيل الاختبار البَعدي. بقي تأمل أخير.') : summary.next_stage === 'certificate' ? tr('Your required journey gates are complete. Your completion pathway is ready.', 'اكتملت بوابات الرحلة المطلوبة. مسار الإكمال جاهز.') : tr('Each recorded Signal changes the Nexus. The wider system still holds paths you have yet to encounter.', 'كل إشارة مسجّلة تغيّر النِكسس، وما زال النظام الأوسع يحمل مسارات لم تصادفها بعد.')}</p>
        {summary.next_stage === 'posttest' && summary.posttest?.id && <Link className="ten-scene-action" href={`/assessments/${summary.posttest.id}/take`}>{tr('Begin Exit Transfer Check', 'ابدأ فحص الانتقال عند الخروج')} →</Link>}
        {summary.next_stage === 'certificate' ? <Link className="ten-scene-action" href="/learner/certificate">{tr('Open completion pathway', 'افتح مسار الإكمال')} →</Link> : <Link className="ten-text-link" href="/learner/progress">{summary.next_stage === 'feedback' ? tr('Write your final reflection', 'اكتب تأملك الأخير') : tr('Open My Codex', 'افتح سجلّي')} →</Link>}
      </div>
    </section>
    <section className="ten-chronicler-note" aria-labelledby="chronicler-note-title">
      <div className="ten-chronicler-art" aria-hidden="true"><Image src={storyAssets.chroniclerDesk} alt="" fill sizes="(max-width: 720px) 100vw, 40vw" quality={90} className="object-cover" /></div>
      <div><p className="ten-eyebrow">{tr('AT THE CHRONICLER’S DESK / OPTIONAL', 'عند مكتب المؤرّخ / اختياري')}</p><h2 id="chronicler-note-title">{tr('A note in the margin.', 'ملاحظة على الهامش.')}</h2><details><summary>{tr('Read the Chronicler’s note', 'اقرأ ملاحظة المؤرّخ')} <span aria-hidden="true">+</span></summary><blockquote>“{tr('A city remembers more than its conclusions. It remembers the questions that made them possible.', 'تتذكّر المدينة أكثر من استنتاجاتها؛ تتذكّر الأسئلة التي جعلت تلك الاستنتاجات ممكنة.')}”</blockquote><p>{tr('Pause, if you wish: which assumption did you last return to? This reflection is yours; it is not submitted or graded.', 'توقّف إن شئت: إلى أي افتراض عدت أخيراً؟ هذا التأمل لك؛ لا يُرسل ولا يُقيَّم.')}</p></details></div>
    </section>
  </div>
}
