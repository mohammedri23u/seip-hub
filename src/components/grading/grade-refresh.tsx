'use client'
import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
export function GradeRefresh() {
 const router = useRouter()
 const [pending, startTransition] = useTransition()
 useEffect(() => {
  const refresh = () => { if (document.visibilityState === 'visible') startTransition(() => router.refresh()) }
  const timer = window.setInterval(refresh, 30000)
  window.addEventListener('focus', refresh)
  return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
 }, [router])
 return <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50" aria-live="polite">{pending ? 'جارٍ تحديث الدرجات…' : 'تحديث الدرجات'}<span className="ms-2 text-xs font-normal text-slate-500">تتحدث كل 30 ثانية أثناء فتح الصفحة</span></button>
}
