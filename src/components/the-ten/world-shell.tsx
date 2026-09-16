import type { ReactNode } from 'react'

export function WorldShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-[#D8CCB6] bg-[#F7F0DF] p-5 shadow-[0_20px_65px_rgba(23,54,58,0.08)] sm:p-7">
      <div aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full border border-[#46B9BD]/20 bg-[#46B9BD]/10" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 size-40 rounded-full border border-[#D8A94E]/20 bg-[#D8A94E]/10" />
      <div className="relative">
        <p className="text-xs font-black tracking-[0.16em] text-[#1F6668]">BAGHDAD NEXUS</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-[#17363A]">{title}</h2>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5B7072]">{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
    </section>
  )
}
