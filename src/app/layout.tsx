import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { I18nProvider } from '@/components/i18n-provider'
import { getLocale } from '@/lib/i18n'
import './globals.css'

export const metadata: Metadata = {
  title: 'SEIP Hub',
  description: 'Learning, assessment, and analytics for SEIP',
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await getLocale()
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body><I18nProvider locale={locale}>{children}</I18nProvider></body>
    </html>
  )
}
