import Image from 'next/image'
import Link from 'next/link'
import { DecorSprite } from '@/components/the-ten/art-sprite'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { brandAssets, worldAssets } from '@/lib/the-ten/assets'
import { getJourneySummary } from '@/lib/the-ten/runtime'
import { claimCertificate, submitCompletionFeedback } from './actions'

function Gate({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return <li className="flex items-start gap-3 rounded-2xl border border-[#d8ccb6] bg-[#fffdf8] p-4"><span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-black ${done ? 'bg-[#2f8a72] text-white' : 'bg-[#ead9b8] text-[#8b6a2b]'}`}>{done ? '✓' : '·'}</span><div><strong>{label}</strong><p className="mt-1 text-sm leading-6 text-[#526c6e]">{detail}</p></div></li>
}

export default async function CertificatePage({ searchParams }: { searchParams: Promise<{ feedback?: string; issued?: string; error?: string }> }) {
  const [summary, query] = await Promise.all([getJourneySummary(), searchParams])
  if (!summary.enrolled || !summary.cohort) return <LearnerShell active="/learner/certificate" title="Completion"><section className="ten-panel"><h2>No active learner journey</h2><p>Your account is not attached to a learner cohort.</p></section></LearnerShell>

  const missionDone = (summary.mission_completed_count ?? 0) >= (summary.mission_required_count ?? 4)
  const attendanceDone = (summary.attendance?.completed ?? 0) >= (summary.attendance?.required ?? 0)
  const allBeforeFeedback = Boolean(summary.onboarding_complete && summary.pretest?.completed && missionDone && summary.posttest?.completed && attendanceDone)

  return <LearnerShell active="/learner/certificate" title="Completion pathway" intro="The certificate is a final recorded state. It unlocks only when every configured requirement is complete.">
    {query.feedback === 'saved' && <p role="status" className="ten-notice">Final feedback saved. Your eligibility has been recalculated.</p>}
    {query.issued === '1' && <p role="status" className="ten-notice">Certificate issued. Its verification code is shown below.</p>}
    {query.error && <p role="alert" className="ten-notice ten-notice-error">That completion action could not be saved. Review the remaining gates and try again.</p>}

    <section className="relative min-h-[340px] overflow-hidden rounded-[2rem] border border-[#315b5d] bg-[#17363a] text-white shadow-[0_24px_70px_rgba(23,54,58,.16)]">
      <Image src={worldAssets.nexus} alt="" fill sizes="100vw" className="object-cover object-center opacity-50" priority />
      <div className="absolute inset-0 bg-gradient-to-r from-[#102f32]/96 via-[#17363a]/82 to-[#17363a]/35" />
      <div className="pointer-events-none absolute inset-0" aria-hidden="true"><DecorSprite name="geometric-star" size={78} className="absolute right-[8%] top-[14%] opacity-55" /><DecorSprite name="waves" size={118} className="absolute bottom-[4%] right-[18%] opacity-45" /></div>
      <div className="relative z-10 flex min-h-[340px] max-w-3xl flex-col justify-end p-6 sm:p-8">
        <Image src={brandAssets.lockup} alt="THE TEN — BAGHDAD NEXUS" width={340} height={140} className="mb-5 h-auto w-52 object-contain object-left sm:w-64" />
        <p className="text-xs font-black tracking-[.18em] text-[#f2d99b]">THE FINAL GATE</p>
        <h2 className="mt-3 font-serif text-3xl sm:text-5xl">{summary.eligible || summary.certificate ? 'The Nexus recognizes your completed path.' : 'Your signal map is still forming.'}</h2>
        <p className="mt-4 max-w-2xl leading-7 text-[#d8e7e2]">This pathway reads persisted orientation, assessment, mission, attendance, and feedback records. Page visits alone cannot unlock it.</p>
      </div>
    </section>

    <ol className="mt-6 grid gap-3 md:grid-cols-2">
      <Gate done={Boolean(summary.onboarding_complete)} label="Orientation" detail="Journey agreement and assessment acknowledgement recorded." />
      <Gate done={Boolean(summary.pretest?.completed)} label="Entry Baseline" detail="The starting clinical-reasoning checkpoint has a submitted attempt." />
      <Gate done={missionDone} label={`Four mission signals (${summary.mission_completed_count ?? 0}/${summary.mission_required_count ?? 4})`} detail="Each required mission must be completed through the live mission engine." />
      <Gate done={Boolean(summary.posttest?.completed)} label="Exit Transfer Check" detail="The matched post-test must have a submitted attempt after all mission signals activate." />
      <Gate done={attendanceDone} label={`Attendance (${summary.attendance?.completed ?? 0}/${summary.attendance?.required ?? 0})`} detail="Only attendance statuses accepted by the program count toward completion." />
      <Gate done={!summary.feedback_required || Boolean(summary.feedback_complete)} label="Final reflection & feedback" detail={summary.feedback_required ? 'Required program feedback must be submitted.' : 'Feedback is not required for this cohort.'} />
    </ol>

    {summary.next_stage === 'posttest' && summary.posttest?.id && <section className="ten-panel ten-spaced"><p className="ten-eyebrow">NEXT GATE</p><h2>Exit Transfer Check</h2><p>All required mission signals are complete. The post-test is now available.</p><Link className="ten-action ten-spaced" href={`/assessments/${summary.posttest.id}/take`}>Begin post-test →</Link></section>}

    {summary.feedback_required && !summary.feedback_complete && allBeforeFeedback && <form action={submitCompletionFeedback} className="ten-panel ten-spaced"><input type="hidden" name="cohort_id" value={summary.cohort.id} /><p className="ten-eyebrow">FINAL REFLECTION</p><h2>Close the learning loop.</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Clinical relevance<select required name="relevance" className="mt-2 min-h-12 w-full rounded-xl border border-[#d8ccb6] bg-white px-3"><option value="">Choose…</option>{[1,2,3,4,5].map(v=><option key={v} value={v}>{v} / 5</option>)}</select></label><label className="text-sm font-bold">Learning design<select required name="learning_design" className="mt-2 min-h-12 w-full rounded-xl border border-[#d8ccb6] bg-white px-3"><option value="">Choose…</option>{[1,2,3,4,5].map(v=><option key={v} value={v}>{v} / 5</option>)}</select></label></div><label className="mt-4 block text-sm font-bold">What was most valuable?<textarea required minLength={3} name="most_valuable" className="mt-2 min-h-24 w-full rounded-xl border border-[#d8ccb6] bg-white p-3" /></label><label className="mt-4 block text-sm font-bold">What should improve?<textarea required minLength={3} name="improvement" className="mt-2 min-h-24 w-full rounded-xl border border-[#d8ccb6] bg-white p-3" /></label><label className="mt-4 block text-sm font-bold">Anything else?<textarea name="additional" className="mt-2 min-h-20 w-full rounded-xl border border-[#d8ccb6] bg-white p-3" /></label><button className="ten-action ten-spaced" type="submit">Save final reflection →</button></form>}

    {summary.eligible && !summary.certificate && <form action={claimCertificate} className="relative overflow-hidden rounded-[1.75rem] border border-[#d8a94e] bg-[#fff8df] p-6 sm:p-8"><DecorSprite name="baghdad-arch" size={112} className="absolute -bottom-3 -right-2 opacity-10" /><input type="hidden" name="cohort_id" value={summary.cohort.id} /><div className="relative"><p className="ten-eyebrow">ELIGIBLE</p><h2 className="font-serif text-3xl">Every gate is complete.</h2><p className="mt-3 max-w-2xl leading-7 text-[#526c6e]">Issue the completion certificate now. The verification code and eligibility snapshot will be stored with the record.</p><button className="ten-action ten-action-gold ten-spaced" type="submit">Activate certificate →</button></div></form>}

    {summary.certificate && <section className="relative overflow-hidden rounded-[2rem] border-2 border-[#d8a94e] bg-[#fffdf8] p-7 text-center shadow-[0_25px_70px_rgba(23,54,58,.1)] sm:p-10"><div className="absolute inset-3 rounded-[1.5rem] border border-[#d8a94e]/35" aria-hidden="true" /><DecorSprite name="geometric-star" size={88} className="absolute left-4 top-4 opacity-10" /><DecorSprite name="baghdad-arch" size={110} className="absolute bottom-0 right-0 opacity-10" /><div className="relative"><Image src={brandAssets.crest} alt="THE TEN crest" width={112} height={112} className="mx-auto h-24 w-24 rounded-full object-cover" /><p className="mt-5 text-xs font-black tracking-[.22em] text-[#8b6a2b]">THE TEN — BAGHDAD NEXUS</p><h2 className="mt-5 font-serif text-4xl">{summary.certificate.title}</h2><p className="mt-4 text-[#526c6e]">Issued for {summary.program?.name} · {summary.cohort.name}</p><div className="mx-auto mt-7 max-w-md rounded-2xl bg-[#17363a] p-5 text-white"><p className="text-[10px] font-black tracking-[.16em] text-[#f2d99b]">VERIFICATION CODE</p><p className="mt-2 font-mono text-2xl font-black tracking-[.08em]">{summary.certificate.code}</p></div><p className="mt-5 text-sm text-[#526c6e]">Issued {new Intl.DateTimeFormat('en',{dateStyle:'long'}).format(new Date(summary.certificate.issued_at))}</p></div></section>}

    <Link className="ten-text-link ten-spaced" href="/learner">← Return to Baghdad</Link>
  </LearnerShell>
}
