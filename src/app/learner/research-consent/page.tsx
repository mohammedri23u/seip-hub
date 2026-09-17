import Link from 'next/link'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { requireUser } from '@/lib/auth/require-user'
import { recordResearchChoice, withdrawResearchChoice } from './actions'

type ConsentState = {
  program_id: string
  learner: boolean
  consent_version: string | null
  explicit_consent_required: boolean
  policy_version: string | null
  privacy_notice_url: string | null
  data_controller_contact: string | null
  record: { id: string; status: 'granted' | 'declined' | 'withdrawn' | 'not_required'; recorded_at: string; withdrawn_at: string | null } | null
}

type JourneySummary = { enrolled?: boolean; program?: { id: string; name: string } }

export default async function ResearchConsentPage({ searchParams }: { searchParams: Promise<{ saved?: string; withdrawn?: string; error?: string }> }) {
  const query = await searchParams
  const { supabase } = await requireUser()
  const { data: journeyData } = await supabase.rpc('journey_summary', { target_cohort_id: null })
  const journey = (journeyData ?? {}) as JourneySummary

  if (!journey.enrolled || !journey.program?.id) {
    return <LearnerShell title="Research participation"><section className="ten-panel"><h2>No active learner program</h2><p>Your educational journey is not currently attached to an active cohort.</p><Link className="ten-text-link" href="/learner">Back to Baghdad →</Link></section></LearnerShell>
  }

  const { data, error } = await supabase.rpc('research_consent_state', { target_program_id: journey.program.id })
  if (error || !data) throw new Error('Could not load research participation status.')
  const state = data as ConsentState
  const status = state.record?.status ?? 'not_recorded'

  return <LearnerShell
    title="Research participation"
    intro="Your learning access, assessment access, completion status and certificate do not depend on this choice."
    actions={<Link href="/learner" className="ten-text-link">Back to Baghdad →</Link>}
  >
    {query.saved === '1' ? <p role="status" className="ten-notice">Your research participation choice has been recorded.</p> : null}
    {query.withdrawn === '1' ? <p role="status" className="ten-notice">Your research consent has been withdrawn for the current consent version.</p> : null}
    {query.error ? <p role="alert" className="ten-notice ten-notice-error">We could not record that choice. Please try again or contact the program team.</p> : null}

    <section className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
      <div className="rounded-[30px] border border-[#D8CCB6] bg-[#FFFDF8] p-6 shadow-sm sm:p-8">
        <p className="text-xs font-black tracking-[.16em] text-[#8B6A2B]">VOLUNTARY RESEARCH CHOICE</p>
        <h2 className="mt-2 font-serif text-3xl font-bold text-[#17363A]">Education and research are separate.</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-7 text-[#526C6E]">
          <p>THE TEN records educational activity so the program can operate, return learner progress, run assessments and issue completion evidence. A separate decision is required before identifiable or linkable learner data may be used for research when explicit research consent is required.</p>
          <p>You may choose <strong>grant</strong> or <strong>decline</strong>. Declining does not remove you from THE TEN and does not change your educational opportunities. If you grant consent, you may later withdraw it for the current consent version.</p>
          <p>This screen records the choice only. It does not create or imply ethics approval, and it does not replace any participant information sheet or local institutional consent process that may be required.</p>
        </div>

        {state.privacy_notice_url ? <p className="mt-5"><a className="ten-text-link" href={state.privacy_notice_url} target="_blank" rel="noreferrer">Open privacy notice ↗</a></p> : <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">The program privacy notice URL has not yet been published. You can still decline or leave the choice unrecorded; research export remains governed separately.</div>}
      </div>

      <aside className="space-y-4">
        <section className="rounded-[28px] border border-[#C7DAD5] bg-[#EDF7F4] p-5">
          <p className="text-xs font-black tracking-[.13em] text-[#1F6668]">CURRENT STATUS</p>
          <p className="mt-2 font-serif text-2xl font-bold text-[#17363A]">{statusLabel(status)}</p>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Consent version" value={state.consent_version ?? 'Not configured'} />
            <Row label="Research consent required" value={state.explicit_consent_required ? 'Yes' : 'No'} />
            <Row label="Recorded" value={state.record?.recorded_at ? new Date(state.record.recorded_at).toLocaleString() : '—'} />
          </dl>
        </section>

        {status === 'granted' ? <form action={withdrawResearchChoice.bind(null, journey.program.id)} className="rounded-[28px] border border-rose-200 bg-rose-50 p-5">
          <h3 className="font-bold text-rose-900">Withdraw research consent</h3>
          <p className="mt-2 text-sm leading-6 text-rose-800">This does not affect your learner account, missions, assessments or certificate eligibility.</p>
          <button className="mt-4 min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-black text-rose-800">Withdraw consent</button>
        </form> : <div className="grid gap-3">
          <form action={recordResearchChoice.bind(null, journey.program.id, 'granted')}>
            <button className="min-h-12 w-full rounded-[16px] bg-[#1F6668] px-5 py-3 text-sm font-black text-white">Grant research consent</button>
          </form>
          <form action={recordResearchChoice.bind(null, journey.program.id, 'declined')}>
            <button className="min-h-12 w-full rounded-[16px] border border-[#CFC2AA] bg-[#FFFDF8] px-5 py-3 text-sm font-black text-[#17363A]">Decline research participation</button>
          </form>
        </div>}

        {state.data_controller_contact ? <p className="rounded-2xl border border-[#D8CCB6] bg-[#FFFDF8] p-4 text-sm leading-6 text-[#526C6E]">Data contact: <strong className="text-[#17363A]">{state.data_controller_contact}</strong></p> : null}
      </aside>
    </section>
  </LearnerShell>
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3"><dt className="text-[#6B7774]">{label}</dt><dd className="text-right font-semibold text-[#17363A]">{value}</dd></div>
}

function statusLabel(status: string) {
  if (status === 'granted') return 'Consent granted'
  if (status === 'declined') return 'Participation declined'
  if (status === 'withdrawn') return 'Consent withdrawn'
  if (status === 'not_required') return 'Consent not required'
  return 'No research choice recorded'
}
