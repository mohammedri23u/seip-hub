import { cookies } from 'next/headers'
import { cache } from 'react'

export type Locale = 'ar' | 'en'

export const getLocale = cache(async (): Promise<Locale> => {
  return (await cookies()).get('seip_locale')?.value === 'ar' ? 'ar' : 'en'
})

export function localize(locale: Locale, english: string, arabic: string) {
  return locale === 'ar' ? arabic : english
}
