import Link from 'next/link'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { getJourneySummary, getTenCodex } from '@/lib/the-ten/runtime'
import { submitNexusEcho } from './actions'

type EchoItem = { index?: number; prompt?: string | null; unlock_at?: string; unlocked?: boolean; response?: string | null; answer?: string | null }
type CodexEntry = { run_id?: string; mission_id?: string; title?: string; principle?: string; reflection?: string; completed_at?: string; framework?: string; echo?: EchoItem[] }

export default async function LearnerProgress({ searchParams }: { searchParams: Promise<{ echo?: string; error?: string }> }) {
  const [summary, codexRaw, query] = await Promise.all([getJourneySummary(), getTenCodex(), searchParams])
  const codex = codexRaw as CodexEntry[]
  const completed = summary.mission_completed_count ?? 0
  const revealed = summary.mission_required_count ?? 4
  const programSignalsTotal = 10

  return <LearnerShell active="/learner/progress" title="My Codex" intro="A record of the reasoning principles you activated, what changed your mind, and what returns later through Nexus Echo.">
    {query.echo === 'saved' && <p role="status" className="ten-notice">Nexus Echo saved. The answer anchor is now visible for that retrieval item.</p>}
    {query.error && <p role="alert" className="ten-notice ten-notice-error">That Nexus Echo could not be saved. Check that it has unlocked and try again.</p>}

    <section className="grid gap-4 md:grid-cols-3">
      <div className="ten-panel"><p className="ten-eyebrow">SIGNALS</p><div className="mt-2 font-serif text-4xl">{completed}/{programSignalsTotal}</div><p>Signals active across THE TEN. First Activation reveals {revealed} of the ten.</p></div>
      <div className="ten-panel"><p className="ten-eyebrow">NEXT GATE</p><div className="mt-2 font-serif text-2xl capitalize">{summary.next_stage?.replaceAll('_',' ') ?? 'Journey'}</div><p>Your next step is driven by persisted completion records, not by page visits.</p></div>
      <div className="ten-panel"><p className="ten-eyebrow">RETRIEVAL</p><div className="mt-2 font-serif text-4xl">{codex.reduce((sum,entry)=>sum+(entry.echo?.filter(item=>item.unlocked).length ?? 0),0)}</div><p>Nexus Echo prompts currently unlocked.</p></div>
    </section>

    <div className="mt-8 space-y-5">
      {codex.length ? codex.map((entry,index) => <article key={entry.run_id ?? index} className="overflow-hidden rounded-[1.75rem] border border-[#d8ccb6] bg-[#fffdf8] shadow-[0_16px_45px_rgba(23,54,58,.06)]">
        <div className="border-b border-[#e9dfcf] bg-gradient-to-r from-[#17363a] to-[#1f6668] p-5 text-white sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black tracking-[.16em] text-[#f2d99b]">{entry.mission_id} · ACTIVATED SIGNAL</p><h2 className="mt-2 font-serif text-3xl">{entry.title ?? entry.mission_id}</h2></div><span className="rounded-full border border-white/20 px-3 py-2 text-xs font-bold">{entry.completed_at ? new Intl.DateTimeFormat('en',{dateStyle:'medium'}).format(new Date(entry.completed_at)) : 'Completed'}</span></div><p className="mt-4 max-w-3xl font-serif text-xl leading-8 text-[#e8f2ee]">{entry.principle}</p></div>
        <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[.8fr_1.2fr]">
          <section><p className="ten-eyebrow">YOUR REFLECTION</p><p className="mt-2 whitespace-pre-wrap leading-7 text-[#526c6e]">{entry.reflection?.trim() || 'No reflection saved yet. You can return to the completed mission and add one.'}</p>{entry.framework && <div className="mt-5 rounded-2xl bg-[#f7f0df] p-4"><p className="text-xs font-black text-[#8b6a2b]">CASE FRAMEWORK</p><p className="mt-2 text-sm leading-6">{entry.framework}</p></div>}</section>
          <section><p className="ten-eyebrow">NEXUS ECHO</p><div className="mt-3 space-y-3">{(entry.echo ?? []).map((item) => <div key={item.index} className={`rounded-2xl border p-4 ${item.unlocked ? 'border-[#9bc9b9] bg-[#edf7f4]' : 'border-[#d8ccb6] bg-[#f7f0df]'}`}>
            {!item.unlocked ? <><p className="text-sm font-black">Retrieval is sleeping.</p><p className="mt-1 text-sm text-[#526c6e]">Unlocks {item.unlock_at ? new Intl.DateTimeFormat('en',{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.unlock_at)) : 'later'}.</p></> : item.response ? <><p className="text-xs font-black tracking-[.12em] text-[#1f6668]">RETRIEVED</p><p className="mt-2 font-bold">{item.prompt}</p><p className="mt-2 whitespace-pre-wrap text-sm">Your response: {item.response}</p>{item.answer && <div className="mt-3 rounded-xl bg-white/80 p-3 text-sm"><strong>Anchor:</strong> {item.answer}</div>}</> : <form action={submitNexusEcho}><input type="hidden" name="run_id" value={entry.run_id} /><input type="hidden" name="item_index" value={item.index} /><label className="block text-sm font-bold">{item.prompt}<textarea required minLength={3} name="text" className="mt-3 min-h-24 w-full rounded-xl border border-[#9bc9b9] bg-white p-3" placeholder="Retrieve from memory before checking notes…" /></label><button type="submit" className="ten-action mt-3">Save retrieval</button></form>}
          </div>)}</div></section>
        </div>
      </article>) : <section className="ten-panel"><h2>Your Codex is still empty.</h2><p>Complete a live mission to activate its signal. Your first completed mission will appear here automatically.</p><Link href="/learner" className="ten-action ten-spaced">Return to Baghdad →</Link></section>}
    </div>
  </LearnerShell>
}
