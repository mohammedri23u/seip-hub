import Link from 'next/link'
import { requireClassroomTeacher } from '@/lib/classroom/access'
import { aiGradingConfigured } from '@/lib/ai/grading'
import { AIWorkbench } from '@/components/classroom/ai-workbench'
import styles from '@/components/classroom/workspace.module.css'

export const metadata = { title: 'THE TEN · مختبر AI' }
export default async function ClassroomAIPage() {
  await requireClassroomTeacher()
  return <main className={styles.page} dir="rtl" lang="ar"><div className={styles.container}>
    <header className={styles.header}><div><p className={styles.eyebrow}>THE TEN · SHADOW LAB</p><h1>دمج AI، خطوة بخطوة.</h1><p className={styles.intro}>تجربة Contract واحدة قبل تشغيل المسار البحثي المعتمد.</p></div><Link className={styles.secondary} href="/classroom">مساحة المعلم</Link></header>
    <AIWorkbench providerConfigured={aiGradingConfigured()} />
  </div></main>
}
