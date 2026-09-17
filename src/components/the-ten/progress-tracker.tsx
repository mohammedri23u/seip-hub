'use client'
import { useI18n } from '@/components/i18n-provider'

export function ProgressTracker({ total, answered }: { total: number; answered: number }) {
  const { tr } = useI18n()
  const safeTotal = Math.max(total, 0)
  const value = Math.max(0, Math.min(answered, safeTotal))
  const percent = safeTotal ? Math.round((value / safeTotal) * 100) : 0

  return (
    <div className="rounded-[22px] border border-[#D8CCB6] bg-[#FFFDF8]/95 p-4" aria-label={tr(`${value} of ${total} questions answered`, `تمت الإجابة عن ${value} من ${total} سؤالاً`)}>
      <div className="flex items-center justify-between gap-4 text-xs font-bold tracking-wide text-[#426064]">
        <span>{tr('ASSESSMENT PROGRESS', 'تقدّم التقييم')}</span>
        <span>{value}/{total}</span>
      </div>
      <div role="progressbar" aria-label={tr('Questions answered', 'الأسئلة المجابة')} aria-valuenow={value} aria-valuemin={0} aria-valuemax={safeTotal || 1} aria-valuetext={tr(`${value} of ${safeTotal} questions answered`, `تمت الإجابة عن ${value} من ${safeTotal} سؤالاً`)} className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#E8DDC8]">
        <div
          className="h-full rounded-full bg-[#1F6668] transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
