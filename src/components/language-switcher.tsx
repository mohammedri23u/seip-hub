'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useI18n } from '@/components/i18n-provider'

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const router = useRouter()
  const { locale } = useI18n()
  const [pending, startTransition] = useTransition()
  const next = locale === 'ar' ? 'en' : 'ar'

  function switchLanguage() {
    document.cookie = `seip_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`
    document.documentElement.lang = next
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
    startTransition(() => router.refresh())
  }

  return <button type="button" className={`ten-language-switch ${className}`.trim()} onClick={switchLanguage} disabled={pending} aria-label={locale === 'ar' ? 'Switch language to English' : 'تغيير اللغة إلى العربية'}>{locale === 'ar' ? 'English' : 'العربية'}</button>
}
