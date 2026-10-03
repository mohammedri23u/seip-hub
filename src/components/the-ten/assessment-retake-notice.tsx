import Link from 'next/link'
import { retakeTarget, type AssessmentRetakeNotice } from '../../lib/assessment/retakes'

export function AssessmentRetakeBanner({ notice, link = false }: { notice?: AssessmentRetakeNotice | null; link?: boolean }) {
 if (!notice?.required) return null
 const href = retakeTarget(notice)
 return <aside role="status" lang="ar" dir="rtl" className="mb-5 rounded-2xl border border-[#D8A94E] bg-[#FFF8E7] p-5 text-[#17363A]">
  <h2 className="text-lg font-bold">مطلوب إعادة الـPre-test بالنسخة المختصرة</h2>
  <p className="mt-2 text-sm leading-7">تم توحيد نظام الاختبار. محاولتك القديمة وإجاباتها محفوظة في الأرشيف، لكن يلزم حل النسخة الجديدة من البداية: 3 MCQs وسؤال VSAQ واحد، بدون توقيت إجباري.</p>
  <p className="mt-2 text-sm leading-7">استخدم حسابك المعتاد، واضغط Save لكل جواب. لا تحتاج إلى إعادة تسجيل الحساب أو إعادة التهيئة.</p>
  {link && href && <Link className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#1F6668] px-4 py-2 text-sm font-bold text-white" href={href}>فتح الاختبار الجديد</Link>}
 </aside>
}
