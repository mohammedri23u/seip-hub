'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClassroomMeeting, ClassroomSlide } from '@/lib/classroom/types'
import { getCharacterAsset, worldAssets, type TheTenCharacter } from '@/lib/the-ten/assets'
import styles from './session-stage.module.css'

// These are the approved worked-answer/discussion slides in the first meeting.
// Later meetings use the explicit semantic suffixes from slidesFor(). Never infer
// disclosure from option text, which also appears on unanswered questions.
const FIRST_MEETING_REVEALS = new Set(['S01-05', 'S01-07', 'S01-09', 'S01-11', 'S01-15', 'S01-17'])
const GUIDES: TheTenCharacter[] = ['ibn-sina', 'hippocrates', 'al-razi', 'jabir', 'ibn-sina']
const CHECKS = ['جُهّزت أوراق الطالب', 'راجعت أهداف اللقاء والمصطلحات', 'راجعت مصادر الحالات وSafety', 'جُهّز Exit ticket وإغلاق اللقاء']

function isRevealSlide(slide: ClassroomSlide) {
  return slide.kind === 'PI_reveal' || slide.kind === 'DU_reveal' || FIRST_MEETING_REVEALS.has(slide.id) || /-(feedback|reasoning)$/.test(slide.id)
}

function paragraphDirection(line: string): 'rtl' | 'ltr' {
  return /^[^A-Za-z\u0600-\u06ff]*[\u0600-\u06ff]/.test(line) ? 'rtl' : 'ltr'
}

/** Only mount with a meeting fetched by getClassroomMeeting on a protected route. */
export function SessionStage({ meeting }: { meeting: ClassroomMeeting }) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [paused, setPaused] = useState(false)
  const [audience, setAudience] = useState(true)
  const [notesOpen, setNotesOpen] = useState(false)
  const [largeType, setLargeType] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [notice, setNotice] = useState('')
  const [checks, setChecks] = useState<boolean[]>(CHECKS.map(() => false))
  const rootRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const slide = meeting.slides[index]
  const total = meeting.slides.length
  const gated = slide ? isRevealSlide(slide) : false
  const isOpening = index === 0
  const canShowNotes = !audience && !fullscreen
  const notesCase = meeting.cases.find(item => slide?.id.startsWith(item.id))
  const guide = GUIDES[meeting.number - 1] ?? 'ibn-sina'
  const guideArt = getCharacterAsset(guide, 'neutral')

  const goTo = useCallback((nextIndex: number) => {
    setIndex(Math.max(0, Math.min(total - 1, nextIndex)))
    setRevealed(false)
    setPaused(false)
    setNotice('')
  }, [total])

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [index, paused])

  useEffect(() => {
    const onFullscreen = () => {
      const active = Boolean(document.fullscreenElement)
      setFullscreen(active)
      if (active) {
        setAudience(true)
        setNotesOpen(false)
      }
    }
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => document.removeEventListener('fullscreenchange', onFullscreen)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null
      if (event.altKey || event.ctrlKey || event.metaKey || element?.closest('input, textarea, select, [contenteditable="true"]')) return
      const nativeSpace = event.key === ' ' && element?.closest('button, a, summary')
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || (event.key === ' ' && !nativeSpace)) {
        event.preventDefault()
        goTo(index + 1)
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault()
        goTo(index - 1)
      } else if (event.key.toLowerCase() === 'b') {
        event.preventDefault()
        setPaused(value => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo, index])

  async function toggleFullscreen() {
    setAudience(true)
    setNotesOpen(false)
    setNotice('')
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (rootRef.current?.requestFullscreen) await rootRef.current.requestFullscreen()
      else setNotice('يمكنك استعمال وضع ملء الشاشة في المتصفح لعرض القاعة.')
    } catch {
      setNotice('تعذّر فتح ملء الشاشة. يمكنك المتابعة بهذا العرض أو استعمال ملء الشاشة في المتصفح.')
    }
  }

  if (!slide) return <main className={styles.empty} lang="ar" dir="rtl"><h1>لا توجد شرائح لهذا اللقاء.</h1><Link href="/classroom">العودة للقاءات</Link></main>

  return (
    <main ref={rootRef} className={`${styles.root} ${largeType ? styles.largeType : ''}`} lang="ar" dir="rtl">
      <header className={styles.topbar}>
        <div className={styles.identity}><span className={styles.brand} lang="en" dir="ltr">THE TEN</span><span>اللقاء {meeting.number}</span><span className={styles.mission}>{meeting.missionCodes.join(' / ')}</span></div>
        <nav className={styles.utilities} aria-label="إعدادات العرض">
          <button type="button" aria-pressed={largeType} onClick={() => setLargeType(value => !value)}>تكبير النص</button>
          <button type="button" onClick={toggleFullscreen}>{fullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}</button>
          {!fullscreen && <button type="button" aria-pressed={!audience} onClick={() => { setAudience(value => !value); setNotesOpen(false) }}>{audience ? 'إعداد المعلم' : 'عرض القاعة'}</button>}
          {!fullscreen && <Link href="/classroom">اللقاءات</Link>}
        </nav>
      </header>
      {meeting.reviewStatus && <p className={styles.consoleWarning}>نسخة مرشحة {meeting.edition} · للمراجعة العلمية بواسطة المعلم. اعتماد المشرف السريري بالاسم ما زال مطلوبًا قبل التدريس للطلاب.</p>}

      <div className={styles.layout}>
        <section className={`${styles.stage} ${isOpening && !paused ? styles.opening : ''}`} aria-labelledby="stage-heading">
          {isOpening && !paused && <div className={styles.worldArt} aria-hidden="true"><Image src={worldAssets.wisdomClassroom} alt="" fill sizes="(max-width: 760px) 100vw, 45vw" priority /></div>}
          <div key={`${slide.id}-${paused}`} className={styles.slideContent}>
            <p className={styles.kicker}>{paused ? 'وقفة للنقاش' : gated ? 'نقاش وFeedback' : isOpening ? 'THE TEN — BAGHDAD NEXUS' : meeting.titleAr}</p>
            <h1 id="stage-heading" ref={headingRef} tabIndex={-1} dir="auto">{paused ? 'خذوا وقتكم في التفكير.' : gated && !revealed ? 'قبل أن نكشف التفسير…' : slide.title}</h1>
            {paused ? <div className={styles.pauseBody}><p>ما الدليل الذي اعتمدت عليه؟<br />ناقش الفكرة مع زميلك، ثم شارك السبب.</p><button type="button" className={styles.primaryButton} onClick={() => setPaused(false)}>متابعة العرض</button></div> : gated && !revealed ? <div className={styles.revealGate}><p>ثبّت إجابتك أولاً، ثم قارن سبب اختيارك مع زميلك.</p><p className={styles.gateHint}>يفتح المعلم التفسير عندما ينتهي النقاش.</p><button type="button" className={styles.primaryButton} onClick={() => setRevealed(true)}>كشف التفسير للقاعة</button></div> : <div className={styles.body}>
              {slide.body.map((line, lineIndex) => <p key={`${slide.id}-${lineIndex}`} dir={paragraphDirection(line)}>{line}</p>)}
              {gated && <button type="button" className={styles.hideAnswer} onClick={() => setRevealed(false)}>إخفاء التفسير</button>}
            </div>}
            {isOpening && !paused && <p className={styles.openingNote}>نقرأ معاً. نفكّر فردياً. نناقش السبب.</p>}
          </div>
          {!isOpening && !paused && guideArt && <div className={styles.guide} aria-hidden="true"><Image src={guideArt} alt="" width={160} height={220} sizes="100px" /></div>}
        </section>

        {canShowNotes && <aside className={styles.console} aria-labelledby="console-heading">
          <p className={styles.consoleWarning}>لوحة المعلم — انتقل إلى «عرض القاعة» قبل الإسقاط.</p>
          <h2 id="console-heading">إدارة الإيقاع</h2>
          <label className={styles.selectLabel} htmlFor="stage-select">الانتقال إلى شريحة</label>
          <select id="stage-select" value={index} onChange={event => goTo(Number(event.target.value))}>
            {meeting.slides.map((item, slideIndex) => <option key={item.id} value={slideIndex}>{slideIndex + 1}. {item.title}</option>)}
          </select>
          <p className={styles.consoleHint}>المدة المخططة {meeting.durationMinutes} دقيقة. غيّر الإيقاع حسب فهم المجموعة؛ لا يوجد مؤقّت إلزامي.</p>
          <button type="button" className={styles.notesButton} aria-expanded={notesOpen} aria-controls="speaker-notes" onClick={() => setNotesOpen(value => !value)}>{notesOpen ? 'إغلاق ملاحظات المعلم' : 'فتح ملاحظات المعلم'}</button>
          {notesOpen && <div id="speaker-notes" className={styles.notes}>
            {slide.notes && <><h3>توجيه هذه الشريحة</h3><p>{slide.notes}</p></>}
            <h3>أهداف اللقاء</h3><ul>{meeting.learnerGoals.map(goal => <li key={goal}>{goal}</li>)}</ul>
            {(notesCase ? [notesCase] : meeting.cases).map(item => <details key={item.id}><summary><bdi>{item.id} · {item.title}</bdi></summary><p>{item.goal}</p><h4>توجيه النقاش</h4><p>{item.guidedKey}</p><h4>Safety</h4><p>{item.safety}</p><h4>Extension اختياري</h4><p>{item.extension}</p></details>)}
          </div>}
          <fieldset className={styles.checklist}><legend>قائمة التجهيز</legend>{CHECKS.map((label, checkIndex) => <label key={label}><input type="checkbox" checked={checks[checkIndex]} onChange={event => setChecks(previous => previous.map((value, itemIndex) => itemIndex === checkIndex ? event.target.checked : value))} />{label}</label>)}</fieldset>
          <p className={styles.deviceOnly}>اختيارات العرض والقائمة مؤقتة في هذه الصفحة فقط؛ لا تُسجّل حضوراً أو درجات أو إكمالاً.</p>
          <div className={styles.resourceLinks}>{meeting.edition ? <Link href={`/classroom/${meeting.id}/candidate/guide`}>دليل مراجعة النسخة المرشحة</Link> : <><Link href={`/classroom/${meeting.id}/resources/worksheet`}>ورقة الطالب والطباعة</Link><Link href={`/classroom/${meeting.id}/resources/guide`}>دليل المعلم</Link><a href={`/classroom/${meeting.id}/resources/presentation`}>مخطط PowerPoint (RTF)</a></>}</div>
        </aside>}
      </div>

      <footer className={styles.controls}>
        <div className={styles.navigation}>
          <button type="button" disabled={index === 0} onClick={() => goTo(index - 1)}>السابق</button>
          <p className={styles.position} role="status" aria-live="polite" aria-atomic="true"><b>{index + 1}</b><span> / {total}</span><span className={styles.srOnly}> · {slide.title}</span></p>
          <button type="button" className={styles.nextButton} disabled={index === total - 1} onClick={() => goTo(index + 1)}>التالي</button>
        </div>
        <div className={styles.progress} role="progressbar" aria-label="موضع العرض، وليس تقدم الطالب" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1}><span style={{ width: `${((index + 1) / total) * 100}%` }} /></div>
        <div className={styles.secondaryControls}><button type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'متابعة' : 'وقفة للنقاش'}</button><p>→ / Page Down التالي · ← / Page Up السابق · B وقفة</p></div>
      </footer>
      {notice && <p role="status" className={styles.notice}>{notice}</p>}
      <p className={styles.printNote}>هذه طباعة الشريحة الحالية فقط. أوراق الطالب ودليل المعلم متاحان ضمن موارد اللقاء.</p>
    </main>
  )
}
