import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { brandAssets } from '@/lib/the-ten/assets'
import { motionStyles } from '@/lib/the-ten/motion'

const navigation = [
  ['/learner', 'دليلي الحضوري'],
  ['/learner/sessions', 'اللقاءات'],
  ['/learner/progress', 'اختباراتي ونتائجي'],
] as const
const publicNavigation = [
  ['#learner-content', 'عن البرنامج'],
  ['#classroom-meetings', 'اللقاءات الخمسة'],
  ['/facilitator/the-ten', 'مساحة المعلم'],
] as const

export function LearnerShell({
  title, intro, active = '/learner', children, actions, immersive = false, publicView = false, lang = 'en',
}: {
  title: string
  intro?: string
  active?: string
  children: ReactNode
  actions?: ReactNode
  immersive?: boolean
  publicView?: boolean
  lang?: 'ar' | 'en'
}) {
  return <div className={`ten-learner ${immersive ? 'ten-learner-immersive' : ''}`} style={motionStyles} lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <a href="#learner-content" className="ten-skip">انتقل إلى المحتوى</a>
    <header className="ten-header">
      <div className="ten-header-inner">
        <Link className="ten-wordmark" href={publicView ? '/' : '/learner'} aria-label="THE TEN — Baghdad Nexus">
          <Image src={brandAssets.lockup} alt="" fill sizes="(max-width: 720px) 132px, 164px" loading="lazy" className="object-cover object-center" />
        </Link>
        <nav aria-label="التنقل في البرنامج" lang="ar" dir="rtl">
          {(publicView ? publicNavigation : navigation).map(([href, label]) =>
            <Link key={href} href={href} prefetch={publicView ? false : undefined} aria-current={!publicView && href === active ? 'page' : undefined}>{label}</Link>,
          )}
        </nav>
        {publicView ? <Link href="/login" className="ten-action ten-action-secondary" prefetch={false}>دخول الحساب</Link> :
          <details className="ten-account" lang="ar" dir="rtl">
            <summary>حسابي</summary>
            <div>
              <Link href="/learner/world">عالم بغداد الاختياري</Link>
              <Link href="/learner/completion">متطلبات الإكمال الحضوري</Link>
              <Link href="/learner/orientation">دليل الاستخدام الإلكتروني</Link>
              <Link href="/learner/research-consent">المشاركة البحثية</Link>
              <Link href="/dashboard">مساحة العمل</Link>
              <form action="/auth/signout" method="post"><button type="submit">تسجيل الخروج</button></form>
            </div>
          </details>
        }
      </div>
    </header>
    <main id="learner-content" tabIndex={-1} className={`ten-main ${immersive ? 'pt-3 sm:pt-5' : ''}`}>
      {immersive ? <div className="sr-only"><h1>{title}</h1>{intro && <p>{intro}</p>}</div> :
        <div className="ten-page-heading">
          <p className="ten-eyebrow" dir="ltr">THE TEN · BAGHDAD NEXUS</p>
          <h1>{title}</h1>
          {intro && <p>{intro}</p>}
          {actions && <div className="ten-spaced">{actions}</div>}
        </div>
      }
      {immersive && actions ? <div className="mb-4 flex justify-end">{actions}</div> : null}
      {children}
    </main>
    <footer className="ten-footer" lang="ar" dir="rtl"><span dir="ltr">THE TEN · Baghdad Nexus</span><span>نتعلّم معًا، نناقش، ثم نراجع تفكيرنا.</span></footer>
  </div>
}
