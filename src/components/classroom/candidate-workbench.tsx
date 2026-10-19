'use client'
import { useState } from 'react'
import Link from 'next/link'
import { importCandidateMeeting } from '@/lib/classroom/candidate-import'
import type { ClassroomMeeting, ClassroomMeetingSummary } from '@/lib/classroom/types'
import { SessionStage } from './session-stage'
import styles from './workspace.module.css'

export function CandidateWorkbench({ summary, staged }: { summary: ClassroomMeetingSummary; staged?: ClassroomMeeting }) {
  const [local, setLocal] = useState<ClassroomMeeting | null>(null)
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const meeting = local ?? staged
  async function selectFile(file?: File) {
    setError(''); if (!file) return
    if (file.size > 1024 * 1024) { setError('حجم الملف أكبر من 1 MB. اختر ملف session_content.json من الحزمة.'); return }
    setReading(true)
    try { setLocal(importCandidateMeeting(JSON.parse(await file.text()), summary)) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذّر قراءة الملف.'); setLocal(null) }
    finally { setReading(false) }
  }
  return <div lang="ar" dir="rtl"><section className={styles.page} style={{ minHeight: 'auto', paddingBottom: 24 }}><div className={styles.container}><p className={styles.eyebrow}>THE TEN · PROTECTED TEACHER PREVIEW</p><h1 className={styles.sectionTitle}>المنهج المرشح v2.2 · اللقاء {summary.number}</h1><p className={styles.intro}>ارفع session_content.json من الحزمة لتشغيل الشرائح الأربع والعشرين لهذا اللقاء على جهازك. الملف يُقرأ داخل المتصفح؛ لا يُرسل إلى خادم ولا يغيّر المادة المعتمدة.</p><p>اعتماد المشرف السريري بالاسم ما زال مطلوبًا قبل تقديم النسخة المرشحة للطلاب.</p><div className={styles.actions}><label className={styles.secondary}>اختيار حزمة التدريس <input type="file" accept=".json,application/json" disabled={reading} onChange={event => { void selectFile(event.target.files?.[0]) }} aria-label="اختيار session_content.json" style={{ maxWidth: 240, marginInlineStart: 12 }} /></label>{local && <button className={styles.secondary} type="button" onClick={() => setLocal(null)}>إغلاق النسخة المحلية</button>}<Link className={styles.textLink} href="/classroom">مساحة المعلم</Link></div><p role="status" className={styles.muted}>{reading ? 'جارٍ فحص الملف…' : local ? 'حزمة محلية مفحوصة البنية · لا توجد مصادقة سريرية تلقائية.' : staged ? 'تتوفر نسخة مرشحة في المصدر المحمي.' : 'لم يتأكد استيراد الحزمة إلى المصدر المحمي. يمكنك معاينتها محليًا من الملف.'}</p>{error && <p role="alert" className={styles.error}>{error}</p>}</div></section>{meeting && <SessionStage key={local ? 'local' : 'staged'} meeting={meeting} />}</div>
}
