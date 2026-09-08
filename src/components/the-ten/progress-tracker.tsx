'use client'

export function ProgressTracker({ total, answered }: { total: number; answered: number }) {
  const safeTotal = Math.max(total, 1)
  const value = Math.min(answered, safeTotal)
  const percent = Math.round((value / safeTotal) * 100)

  return (
    <div className="rounded-[22px] border border-[#D8CCB6] bg-[#FFFDF8]/95 p-4" aria-label={`${value} of ${total} questions answered`}>
      <div className="flex items-center justify-between gap-4 text-xs font-bold tracking-wide text-[#426064]">
        <span>ASSESSMENT PROGRESS</span>
        <span>{value}/{total}</span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#E8DDC8]">
        <div
          className="h-full rounded-full bg-[#1F6668] transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
