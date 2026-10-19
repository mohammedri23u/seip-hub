'use client'

import Image from 'next/image'
import { useId, useState, useSyncExternalStore } from 'react'
import { classroomMissionMap } from '@/lib/classroom/journey-map'
import { getNexusStateAsset, worldAssets } from '@/lib/the-ten/assets'
import styles from './nexus-explorer.module.css'

const STYLE_STORAGE_KEY = 'the-ten.classroom.presentation.v1'
const STYLE_EVENT = 'the-ten:classroom-presentation'
const presentationStyles = [
  { id: 'calm', name: 'هادئ', description: 'الخطة والفكرة الأساسية، مع رسومات أقل.' },
  { id: 'story', name: 'قصصي', description: 'بغداد وNexus ومعاينة تفعيل Signals.' },
  { id: 'team', name: 'جماعي', description: 'القصة مع أسئلة نقاش اختيارية للمجموعة.' },
] as const
type PresentationStyle = typeof presentationStyles[number]['id']
let memoryStyle: PresentationStyle = 'story'

function isPresentationStyle(value: string | null): value is PresentationStyle {
  return presentationStyles.some(style => style.id === value)
}

function styleSnapshot(): PresentationStyle {
  try {
    const saved = window.localStorage.getItem(STYLE_STORAGE_KEY)
    return isPresentationStyle(saved) ? saved : memoryStyle
  } catch { return memoryStyle }
}

function subscribeStyle(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(STYLE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(STYLE_EVENT, onChange)
  }
}

function setPresentationStyle(style: PresentationStyle) {
  memoryStyle = style
  try { window.localStorage.setItem(STYLE_STORAGE_KEY, style) } catch { /* Preferences remain available for this visit. */ }
  window.dispatchEvent(new Event(STYLE_EVENT))
}

/** This explorer previews artwork only. It never reads or writes official learner progress. */
export function NexusExplorer() {
  const [selected, setSelected] = useState(0)
  const [activationPreview, setActivationPreview] = useState(false)
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const presentation = useSyncExternalStore(subscribeStyle, styleSnapshot, () => 'story' as PresentationStyle)
  const panelId = useId()
  const mission = classroomMissionMap[selected]
  const level = mission.signal - (activationPreview ? 0 : 1)
  const artwork = getNexusStateAsset(level)
  const calm = presentation === 'calm'

  function selectMission(index: number) {
    setSelected(index)
    setActivationPreview(false)
  }

  return <section className={styles.explorer} data-presentation={presentation} aria-labelledby="nexus-explorer-heading" lang="ar" dir="rtl" id="nexus-explorer">
    <div className={styles.heading}>
      <div><p className={styles.eyebrow}>أربع Missions · حكاية واحدة</p><h2 id="nexus-explorer-heading">عُد إلى قلب بغداد.</h2><p>استكشف طريق القصة، واختر كيف تحب أن تراها.</p></div>
      <span className={styles.previewBadge}>استكشاف اختياري · لا يسجّل تقدمك</span>
    </div>

    <fieldset className={styles.stylePicker}>
      <legend>أسلوب العرض</legend>
      <div className={styles.styleOptions}>{presentationStyles.map(style => <label key={style.id} className={styles.styleOption}>
        <input type="radio" name={`${panelId}-presentation`} value={style.id} checked={presentation === style.id} onChange={() => setPresentationStyle(style.id)} />
        <span><strong>{style.name}</strong><small>{style.description}</small></span>
      </label>)}</div>
      <p>اختيارك للعرض على هذا الجهاز فقط؛ لا يغيّر التقييم أو متطلبات الإكمال.</p>
    </fieldset>

    <div className={styles.missionChoices} role="group" aria-label="اختر Mission لاستكشاف قصتها">
      {classroomMissionMap.map((item, index) => <button key={item.code} type="button" className={styles.missionChoice} aria-pressed={selected === index} aria-controls={panelId} onClick={() => selectMission(index)}>
        <span className={styles.choiceCode} dir="ltr">{item.code}</span>
        <span className={styles.choiceSystem} lang="en" dir="ltr">{item.system}</span>
        <span className={styles.choiceWeek} dir="ltr">{item.weeks}</span>
        <span className={styles.choiceIndicator} aria-hidden="true">{selected === index ? '−' : '+'}</span>
      </button>)}
    </div>

    <div className={styles.missionStage} id={panelId}>
      {!calm ? <figure className={styles.stageArt}>
        <Image key={artwork} src={failedImage === artwork ? worldAssets.nexus : artwork} alt={activationPreview ? `معاينة قصصية لشكل Nexus بعد تفعيل Signal ${mission.signal}، وليست تقدمًا مسجلًا` : `معاينة قصصية لشكل Nexus قبل تفعيل Signal ${mission.signal}`} fill sizes="(max-width: 760px) 100vw, 58vw" className={styles.stageImage} onError={() => setFailedImage(artwork)} />
        <div className={styles.artTopline}><span dir="ltr">BAGHDAD NEXUS</span><span>معاينة القصة</span></div>
        <figcaption className={styles.artCaption}><span dir="ltr">SIGNAL 0{mission.signal}</span><strong>{activationPreview ? 'هذه صورة التفعيل في القصة' : 'الدليل يجمعنا… والمفتاح يعيدنا'}</strong><span>المشهد المعروض لا يمثل حالة حسابك.</span></figcaption>
      </figure> : null}
      <div className={styles.missionCopy}>
        <p className={styles.missionMeta} dir="ltr">{mission.code} <span> / </span> {mission.sessions} <span> / </span> {mission.encounters.length} ENCOUNTERS</p>
        <h3>{mission.title}</h3>
        <p className={styles.story}>{mission.story}</p>
        <div className={styles.learningTask}><span>مهمتك في القاعة</span><p>{mission.task}</p></div>
        <div className={styles.encounters} aria-label="الحالات التي تتضمنها Mission">{mission.encounters.map(encounter => <span key={encounter} dir="ltr">{encounter}</span>)}</div>
        <p className={styles.activationRule}>{mission.activation}</p>
        {presentation === 'team' ? <aside className={styles.teamPrompt}><strong>جرّبوها معًا</strong><p>كل شخص يذكر معلومة لاحظها، ثم تختار المجموعة سؤالًا واحدًا وتشرح لماذا يستحق أن يُسأل. شاركوا الفكرة دون مقارنة سرعة الإجابات.</p></aside> : null}
        {!calm ? <div className={styles.previewControl}>
          <p>{mission.next}</p>
          <button type="button" className={styles.activateButton} onClick={() => setActivationPreview(value => !value)} aria-pressed={activationPreview}>
            <span>{activationPreview ? 'إعادة المشهد قبل التفعيل' : `عاين تفعيل Signal ${mission.signal}`}</span><span aria-hidden="true">{activationPreview ? '↶' : '←'}</span>
          </button>
          <p className={styles.previewStatus} role="status">{activationPreview ? `تُعرض الآن معاينة Signal ${mission.signal}. لم يُمنح مفتاح ولم يُسجّل إكمال.` : 'هذا الزر يبدّل الرسم للمعاينة فقط. تفعيل البرنامج الفعلي له مساره الخاص.'}</p>
        </div> : <p className={styles.calmNote}>الرسومات مخففة في الأسلوب الهادئ. معلومات اللقاء وخطواته كاملة أمامك.</p>}
      </div>
    </div>
    <div className={styles.signalLegend} aria-label="خريطة التفعيل ضمن الخطة">
      <p><strong>المفتاح يأتي بعد اكتمال Mission.</strong><span>أربع إشارات، دون نقاط للسرعة أو ترتيب علني للطلبة.</span></p>
      <ol>{classroomMissionMap.map(item => <li key={item.code}><span className={styles.signalNode} aria-hidden="true" /><span dir="ltr">{item.code}</span><small dir="ltr">{item.signal === 1 ? 'AFTER S2' : `AFTER S${item.signal + 1}`}</small></li>)}</ol>
    </div>
  </section>
}
