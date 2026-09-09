import type { ReactNode } from 'react'
import Link from 'next/link'

export function AppShell({
  children,
  title,
  eyebrow = 'SEIP HUB',
  actions,
}: {
  children: ReactNode
  title: string
  eyebrow?: string
  actions?: ReactNode
}) {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-bold tracking-[0.18em] text-sky-700">
              SEIP HUB
            </Link>
            <nav className="hidden gap-4 text-sm text-slate-600 sm:flex">
              <Link href="/dashboard" className="hover:text-slate-950">Dashboard</Link>
              <Link href="/learner" className="hover:text-slate-950">Learning journey</Link>
            </nav>
          </div>
          <form action="/auth/signout" method="post">
            <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 md:py-10">
        <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-sky-700">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </header>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  )
}
