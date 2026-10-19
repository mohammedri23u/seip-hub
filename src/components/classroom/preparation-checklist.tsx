'use client'

import { useEffect, useState } from 'react'
import styles from './preparation-checklist.module.css'

const preparation = ['راجعت دليل المعلم والمصطلحات المطلوبة', 'فتحت العرض وجرّبت الخط والصوت والصور', 'جهّزت أوراق الطلاب وExit tickets', 'حدّدت أدوار المجموعة وطريقة مشاركة الجميع', 'جهّزت خطة الورق عند انقطاع الاتصال']

export function PreparationChecklist({ meetingId }: { meetingId: string }) {
  const [checked, setChecked] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const storageKey = `the-ten:prep:v1:${meetingId}`
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
      setChecked(Array.isArray(saved) ? saved.filter((item): item is string => typeof item === 'string' && preparation.includes(item)) : [])
    } catch { setStorageAvailable(false) }
    setReady(true)
  }, [storageKey])
  function update(item: string, selected: boolean) {
    const next = selected ? [...checked, item] : checked.filter(value => value !== item)
    setChecked(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { setStorageAvailable(false) }
  }
  return <section className={styles.card} aria-labelledby="prep-heading">
    <div className={styles.heading}><div><p>BEFORE THE ROOM OPENS</p><h2 id="prep-heading">خمس خطوات، وتبدأ بثقة.</h2></div><span aria-live="polite">{checked.length} / {preparation.length} جاهز</span></div>
    <div className={styles.progress} role="progressbar" aria-label="تجهيز اللقاء على هذا الجهاز" aria-valuenow={checked.length} aria-valuemin={0} aria-valuemax={preparation.length}><span style={{ width: `${checked.length / preparation.length * 100}%` }} /></div>
    <fieldset disabled={!ready}><legend className="sr-only">قائمة تجهيز اللقاء</legend>{preparation.map(item => <label key={item}><input type="checkbox" checked={checked.includes(item)} onChange={event => update(item, event.target.checked)} /><span>{item}</span></label>)}</fieldset>
    <p className={styles.note}>{storageAvailable ? 'قائمة شخصية محفوظة على هذا الجهاز؛ لا تغيّر حالة اللقاء أو الحضور.' : 'القائمة تعمل مؤقتًا؛ تعذّر حفظها على هذا الجهاز.'}</p>
  </section>
}
