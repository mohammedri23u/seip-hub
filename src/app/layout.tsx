import type { Metadata } from 'next'
import localFont from 'next/font/local'
import type { ReactNode } from 'react'
import { I18nProvider } from '@/components/i18n-provider'
import { getLocale } from '@/lib/i18n'
import './globals.css'

const thmanyahSans = localFont({
  src: [
    { path: './fonts/thmanyah-sans-light.woff2', weight: '300', style: 'normal' },
    { path: './fonts/thmanyah-sans-regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/thmanyah-sans-medium.woff2', weight: '500', style: 'normal' },
    { path: './fonts/thmanyah-sans-bold.woff2', weight: '700', style: 'normal' },
    { path: './fonts/thmanyah-sans-black.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-thmanyah-sans',
  display: 'swap',
  preload: false,
  fallback: ['Arial', 'sans-serif'],
})

const thmanyahSerifDisplay = localFont({
  src: [
    { path: './fonts/thmanyah-serifdisplay-light.woff2', weight: '300', style: 'normal' },
    { path: './fonts/thmanyah-serifdisplay-regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/thmanyah-serifdisplay-medium.woff2', weight: '500', style: 'normal' },
    { path: './fonts/thmanyah-serifdisplay-bold.woff2', weight: '700', style: 'normal' },
    { path: './fonts/thmanyah-serifdisplay-black.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-thmanyah-serif-display',
  display: 'swap',
  preload: false,
  fallback: ['Georgia', 'serif'],
})

export const metadata: Metadata = {
  title: 'SEIP Hub',
  description: 'Learning, assessment, and analytics for SEIP',
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await getLocale()
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`${thmanyahSans.variable} ${thmanyahSerifDisplay.variable}`}>
      <body><I18nProvider locale={locale}>{children}</I18nProvider></body>
    </html>
  )
}
