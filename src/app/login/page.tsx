import Image from 'next/image'
import { brandAssets, worldAssets } from '@/lib/the-ten/assets'
import { PendingButton } from '@/components/the-ten/experience/pending-button'
import { login } from './actions'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  const errorMessage = params.error === 'missing_credentials'
    ? 'أدخل البريد الإلكتروني وكلمة المرور، ثم حاول مجدداً.'
    : 'تعذّر تسجيل الدخول. تأكّد من البريد الإلكتروني وكلمة المرور، ثم حاول مجدداً.'

  return <main className="ten-entry" lang="ar">
    <section className="ten-entry-world" aria-labelledby="entry-world-title" dir="rtl">
      <Image src={worldAssets.baghdadHero} alt="نهر بغداد وقبابها من عالم THE TEN" fill preload quality={90} sizes="(max-width: 720px) 640px, (max-width: 1100px) 1672px, 100vw" className="object-cover" />
      <p className="ten-scene-label" dir="ltr">THE TEN / BAGHDAD NEXUS</p>
      <div>
        <p className="ten-scene-label">لقاءات حضورية · نقاش · ورقة عمل</p>
        <h2 id="entry-world-title">نتعلّم معًا،<br />خطوة بخطوة.</h2>
        <p>لقاءات حضورية يقودها المعلم باستخدام PowerPoint. حسابك يساعدك على متابعة اللقاءات والاختبارات والنتائج.</p>
      </div>
    </section>
    <section className="ten-entry-form" aria-labelledby="sign-in-title" dir="rtl">
      <div className="ten-entry-brand"><Image src={brandAssets.lockup} alt="THE TEN — Baghdad Nexus" fill sizes="170px" className="object-cover" /></div>
      <p className="ten-eyebrow">مرحبًا بك في البرنامج</p>
      <h1 id="sign-in-title">دخول البرنامج</h1>
      <p>استخدم الحساب الذي استلمته من إدارة البرنامج.</p>
      {params.error && <div role="alert" className="ten-entry-error">{errorMessage}</div>}
      <form action={login}>
        <label>البريد الإلكتروني<input type="email" name="email" autoComplete="email" required dir="ltr" lang="en" /></label>
        <label>كلمة المرور<input type="password" name="password" autoComplete="current-password" required dir="ltr" /></label>
        <PendingButton pendingLabel="جارٍ تسجيل الدخول…">تسجيل الدخول <span aria-hidden="true">←</span></PendingButton>
      </form>
    </section>
  </main>
}
