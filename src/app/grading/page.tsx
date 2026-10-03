import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { requireUser } from '@/lib/auth/require-user'

export default async function GradingHome() {
 const { supabase, userId } = await requireUser()
 const [{ data: admin }, { data: memberships }, { data: programs }] = await Promise.all([
  supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
  supabase.from('program_memberships').select('program_id,role').eq('user_id', userId).eq('status', 'active'),
  supabase.from('programs').select('id,name,code'),
 ])
 const entries = (programs ?? []).flatMap(p => {
  const roles = (memberships ?? []).filter(m => m.program_id === p.id).map(m => m.role)
  const manager = Boolean(admin) || roles.some(r => ['program_director', 'assessment_lead'].includes(r))
  if (!manager && !roles.some(r => ['peer_educator', 'reviewer'].includes(r))) return []
  return [{ ...p, href: `/programs/${p.id}/assessment/grading${manager ? '/students' : ''}` }]
 })
 if (!entries.length) notFound()
 if (entries.length === 1) redirect(entries[0].href)
 return <AppShell title="تصحيح إجابات الطلبة" eyebrow="GRADING WORKSPACE"><div dir="rtl" className="grid gap-4">{entries.map(p => <Link key={p.id} href={p.href} className="rounded-2xl border bg-white p-6"><strong>{p.name}</strong><p>{p.code}</p></Link>)}</div></AppShell>
}
