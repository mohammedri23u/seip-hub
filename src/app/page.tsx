import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20">
        <p className="mb-4 text-sm font-semibold tracking-[0.22em] text-sky-300">SEIP HUB</p>
        <h1 className="max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
          Learning, assessment, and analytics in one governed workflow.
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
          Foundation build: secure identity, programs, cohorts, learning objectives, sessions, and attendance.
        </p>
        <div className="mt-10 flex gap-3">
          <Link href="/login" className="rounded-xl bg-white px-5 py-3 font-medium text-slate-950">
            Sign in
          </Link>
          <Link href="/dashboard" className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-white">
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
