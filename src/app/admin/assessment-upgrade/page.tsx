import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/require-user'

const COHORT_ID = '6ee9f85f-eff6-47bc-b518-05984bd0fbee'

type UpgradeStatus = {
  active: boolean
  duration_seconds: number | null
  timing_mode?: string
  questions: number
  mcq: number
  vsaq: number
  preserved_legacy_learners: number
}

async function activateUpgrade() {
  'use server'
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('activate_micro_assessments', {
    target_cohort_id: COHORT_ID,
    confirm_activation: true,
  })
  if (error) redirect('/admin/assessment-upgrade?error=activation_failed')
  redirect('/admin/assessment-upgrade?activated=1')
}

export default async function AssessmentUpgradePage({ searchParams }: {
  searchParams: Promise<{ error?: string; activated?: string }>
}) {
  const query = await searchParams
  const { supabase } = await requireUser()
  const { data, error } = await supabase.rpc('activate_micro_assessments', {
    target_cohort_id: COHORT_ID,
    confirm_activation: false,
  })
  if (error || !data) return <main dir="rtl" className="mx-auto max-w-2xl px-5 py-12">
    <h1 className="text-2xl font-bold">يلزم حساب الإدارة</h1>
    <p className="mt-4 leading-8">هذه الصفحة متاحة فقط لـProgram Director أو Assessment Lead. لم يتغيّر أي اختبار.</p>
    <Link href="/dashboard" className="mt-6 inline-block underline">العودة إلى لوحة التحكم</Link>
  </main>
  const status = data as UpgradeStatus
  return <main dir="rtl" className="mx-auto max-w-2xl px-5 py-10 text-[#17363A]">
    <p dir="ltr" className="text-sm font-bold tracking-wider">THE TEN — BAGHDAD NEXUS</p>
    <h1 className="mt-3 text-3xl font-bold">الاختبارات المختصرة — بدون توقيت</h1>
    <section className="mt-6 rounded-2xl border border-[#CFC2AA] bg-[#FFFDF8] p-6">
      <p className="text-xl font-bold">{status.active ? 'النسخة المختصرة مفعّلة' : 'النسخة جاهزة ولم تُفعّل بعد'}</p>
      <p className="mt-4 leading-8">كل Pre-test وPost-test يحتوي {status.mcq} MCQs وسؤال VSAQ واحد، بمجموع {status.questions} أسئلة، بدون توقيت إجباري. يوجد توضيح عربي للمطلوب مع كل سؤال.</p>
      <p className="mt-3 leading-8">الطالب يجيب بالوقت الذي يناسبه ويمكنه العودة لإكمال الأسئلة المتبقية. تبقى الإجابات المثبّتة محفوظة. النص الذي لم يضغط حفظه لا يُرسل تلقائيًا.</p>
      <p className="mt-3 leading-8">المحاولات القديمة محفوظة للتوثيق. تظهر تكليفات الإعادة والاختبارات الحالية لكل طالب في كشف الدرجات، وتُفصل النتائج الجديدة عن الأرشيف القديم.</p>
      <p className="mt-3 leading-8">النموذجان A/B متطابقان في توزيع الأهداف وأنواع الأسئلة، لكن التكافؤ في الصعوبة لم يُثبت تجريبيًا. تُفصل نتائج هذه النسخة عن نتائج الاختبار الطويل، ولا تُستخدم وحدها للحكم على Competency.</p>
      {query.error ? <p role="alert" className="mt-5 rounded-xl bg-[#FCEFED] p-4 leading-7 text-[#8C403A]">لم يكتمل التفعيل. بقيت التعيينات والمحاولات محفوظة؛ تحقق من صلاحيات الإدارة وإعدادات النشر.</p> : null}
      {status.active ? <p role="status" className="mt-6 font-bold text-[#1F6668]">تم التفعيل وحُفظ سجل التغيير.</p> : <form action={activateUpgrade} className="mt-6">
        <button type="submit" className="min-h-12 w-full rounded-xl bg-[#D8A94E] px-6 py-3 font-bold">تفعيل النسخة المختصرة مع حفظ المحاولات السابقة</button>
      </form>}
    </section>
    <Link href="/dashboard" className="mt-6 inline-block underline">العودة إلى لوحة التحكم</Link>
  </main>
}
