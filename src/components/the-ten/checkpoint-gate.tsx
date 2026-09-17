import Image from 'next/image'
import { DecorSprite } from '@/components/the-ten/art-sprite'
import { brandAssets, worldAssets } from '@/lib/the-ten/assets'
import { getLocale, localize } from '@/lib/i18n'

export async function CheckpointGate({ title, description, durationMinutes, kind, startAction }: { title: string; description?: string | null; durationMinutes?: number | null; kind: 'entry' | 'exit' | 'checkpoint'; startAction: React.ReactNode }) {
  const locale = await getLocale()
  const tr = (english: string, arabic: string) => localize(locale, english, arabic)
  const isEntry = kind === 'entry'
  const eyebrow = isEntry ? tr('ENTRY GATE · BASELINE', 'بوابة الدخول · خط الأساس') : kind === 'exit' ? tr('EXIT GATE · TRANSFER CHECK', 'بوابة الخروج · فحص الانتقال') : tr('NEXUS CHECKPOINT', 'نقطة تحقّق النِكسس')
  const lead = isEntry
    ? tr('Record how you reason before the first Signal.', 'سجّل طريقة استدلالك قبل الإشارة الأولى.')
    : kind === 'exit'
      ? tr('The four Signals are active. Test what transfers beyond their cases.', 'الإشارات الأربع فعّالة. اختبر ما ينتقل إلى ما وراء حالاتها.')
      : tr('Enter the checkpoint with the same deliberate reasoning you used in the missions.', 'ادخل نقطة التحقّق بالاستدلال المتأنّي نفسه الذي استخدمته في المهمات.')

  return <section className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-[#315b5d] bg-[#17363a] shadow-[0_28px_90px_rgba(23,54,58,.16)]">
    <div className="relative min-h-[430px]">
      <Image src={worldAssets.nexus} alt="" fill sizes="100vw" className="object-cover object-center opacity-55" priority />
      <div className="absolute inset-0 bg-gradient-to-r from-[#102f32]/97 via-[#17363a]/86 to-[#17363a]/38" />
      <div className="pointer-events-none absolute inset-0" aria-hidden="true"><DecorSprite name="geometric-star" size={76} className="absolute right-[7%] top-[12%] opacity-55" /><DecorSprite name="astrolabe" size={100} className="absolute bottom-[10%] right-[13%] rotate-[9deg] opacity-45" /></div>
      <div className="relative z-10 flex min-h-[430px] max-w-2xl flex-col justify-end p-6 text-[#fffdf8] sm:p-9">
        <Image src={brandAssets.lockup} alt="THE TEN — BAGHDAD NEXUS" width={330} height={140} className="mb-5 h-auto w-48 object-contain object-left sm:w-60" />
        <p className="text-[10px] font-black tracking-[.19em] text-[#f2d99b]">{eyebrow}</p>
        <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-5xl">{lead}</h2>
        <p className="mt-3 text-lg font-bold text-[#fffdf8]">{title}</p>
        {description ? <p className="mt-2 max-w-xl text-sm leading-6 text-[#d8e7e2]">{description}</p> : null}
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full border border-white/20 bg-[#102f32]/45 px-3 py-2">{durationMinutes ? `${durationMinutes} ${tr('minutes', 'دقيقة')}` : tr('Untimed', 'دون توقيت')}</span><span className="rounded-full border border-white/20 bg-[#102f32]/45 px-3 py-2">{tr('Private attempt', 'محاولة خاصة')}</span><span className="rounded-full border border-white/20 bg-[#102f32]/45 px-3 py-2">{tr('No public ranking', 'لا يوجد ترتيب علني')}</span></div>
        <div className="mt-6 max-w-sm">{startAction}</div>
      </div>
    </div>
  </section>
}
