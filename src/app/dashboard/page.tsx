import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()

  if (claimsError || !claimsData?.claims?.sub) redirect('/login')

  const userId = claimsData.claims.sub
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('full_name, status').eq('id', userId).maybeSingle(),
    supabase
      .from('program_memberships')
      .select('role, programs(id, name, code, status)')
      .eq('user_id', userId)
      .eq('status', 'active'),
  ])

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-start justify-between gap-5">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-sky-700">SEIP HUB</p>
            <h1 className="mt-2 text-4xl font-semibold">Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}</h1>
            <p className="mt-2 text-slate-600">Foundation dashboard — role-aware program access.</p>
          </div>
          <form action="/auth/signout" method="post">
            <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium">Sign out</button>
          </form>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <Metric label="Active programs" value={memberships?.length ?? 0} />
          <Metric label="Account status" value={profile?.status ?? 'pending'} />
          <Metric label="Foundation" value="v0.1" />
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Your program access</h2>
          <div className="mt-5 space-y-3">
            {memberships?.length ? (
              memberships.map((membership, index) => (
                <div key={index} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4">
                  <div>
                    <p className="font-medium">{readProgramName(membership.programs)}</p>
                    <p className="text-sm text-slate-500">{readProgramCode(membership.programs)}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    {membership.role.replaceAll('_', ' ')}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-500">No active program membership yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold capitalize">{value}</p>
    </div>
  )
}

function readProgramName(program: unknown): string {
  if (Array.isArray(program)) return String(program[0]?.name ?? 'Program')
  if (program && typeof program === 'object' && 'name' in program) return String((program as { name?: unknown }).name ?? 'Program')
  return 'Program'
}

function readProgramCode(program: unknown): string {
  if (Array.isArray(program)) return String(program[0]?.code ?? '')
  if (program && typeof program === 'object' && 'code' in program) return String((program as { code?: unknown }).code ?? '')
  return ''
}
