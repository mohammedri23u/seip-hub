import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { brandAssets } from '@/lib/the-ten/assets'
import { motionStyles } from '@/lib/the-ten/motion'
import { LanguageSwitcher } from '@/components/language-switcher'
import { getLocale, localize } from '@/lib/i18n'

export async function LearnerShell({ title, intro, active = '/learner', children, actions, immersive = false }: { title: string; intro?: string; active?: string; children: ReactNode; actions?: ReactNode; immersive?: boolean }) {
  const locale = await getLocale()
  const tr = (english: string, arabic: string) => localize(locale, english, arabic)
  const navigation = [['/learner', tr('Baghdad', 'بغداد')], ['/learner/sessions', tr('Sessions', 'الجلسات')], ['/learner/progress', tr('My Codex', 'سجلّي')]] as const
  return <div className={`ten-learner ${immersive ? 'ten-learner-immersive' : ''}`} style={motionStyles}>
    <a href="#learner-content" className="ten-skip">{tr('Skip to learning content', 'تخطَّ إلى المحتوى التعليمي')}</a>
    <header className="ten-header">
      <div className="ten-header-inner">
        <Link className="ten-wordmark" href="/learner" aria-label={tr('THE TEN — Baghdad Nexus learner home', 'الصفحة الرئيسية لرحلة المتعلّم في THE TEN — Baghdad Nexus')}>
          <Image src={brandAssets.lockup} alt="" fill sizes="(max-width: 720px) 132px, 164px" loading="lazy" className="object-cover object-center" />
        </Link>
        <nav aria-label={tr('Learner journey navigation', 'التنقل في رحلة المتعلم')}>{navigation.map(([href, label]) => <Link key={href} href={href} aria-current={href === active ? 'page' : undefined}>{label}</Link>)}</nav>
        <div className="ten-header-actions"><LanguageSwitcher/><details className="ten-account"><summary>{tr('Account', 'الحساب')}</summary><div><Link href="/learner/certificate">{tr('Completion', 'الإكمال')}</Link><Link href="/learner/orientation">{tr('Orientation', 'التهيئة')}</Link><Link href="/dashboard">{tr('SEIP workspace', 'مساحة عمل SEIP')}</Link><form action="/auth/signout" method="post"><button type="submit">{tr('Sign out', 'تسجيل الخروج')}</button></form></div></details></div>
      </div>
    </header>
    <main id="learner-content" tabIndex={-1} className={`ten-main ${immersive ? 'pt-3 sm:pt-5' : ''}`}>
      {immersive ? <div className="sr-only"><h1 dir="auto">{title}</h1>{intro && <p dir="auto">{intro}</p>}</div> : <div className="ten-page-heading"><p className="ten-eyebrow">THE TEN · BAGHDAD NEXUS</p><h1 dir="auto">{title}</h1>{intro && <p dir="auto">{intro}</p>}{actions && <div className="ten-spaced">{actions}</div>}</div>}
      {immersive && actions ? <div className="mb-4 flex justify-end">{actions}</div> : null}
      {children}
    </main>
    <footer className="ten-footer">THE TEN · Baghdad Nexus <span>{tr('Think carefully. Learn together. Reflect.', 'فكّر بتأنٍ. تعلّم مع الآخرين. وتأمّل.')}</span></footer>
  </div>
}
