'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Locale } from '@/lib/i18n'

type I18nValue = {
  locale: Locale
  isArabic: boolean
  tr: (english: string, arabic: string) => string
}

const I18nContext = createContext<I18nValue>({
  locale: 'en',
  isArabic: false,
  tr: (english) => english,
})

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18nValue>(() => ({
    locale,
    isArabic: locale === 'ar',
    tr: (english, arabic) => locale === 'ar' ? arabic : english,
  }), [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
