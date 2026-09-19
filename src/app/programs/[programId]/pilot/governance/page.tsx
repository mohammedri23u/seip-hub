import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { requireProgramRole } from '@/lib/auth/require-program-role'
import { saveEthics, publishInformation, requestExport, decideExport } from './actions'
const input = 'mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3'
const panel = 'rounded-2xl border border-slate-200 bg-white p-6 space-y-4'
export default async function Governance({params,searchParams}:{params:Promise<{programId:string}>;searchParams:Promise<{error?:string;saved?:string}>}) {
  const {programId}=await params
  const query=await searchParams
  const {supabase,userId,role}=await requireProgramRole(programId,['program_director','assessment_lead','reviewer'])
  const [{data:g},{data:versions},{data:requests}]=await Promise.all([
    supabase.from('program_data_governance').select('*').eq('program_id',programId).single(),
    supabase.from('research_information_versions').select('*').eq('program_id',programId).order('created_at',{ascending:false}),
    supabase.from('research_export_requests').select('*').eq('program_id',programId).order('requested_at',{ascending:false}),
  ])
  return <AppShell eyebrow="THE TEN · RESEARCH GOVERNANCE" title="Participant information & approved exports" actions={<Link href={`/programs/${programId}/pilot`}>Pilot controls</Link>}>
    {query.error && <p role="alert">The change was blocked. Check required fields and permissions.</p>}
    {query.saved && <p role="status">Saved and verified.</p>}
    <p className="my-5 rounded-xl bg-amber-50 p-4"><strong>Ethics / REC: {g?.ethics_status ?? 'pending'}.</strong> An entered reference records local approval; the platform does not independently certify it. Educational access does not depend on research consent.</p>
    <div className="grid gap-6 lg:grid-cols-2">
      {role==='program_director' && <form action={saveEthics.bind(null,programId)} className={panel}>
        <h2 className="text-xl font-bold">Record actual Ethics / REC decision</h2>
        <label>Status<select name="ethics_status" defaultValue={g?.ethics_status??'pending'} className={input}>{['pending','approved','suspended','rejected'].map(s=><option key={s}>{s}</option>)}</select></label>
        <label>Approval / protocol reference<input name="reference" defaultValue={g?.ethics_reference??''} className={input}/></label>
        <label>Evidence URL (https)<input name="evidence" type="url" defaultValue={g?.ethics_evidence_url??''} className={input}/></label>
        <label>Approval date<input name="approved_at" type="date" defaultValue={g?.ethics_approved_at??''} className={input}/></label>
        <button className="ten-button-primary">Save actual decision</button>
      </form>}
      {role==='program_director' && <form action={publishInformation.bind(null,programId)} className={panel}>
        <h2 className="text-xl font-bold">Publish an immutable information version</h2>
        <p>Use locally reviewed Participant Information, including investigator and complaint contacts, risks, data uses, retention and withdrawal limits. Publishing a new version requires fresh consent for exports.</p>
        <label>New version<input name="version" required className={input}/></label>
        <label>Participant Information<textarea name="information" required minLength={100} rows={8} className={input}/></label>
        <label>Withdrawal procedure and limits<textarea name="withdrawal" required minLength={20} rows={3} className={input}/></label>
        <button className="ten-button-primary">Publish and activate version</button>
      </form>}
      <section className={panel}><h2 className="text-xl font-bold">Version history</h2>{versions?.length ? versions.map(v=><details key={v.version}><summary>{v.version} · {new Date(v.created_at).toLocaleDateString()}</summary><p className="whitespace-pre-wrap">{v.participant_information}</p><p>{v.withdrawal_information}</p></details>):<p>No approved Participant Information version published.</p>}</section>
      <form action={requestExport.bind(null,programId)} className={panel}><h2 className="text-xl font-bold">Request research export</h2><p>Current dataset: submitted human criterion ratings, pseudonymised for IRR analysis. Free text is excluded. A different Program Director must approve. Consent and exclusions are checked again at download.</p><label>Research purpose<textarea name="purpose" required minLength={10} className={input}/></label><button className="ten-button-primary">Submit request</button></form>
    </div>
    <section className={panel+' mt-6'}><h2 className="text-xl font-bold">Requests</h2>{requests?.map(r=><article key={r.id} className="border-t py-4"><p>{r.purpose} · <strong>{r.status}</strong></p>{role==='program_director' && r.status==='requested' && r.requested_by!==userId && <form action={decideExport.bind(null,programId,r.id)} className="mt-3 flex flex-wrap gap-3"><button name="decision" value="approve" className="ten-button-primary">Approve for 24 hours</button><button name="decision" value="reject" className="ten-button-secondary">Reject</button></form>}{r.status==='approved' && r.requested_by===userId && <form method="post" action={`/programs/${programId}/pilot/exports/${r.id}`}><button className="ten-button-primary mt-3">Generate one-time download</button></form>}</article>)}</section>
  </AppShell>
}
