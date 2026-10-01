'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { normaliseSearch, type LearnerRow } from '@/lib/assessment/grading-workspace'

export function StudentDirectory({ programId, learners }: { programId: string; learners: LearnerRow[] }) {
 const [search, setSearch] = useState('')
 const [filter, setFilter] = useState('all')
 const visible = useMemo(() => learners.filter(row => {
  const text = normaliseSearch(`${row.full_name} ${row.student_id ?? ''} ${row.groups.join(' ')}`)
  if (search && !text.includes(normaliseSearch(search))) return false
  return filter === 'all' || (filter === 'pending' && row.pending_reviews > 0) || (filter === 'approval' && row.pending_approval > 0) || (filter === 'not-submitted' && row.submitted_attempts === 0)
 }).sort((a, b) => (b.pending_reviews + b.pending_approval) - (a.pending_reviews + a.pending_approval) || a.full_name.localeCompare(b.full_name, 'ar')), [learners, search, filter])
 return <div dir="rtl">
  <section className="grid gap-4 sm:grid-cols-3" aria-label="ملخص التصحيح">
   {[['الطلبة', learners.length], ['إجابات تحتاج تصحيح', learners.reduce((s, r) => s + Number(r.pending_reviews), 0)], ['إجابات بانتظار الاعتماد', learners.reduce((s, r) => s + Number(r.pending_approval), 0)]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p></div>)}
  </section>
  <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_240px]">
   <label className="block"><span className="mb-2 block text-sm font-medium">اختَر الطالب أو ابحث عنه</span><input value={search} onChange={e => setSearch(e.target.value)} type="search" placeholder="اسم الطالب، TEN ID، أو المجموعة" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" /></label>
   <label className="block"><span className="mb-2 block text-sm font-medium">حالة التصحيح</span><select value={filter} onChange={e => setFilter(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"><option value="all">جميع الطلبة</option><option value="pending">يحتاج تصحيح</option><option value="approval">بانتظار الاعتماد</option><option value="not-submitted">لم يسلّم اختبارًا</option></select></label>
  </div>
  <p className="my-4 text-sm text-slate-500" aria-live="polite">{visible.length} من {learners.length} طالب</p>
  <section className="grid gap-3 lg:grid-cols-2">
   {visible.map(row => <Link href={`/programs/${programId}/assessment/grading/students/${row.learner_id}`} key={row.learner_id} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-sky-600 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{row.full_name}</h2><p className="mt-1 text-sm text-slate-500"><bdi>{row.student_id || 'بدون معرّف'}</bdi>{row.groups.length > 0 ? ` · ${row.groups.join(' / ')}` : ''}</p></div><span className="text-sm font-semibold text-sky-800">فتح الإجابات ←</span></div>
    <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-slate-100 px-3 py-1.5">اختبارات مسلّمة: {row.submitted_attempts}</span>{row.pending_reviews > 0 && <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-900">للتصحيح: {row.pending_reviews}</span>}{row.pending_approval > 0 && <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sky-900">للاعتماد: {row.pending_approval}</span>}{row.in_progress_attempts > 0 && <span className="rounded-full bg-slate-100 px-3 py-1.5">قيد الإجابة: {row.in_progress_attempts}</span>}</div>
   </Link>)}
   {!visible.length && <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-600 lg:col-span-2">لا توجد أسماء تطابق البحث الحالي.</p>}
  </section>
 </div>
}
