import Image from 'next/image'
import Link from 'next/link'
import { MissionSystemIcon } from '@/components/the-ten/art-sprite'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { characterAssets, worldAssets } from '@/lib/the-ten/assets'
import { getJourneySummary, getTenCodex } from '@/lib/the-ten/runtime'
import { submitNexusEcho } from './actions'
import { getLocale, localize } from '@/lib/i18n'

type EchoItem = { index?: number; prompt?: string | null; unlock_at?: string; unlocked?: boolean; response?: string | null; answer?: string | null }
type CodexEntry = { run_id?: string; mission_id?: string; title?: string; principle?: string; reflection?: string; completed_at?: string; framework?: string; echo?: EchoItem[] }

const characterByMission = {
  M01: { key: 'ibn-sina', label: 'Ibn Sina' },
  M02: { key: 'al-razi', label: 'Al-Razi' },
  M03: { key: 'jabir', label: 'Jabir ibn Hayyan' },
  M04: { key: 'hippocrates', label: 'Hippocrates' },
} as const

export default async function LearnerProgress({ searchParams }: { searchParams: Promise<{ echo?: string; error?: string }> }) {
  const [summary, codexRaw, query, locale] = await Promise.all([getJourneySummary(), getTenCodex(), searchParams, getLocale()])
  const tr = (english: string, arabic: string) => localize(locale, english, arabic)
  const codex = codexRaw as CodexEntry[]
  const completed = summary.mission_completed_count ?? 0
  const revealed = summary.mission_required_count ?? 4
  const programSignalsTotal = 10

  return <LearnerShell active="/learner/progress" title={tr('My Codex', 'سجلّي')} intro={tr('A record of the reasoning principles you activated, what changed your mind, and what returns later through Nexus Echo.', 'سجلّ لمبادئ الاستدلال التي فعّلتها، وما غيّر رأيك، وما يعود إليك لاحقاً عبر صدى النِكسس.')}>
    {query.echo === 'saved' && <p role="status" className="ten-notice">{tr('Nexus Echo saved. The answer anchor is now visible for that retrieval item.', 'تم حفظ صدى النِكسس، وأصبحت الإجابة المرجعية ظاهرة لعنصر الاسترجاع.')}</p>}
    {query.error && <p role="alert" className="ten-notice ten-notice-error">{tr('That Nexus Echo could not be saved. Check that it has unlocked and try again.', 'تعذّر حفظ صدى النِكسس. تحقّق من فتحه وحاول مجدداً.')}</p>}

    <section className="relative mb-5 overflow-hidden rounded-[2rem] border border-[#315b5d] bg-[#17363a] text-white shadow-[0_22px_70px_rgba(23,54,58,.14)]">
      <Image src={worldAssets.nexus} alt="" fill sizes="100vw" className="object-cover object-center opacity-45" priority />
      <div className="absolute inset-0 bg-gradient-to-r from-[#102f32]/95 via-[#17363a]/80 to-[#17363a]/40" />
      <div className="relative z-10 grid gap-5 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-end">
        <div><p className="text-[10px] font-black tracking-[.18em] text-[#f2d99b]">{tr('THE TEN · LIVING RECORD', 'THE TEN · السجلّ الحي')}</p><h2 className="mt-2 max-w-xl font-serif text-3xl sm:text-5xl">{tr('Every Signal leaves a trace.', 'كل إشارة تترك أثراً.')}</h2><p className="mt-3 max-w-2xl leading-7 text-[#d8e7e2]">{tr('Your Codex is not a score screen. It records the reasoning lens you activated, your reflection, and the retrieval prompts that return after the mission.', 'سجلّك ليس شاشة درجات. إنه يحفظ عدسة الاستدلال التي فعّلتها، وتأملك، ومطالبات الاسترجاع التي تعود بعد المهمة.')}</p></div>
        <div className="rounded-3xl border border-white/20 bg-[#102f32]/70 px-5 py-4 text-center backdrop-blur-sm"><div className="font-serif text-4xl text-[#f2d99b]">{completed}/{programSignalsTotal}</div><div className="mt-1 text-[10px] font-black tracking-[.14em]">{tr('SIGNALS ACTIVE', 'إشارات فعّالة')}</div></div>
      </div>
    </section>

    <section className="grid gap-4 md:grid-cols-3">
      <div className="ten-panel"><p className="ten-eyebrow">{tr('SIGNALS', 'الإشارات')}</p><div className="mt-2 font-serif text-4xl">{completed}/{programSignalsTotal}</div><p>{tr(`Signals active across THE TEN. First Activation reveals ${revealed} of the ten.`, `إشارات فعّالة ضمن THE TEN. يكشف التفعيل الأول ${revealed} من أصل عشر.`)}</p></div>
      <div className="ten-panel"><p className="ten-eyebrow">{tr('NEXT GATE', 'البوابة التالية')}</p><div className="mt-2 font-serif text-2xl capitalize">{summary.next_stage?.replaceAll('_',' ') ?? tr('Journey', 'الرحلة')}</div><p>{tr('Your next step is driven by persisted completion records, not by page visits.', 'تُحدَّد خطوتك التالية من سجلات الإكمال المحفوظة، لا من زيارة الصفحات.')}</p></div>
      <div className="ten-panel"><p className="ten-eyebrow">{tr('RETRIEVAL', 'الاسترجاع')}</p><div className="mt-2 font-serif text-4xl">{codex.reduce((sum,entry)=>sum+(entry.echo?.filter(item=>item.unlocked).length ?? 0),0)}</div><p>{tr('Nexus Echo prompts currently unlocked.', 'مطالبات صدى النِكسس المفتوحة حالياً.')}</p></div>
    </section>

    <div className="mt-8 space-y-5">
      {codex.length ? codex.map((entry,index) => {
        const missionId = entry.mission_id as keyof typeof characterByMission | undefined
        const character = missionId ? characterByMission[missionId] : undefined
        const portrait = character ? characterAssets[character.key].neutral : null
        return <article key={entry.run_id ?? index} className="overflow-hidden rounded-[1.75rem] border border-[#d8ccb6] bg-[#fffdf8] shadow-[0_16px_45px_rgba(23,54,58,.06)]">
          <div className="relative overflow-hidden border-b border-[#e9dfcf] bg-gradient-to-r from-[#17363a] to-[#1f6668] p-5 text-white sm:p-7">
            <div className="absolute right-0 top-0 h-full w-44 opacity-15" aria-hidden="true">{portrait ? <Image src={portrait} alt="" fill sizes="176px" className="object-cover object-top" /> : null}</div>
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-4"><div className="max-w-3xl"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full border border-[#f2d99b]/55 bg-[#fffdf8]"><MissionSystemIcon missionId={entry.mission_id ?? ''} size={40} label="" /></span><div><p className="text-[10px] font-black tracking-[.16em] text-[#f2d99b]">{entry.mission_id} · {tr('ACTIVATED SIGNAL', 'إشارة مفعّلة')}</p><h2 className="mt-1 font-serif text-3xl">{entry.title ?? entry.mission_id}</h2></div></div></div><span className="rounded-full border border-white/20 bg-[#102f32]/45 px-3 py-2 text-xs font-bold backdrop-blur-sm">{entry.completed_at ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-IQ' : 'en',{dateStyle:'medium'}).format(new Date(entry.completed_at)) : tr('Completed', 'مكتملة')}</span></div><p className="relative z-10 mt-4 max-w-3xl font-serif text-xl leading-8 text-[#e8f2ee] ten-clinical-content" lang="en">{entry.principle}</p>
          </div>
          <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[.8fr_1.2fr]">
            <section><p className="ten-eyebrow">{tr('YOUR REFLECTION', 'تأملك')}</p><p className="mt-2 whitespace-pre-wrap leading-7 text-[#526c6e]" dir="auto">{entry.reflection?.trim() || tr('No reflection saved yet. You can return to the completed mission and add one.', 'لم يُحفَظ تأمل بعد. يمكنك العودة إلى المهمة المكتملة وإضافة تأمل.')}</p>{entry.framework && <div className="mt-5 rounded-2xl bg-[#f7f0df] p-4"><p className="text-xs font-black text-[#8b6a2b]">{tr('CASE FRAMEWORK', 'إطار الحالة')}</p><p className="mt-2 text-sm leading-6 ten-clinical-content" lang="en">{entry.framework}</p></div>}</section>
            <section><p className="ten-eyebrow">{tr('NEXUS ECHO', 'صدى النِكسس')}</p><div className="mt-3 space-y-3">{(entry.echo ?? []).map((item) => <div key={item.index} className={`rounded-2xl border p-4 ${item.unlocked ? 'border-[#9bc9b9] bg-[#edf7f4]' : 'border-[#d8ccb6] bg-[#f7f0df]'}`}>
              {!item.unlocked ? <><p className="text-sm font-black">{tr('Retrieval is sleeping.', 'الاسترجاع ساكن.')}</p><p className="mt-1 text-sm text-[#526c6e]">{tr('Unlocks', 'يُفتح')} {item.unlock_at ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-IQ' : 'en',{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.unlock_at)) : tr('later', 'لاحقاً')}.</p></> : item.response ? <><p className="text-xs font-black tracking-[.12em] text-[#1f6668]">{tr('RETRIEVED', 'تم الاسترجاع')}</p><p className="mt-2 font-bold ten-clinical-content" lang="en">{item.prompt}</p><p className="mt-2 whitespace-pre-wrap text-sm" dir="auto">{tr('Your response', 'إجابتك')}: {item.response}</p>{item.answer && <div className="mt-3 rounded-xl bg-white/80 p-3 text-sm ten-clinical-content" lang="en"><strong>Anchor:</strong> {item.answer}</div>}</> : <form action={submitNexusEcho}><input type="hidden" name="run_id" value={entry.run_id} /><input type="hidden" name="item_index" value={item.index} /><label className="block text-sm font-bold"><span className="ten-clinical-content" lang="en">{item.prompt}</span><textarea required minLength={3} name="text" className="mt-3 min-h-24 w-full rounded-xl border border-[#9bc9b9] bg-white p-3" placeholder={tr('Retrieve from memory before checking notes…', 'استرجع من ذاكرتك قبل مراجعة الملاحظات…')} /></label><button type="submit" className="ten-action mt-3">{tr('Save retrieval', 'حفظ الاسترجاع')}</button></form>}
            </div>)}</div></section>
          </div>
        </article>
      }) : <section className="ten-panel"><h2>{tr('Your Codex is still empty.', 'ما زال سجلّك فارغاً.')}</h2><p>{tr('Complete a live mission to activate its signal. Your first completed mission will appear here automatically.', 'أكمل مهمة مباشرة لتفعيل إشارتها. ستظهر أول مهمة مكتملة هنا تلقائياً.')}</p><Link href="/learner" className="ten-action ten-spaced">{tr('Return to Baghdad', 'العودة إلى بغداد')} →</Link></section>}
    </div>
  </LearnerShell>
}
