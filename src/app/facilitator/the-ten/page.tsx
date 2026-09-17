import Link from 'next/link'
import { FacilitatorStudio } from '@/components/the-ten/facilitator-studio'
import { LanguageSwitcher } from '@/components/language-switcher'
import { getLocale, localize } from '@/lib/i18n'
import { getTenCatalog, getTenStudio } from '@/lib/the-ten/runtime'

export default async function FacilitatorTenPage() {
  const [studio, catalog, locale] = await Promise.all([getTenStudio(), getTenCatalog(), getLocale()])
  const tr = (english: string, arabic: string) => localize(locale, english, arabic)
  return <main className="min-h-screen bg-[#f7f0df] px-4 py-6 text-[#17363a] sm:px-6 sm:py-10">
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black tracking-[.18em] text-[#1f6668]">THE TEN — BAGHDAD NEXUS</p><h1 className="mt-2 font-serif text-4xl sm:text-5xl">{tr('Facilitator Studio', 'استوديو الميسّر')}</h1><p className="mt-2 max-w-2xl leading-7 text-[#526c6e]">{tr('Launch the prepared mission and control the room state. The clinical content is already seeded.', 'ابدأ المهمة المُعدّة وتحكّم في حالة الغرفة. المحتوى السريري مُدرج مسبقاً.')}</p></div><div className="flex items-center gap-3"><LanguageSwitcher /><Link href="/dashboard" className="ten-text-link">{tr('← SEIP workspace', 'مساحة عمل SEIP →')}</Link></div></div>
      <FacilitatorStudio studio={studio} catalog={catalog} />
    </div>
  </main>
}
