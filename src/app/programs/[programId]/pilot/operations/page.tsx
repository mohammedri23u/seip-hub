import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { requireProgramRole } from '@/lib/auth/require-program-role'
import { allocate, recordEvidence, saveCompletion, scheduleSession, publishAssessment } from './actions'

const field = 'mt-2 block w-full rounded-xl border bg-white p-3'
const panel = 'space-y-4 rounded-2xl border bg-white p-6'
const gates = ['sme_review', 'assessment_validation', 'rater_calibration', 'operational_dry_run', 'role_qa', 'curriculum_mapping']

export default async function Operations({ params, searchParams }: {
  params: Promise<{ programId: string }>; searchParams: Promise<{ error?: string; saved?: string }>
}) {
  const { programId } = await params
  const query = await searchParams
  const { supabase, role } = await requireProgramRole(programId, ['program_director', 'assessment_lead'])
  const [{ data: settings, error }, { data: cohorts }, { data: sequences }, { data: evidence }] = await Promise.all([
    supabase.rpc('program_completion_settings', { target_program: programId }),
    supabase.from('cohorts').select('id,name').eq('program_id', programId),
    supabase.from('program_assessment_sequences').select('group_id,sequence_code').eq('program_id', programId).eq('active', true),
    supabase.from('program_release_evidence').select('*').eq('program_id', programId),
  ])
  if (error || !settings) throw new Error('Program operations are temporarily unavailable.')
  const cohortIds = cohorts?.map(c => c.id) ?? []
  const [{ data: members }, { data: groups }, { data: sessions }, { data: staff }, { data: assessments }] = await Promise.all([
    cohortIds.length ? supabase.from('cohort_memberships').select('cohort_id,user_id').in('cohort_id', cohortIds).eq('member_type', 'learner').eq('status', 'active') : Promise.resolve({ data: [] }),
    sequences?.length ? supabase.from('group_members').select('group_id,user_id').in('group_id', sequences.map(s => s.group_id)) : Promise.resolve({ data: [] }),
    cohortIds.length ? supabase.from('sessions').select('id,title,status,scheduled_at').in('cohort_id', cohortIds).order('scheduled_at') : Promise.resolve({ data: [] }),
    supabase.from('program_memberships').select('user_id,role').eq('program_id', programId).eq('status', 'active').in('role', ['program_director', 'peer_educator', 'assessment_lead']),
    cohortIds.length ? supabase.from('assessments').select('id,title,status').in('cohort_id', cohortIds).order('title') : Promise.resolve({ data: [] }),
  ])
  const facilitators = [...new Map((staff ?? []).map(s => [s.user_id, s])).values()]
  return <AppShell eyebrow="THE TEN · PROGRAM OPERATIONS" title="Launch controls" actions={<Link href={`/programs/${programId}/pilot`}>Readiness report</Link>}>
    {query.error ? <p role="alert" className="my-4 rounded-xl bg-rose-50 p-4">Change blocked. Check permissions and required fields. AB/BA allocation cannot change after any assessment starts.</p> : null}
    {query.saved ? <p role="status" className="my-4">Saved. Readiness is recalculated from current evidence.</p> : null}
    <div className="grid gap-6 lg:grid-cols-2">
      {role === 'program_director' ? <form action={saveCompletion.bind(null, programId)} className={panel}>
        <h2 className="text-xl font-bold">Certificate requirements</h2>
        <p>All four Missions and assigned Pre/Post assessments remain required. Research participation and FCE are optional.</p>
        <label>Minimum attended sessions (0–4)<input className={field} name="attendance" type="number" min="0" max="4" required defaultValue={settings.minimum_attended_sessions}/></label>
        <label className="flex gap-3"><input type="checkbox" name="feedback" defaultChecked={settings.require_feedback}/>Require learner feedback</label>
        <label>Certificate title<input className={field} name="title" required defaultValue={settings.certificate_title}/></label>
        <button className="ten-button-primary">Save completion requirements</button>
      </form> : null}
      <section className={panel}><h2 className="text-xl font-bold">Sessions and facilitator operations</h2>{sessions?.map(s => <p key={s.id}><Link className="ten-text-link" href={`/sessions/${s.id}`}>{s.title}</Link> · {s.status} · {s.scheduled_at ? new Date(s.scheduled_at).toISOString() : 'Not scheduled'}</p>)}{cohorts?.map(c => <Link key={c.id} className="block ten-text-link" href={`/programs/${programId}/cohorts/${c.id}`}>{c.name} · cohort and scheduling</Link>)}</section>
      {role === 'program_director' ? <section className={panel}><h2 className="text-xl font-bold">Schedule and assign facilitators</h2><p>Times are UTC (Baghdad is UTC+3). Assignments add a facilitator and preserve existing staff.</p>{sessions?.filter(s => !['completed','cancelled'].includes(s.status)).map(s => <form key={s.id} action={scheduleSession.bind(null, programId, s.id)} className="space-y-3 border-t pt-4"><strong>{s.title}</strong><label>Start time (UTC)<input type="datetime-local" name="scheduled" required defaultValue={s.scheduled_at?.slice(0,16)} className={field}/></label><label>Duration (minutes)<input type="number" name="duration" min="1" max="480" required className={field}/></label><label>Add facilitator<select name="facilitator" className={field}><option value="">Keep existing assignments</option>{facilitators.map(f => <option key={f.user_id} value={f.user_id}>{f.role} · {f.user_id.slice(0,8)}</option>)}</select></label><button className="ten-button-secondary">Save session</button></form>)}</section> : null}
      <section className={panel}><h2 className="text-xl font-bold">Assessment publication</h2><p>Opening a form still enforces assigned AB/BA routing and journey requirements. Closing prevents new submissions.</p>{assessments?.map(a => <form key={a.id} action={publishAssessment.bind(null,programId,a.id)} className="space-y-3 border-t pt-4"><strong>{a.title}</strong><p>Current status: {a.status}</p><label>Availability<select name="status" required className={field} defaultValue=""><option value="" disabled>Select change</option><option value="approved">Prepared, not live</option><option value="live">Open assessment</option><option value="closed">Close assessment</option></select></label><button className="ten-button-secondary">Update availability</button></form>)}</section>
      <section className={panel}><h2 className="text-xl font-bold">Mission content</h2><p>M01 Cardiorespiratory · M02 Gastrointestinal · M03 Liver + Renal · M04 Endocrine</p><Link className="ten-text-link" href="/facilitator/the-ten">Open content status, rehearsal and Mission controls</Link></section>
      <section className={panel}><h2 className="text-xl font-bold">AB/BA allocation</h2><p>AB = Pre A / Post B. BA = Pre B / Post A. Changes are locked once an assessment starts.</p>{members?.map(m => {
        const group = groups?.find(g => g.user_id === m.user_id)
        const code = sequences?.find(s => s.group_id === group?.group_id)?.sequence_code
        return <form key={m.cohort_id + m.user_id} action={allocate.bind(null, programId, m.cohort_id, m.user_id)} className="flex flex-wrap items-end gap-3 border-t pt-3"><label>Learner {m.user_id.slice(0, 8)}<select name="sequence" className={field} defaultValue={code ?? ''} required><option value="" disabled>Unassigned</option><option>AB</option><option>BA</option></select></label><button className="ten-button-secondary">Save allocation</button></form>
      })}</section>
      <section className={panel}><h2 className="text-xl font-bold">Local release evidence</h2><p>Record real review outcomes only. The platform does not establish assessment validity or Ethics approval.</p>{gates.map(g => <p key={g}>{g.replaceAll('_', ' ')}: {evidence?.find(e => e.gate === g) ? <a className="ten-text-link" href={evidence.find(e => e.gate === g)!.evidence_url}>Recorded evidence</a> : 'Pending'}</p>)}
        {role === 'program_director' ? <form action={recordEvidence.bind(null, programId)} className="space-y-4"><label>Gate<select name="gate" className={field}>{gates.map(g => <option key={g} value={g}>{g.replaceAll('_', ' ')}</option>)}</select></label><label>Evidence URL<input name="url" type="url" pattern="https://.*" required className={field}/></label><label>Review outcome and scope<textarea name="note" required minLength={10} className={field}/></label><button className="ten-button-primary">Record actual review evidence</button></form> : null}
      </section>
    </div>
  </AppShell>
}
