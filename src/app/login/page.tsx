import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
        <p className="text-sm font-semibold tracking-[0.2em] text-sky-300">SEIP HUB</p>
        <h1 className="mt-3 text-3xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-400">Use your SEIP account credentials.</p>

        {params.error ? (
          <div className="mt-5 rounded-xl border border-rose-900/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            Unable to sign in. Check your credentials and try again.
          </div>
        ) : null}

        <form className="mt-7 space-y-5">
          <label className="block text-sm">
            <span className="mb-2 block text-slate-300">Email</span>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none ring-sky-400 focus:ring-2"
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block text-slate-300">Password</span>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none ring-sky-400 focus:ring-2"
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button
            formAction={login}
            className="w-full rounded-xl bg-sky-400 px-4 py-3 font-semibold text-slate-950 hover:bg-sky-300"
          >
            Continue
          </button>
        </form>
      </section>
    </main>
  )
}
