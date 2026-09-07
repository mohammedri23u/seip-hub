export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const tone = normalized === 'active' || normalized === 'live'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : normalized === 'scheduled'
      ? 'border-sky-200 bg-sky-50 text-sky-700'
      : normalized === 'completed'
        ? 'border-violet-200 bg-violet-50 text-violet-700'
        : normalized === 'paused' || normalized === 'cancelled'
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-slate-200 bg-slate-50 text-slate-600'

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>
      {status.replaceAll('_', ' ')}
    </span>
  )
}
