import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { requireUser } from '@/lib/auth/require-user'
import { createProgram } from './actions'

export default async function NewProgramPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { supabase, userId } = await requireUser()
  const params = await searchParams
  const { data: admin } = await supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle()

  if (!admin) {
    return (
      <AppShell title="Create program">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          Only platform administrators can create programs.
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Create program"
      actions={<Link href="/dashboard" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium">Cancel</Link>}
    >
      <section className="max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        {params.error ? <p className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Unable to create the program. Check the fields and try again.</p> : null}
        <form action={createProgram} className="space-y-5">
          <Field label="Program name" name="name" placeholder="Student Education Improvement Program" />
          <Field label="Program code" name="code" placeholder="SEIP" helper="2–20 letters, numbers, underscores, or hyphens." />
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea name="description" rows={5} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
          </label>
          <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Create program</button>
        </form>
      </section>
    </AppShell>
  )
}

function Field({ label, name, placeholder, helper }: { label: string; name: string; placeholder?: string; helper?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input name={name} placeholder={placeholder} required className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
      {helper ? <span className="mt-1 block text-xs text-slate-500">{helper}</span> : null}
    </label>
  )
}
