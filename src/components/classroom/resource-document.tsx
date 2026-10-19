import type { ReactNode } from 'react'
import Link from 'next/link'
import { ResourcePrintButton } from './resource-controls'
import styles from './resource-print.module.css'

export function ResourceDocument({ meetingId, title, subtitle, teacher = false, children }: {
  meetingId: string
  title: string
  subtitle: string
  teacher?: boolean
  children: ReactNode
}) {
  return (
    <main className={styles.document} dir="rtl" lang="ar">
      <header className={styles.header}>
        <p className={styles.kicker} dir="ltr">THE TEN — BAGHDAD NEXUS</p>
        <h1>{title}</h1>
        <p className={styles.subtitle} dir="ltr">{subtitle}</p>
        <p>{teacher ? 'نسخة المعلم — تتضمن الإجابات وملاحظات التيسير.' : 'ورقة الطالب — اكتب أو ناقش مع مجموعتك أثناء اللقاء.'}</p>
        <nav className={styles.toolbar} aria-label="أدوات المستند">
          <Link className={styles.button} href={teacher ? '/classroom' : '/learner/sessions'}>العودة إلى اللقاءات</Link>
          <ResourcePrintButton />
          {teacher && <a className={styles.button} href={'/classroom/' + meetingId + '/resources/presentation'}>تنزيل مخطط الشرائح RTF</a>}
        </nav>
      </header>
      {children}
    </main>
  )
}
