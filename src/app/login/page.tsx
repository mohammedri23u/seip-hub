import Image from 'next/image'
import { brandAssets, worldAssets } from '@/lib/the-ten/assets'
import { PendingButton } from '@/components/the-ten/experience/pending-button'
import { login } from './actions'
import { LanguageSwitcher } from '@/components/language-switcher'
import { getLocale, localize } from '@/lib/i18n'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  const locale = await getLocale()
  const tr = (english: string, arabic: string) => localize(locale, english, arabic)
  return <main className="ten-entry">
    <section className="ten-entry-world" aria-labelledby="entry-world-title"><Image src={worldAssets.baghdadHero} alt={tr('Baghdad’s river and domes beyond a scholar’s window', 'نهر بغداد وقبابها خلف نافذة عالم')} fill preload quality={90} sizes="(max-width: 720px) 640px, (max-width: 1100px) 1672px, 100vw" className="object-cover"/><p className="ten-scene-label">THE TEN / BAGHDAD NEXUS</p><div><p className="ten-scene-label">{tr('A CITY OF KNOWLEDGE. A JOURNEY OF JUDGMENT.', 'مدينةٌ للمعرفة. ورحلةٌ للحُكم السريري.')}</p><h2 id="entry-world-title">{tr('The next connection', 'الرابط التالي')}<br />{tr('begins with you.', 'يبدأ بك.')}</h2><p>{tr('Enter Baghdad. Follow its Signals. Bring your way of thinking into the Nexus.', 'ادخل بغداد. اتبع إشاراتها. واحمل طريقتك في التفكير إلى النِكسس.')}</p></div></section>
    <section className="ten-entry-form" aria-labelledby="sign-in-title"><div className="ten-entry-brand"><Image src={brandAssets.lockup} alt="THE TEN — Baghdad Nexus" fill sizes="170px" className="object-cover"/></div><div className="mb-4 flex justify-end"><LanguageSwitcher/></div><p className="ten-eyebrow">{tr('WELCOME TO THE NEXUS', 'مرحباً بك في النِكسس')}</p><h1 id="sign-in-title">{tr('Enter your journey.', 'ادخل إلى رحلتك.')}</h1><p>{tr('Sign in with your SEIP account.', 'سجّل الدخول باستخدام حسابك في SEIP.')}</p>
      {params.error && <div role="alert" className="ten-entry-error">{tr('Unable to sign in. Check your credentials and try again.', 'تعذّر تسجيل الدخول. تحقّق من بياناتك وحاول مجدداً.')}</div>}
      <form action={login}><label>{tr('Email', 'البريد الإلكتروني')}<input type="email" name="email" autoComplete="email" required/></label><label>{tr('Password', 'كلمة المرور')}<input type="password" name="password" autoComplete="current-password" required/></label><PendingButton pendingLabel={tr('Signing in…', 'جارٍ تسجيل الدخول…')}>{tr('Sign in', 'تسجيل الدخول')} <span aria-hidden="true">→</span></PendingButton></form>
    </section>
  </main>
}
