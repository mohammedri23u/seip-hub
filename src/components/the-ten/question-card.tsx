import type { ReactNode } from 'react'

export function QuestionCard({ number, marks, stem, children }: { number: number; marks: number; stem: string; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-[#D8CCB6] bg-[#FFFDF8] p-5 shadow-[0_16px_50px_rgba(23,54,58,0.07)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#E9F4F1] px-3 py-1.5 text-xs font-black tracking-[0.14em] text-[#1F6668]">
          CASE CHECK {String(number).padStart(2, '0')}
        </div>
        <span className="rounded-full border border-[#E1D3BA] bg-[#FFF7E7] px-3 py-1.5 text-xs font-bold text-[#8B6A2B]">
          {marks} {marks === 1 ? 'mark' : 'marks'}
        </span>
      </div>
      <h2 className="mt-5 text-lg font-semibold leading-8 text-[#17363A] sm:text-xl">{stem}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}
