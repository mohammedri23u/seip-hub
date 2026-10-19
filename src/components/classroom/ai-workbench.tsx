'use client'

import { useState } from 'react'
import { SHADOW_CONTRACT_VERSION, syntheticShadowInput, syntheticShadowOutput, validateShadowOutput } from '@/lib/ai/shadow-contract'
import styles from './ai-workbench.module.css'

function downloadJSON(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click()
  URL.revokeObjectURL(url)
}

export function AIWorkbench({ providerConfigured }: { providerConfigured: boolean }) {
  const [output, setOutput] = useState('')
  const [result, setResult] = useState<ReturnType<typeof validateShadowOutput> | null>(null)
  function validate() {
    try { setResult(validateShadowOutput(JSON.parse(output), syntheticShadowInput)) }
    catch { setResult({ valid: false, errors: ['JSON غير صالح. راجع علامات الاقتباس والفواصل.'] }) }
  }
  return <div className={styles.workbench}>
    <section className={styles.banner} aria-labelledby="ai-mode"><div><span className={styles.tag}>SYNTHETIC REHEARSAL</span><h2 id="ai-mode">مختبر تجريبي على إجابة افتراضية</h2><p>افحص تنسيق الإدخال والمخرج محليًا. هذه الصفحة لا ترسل طلبًا إلى AI، ولا تحفظ درجات أو تغيّر نتائج الطلاب.</p></div><dl><dt>حالة إعداد المزود على الخادم</dt><dd>{providerConfigured ? 'مهيّأ · البحث يحتاج بوابات موافقة مستقلة' : 'غير مفعّل · التدريب متاح'}</dd><dt>نسخة Contract</dt><dd dir="ltr">{SHADOW_CONTRACT_VERSION}</dd></dl></section>
    <ol className={styles.steps}><li><b>01</b><strong>جهّز</strong><span>Question وRubric وإجابة Coded</span></li><li><b>02</b><strong>افحص</strong><span>Score وEvidence وReview flags</span></li><li><b>03</b><strong>راجع</strong><span>اقتراح مستقل ومراجعة بشرية</span></li></ol>
    <div className={styles.columns}>
      <section className={styles.card} aria-labelledby="input-heading"><p className={styles.kicker}>01 · INPUT</p><h2 id="input-heading">مثال جاهز للتجربة</h2><p className={styles.note}>المثال عن عملية التعلّم؛ جميع بياناته اصطناعية.</p><div className={styles.response} dir="ltr" lang="en"><strong>{syntheticShadowInput.question}</strong><p>{syntheticShadowInput.student_response}</p></div><dl className={styles.rubric}>{[0, 1, 2].map(score => <div key={score}><dt dir="ltr">{score} / 2</dt><dd dir="ltr">{syntheticShadowInput[`rubric_${score}` as 'rubric_0' | 'rubric_1' | 'rubric_2']}</dd></div>)}</dl><button type="button" onClick={() => downloadJSON('THE_TEN_Synthetic_AI_Input.json', syntheticShadowInput)}>تنزيل Input التجريبي</button><details><summary>عرض JSON</summary><pre dir="ltr">{JSON.stringify(syntheticShadowInput, null, 2)}</pre></details></section>
      <section className={styles.card} aria-labelledby="output-heading"><p className={styles.kicker}>02 · VALIDATE</p><h2 id="output-heading">اختبر المخرج</h2><p className={styles.note}>حمّل المثال المكتوب مسبقًا، ثم جرّب تغيير الدرجة إلى 3 أو كتابة Evidence غير موجود لترى كيف يُرفض.</p><button type="button" className={styles.secondary} onClick={() => { setOutput(JSON.stringify(syntheticShadowOutput, null, 2)); setResult(null) }}>تحميل مخرج افتراضي مكتوب مسبقًا</button><label className={styles.label} htmlFor="shadow-json">JSON output · لا تدخل بيانات طالب هنا</label><textarea id="shadow-json" dir="ltr" rows={14} maxLength={20000} spellCheck={false} value={output} onChange={event => { setOutput(event.target.value); setResult(null) }} placeholder={'{ "response_id": "SYNTHETIC-DEMO-001", ... }'} /><button type="button" disabled={!output.trim()} onClick={validate}>فحص المخرج</button>
        <div aria-live="polite">{result && (result.valid ? <div className={styles.valid}><strong>اجتاز فحص البنية والمطابقة</strong><p>هذه ليست مصادقة على صحة التقييم. Proposed score: {result.value.proposed_score ?? 'Abstain'}؛ يحتاج Feedback إلى مراجعة بشرية.</p><p>{result.value.draft_feedback}</p><button type="button" className={styles.secondary} onClick={() => downloadJSON('THE_TEN_Synthetic_Shadow_Result.json', { contract_version: SHADOW_CONTRACT_VERSION, synthetic: true, human_approved: false, output: result.value })}>تنزيل نتيجة الفحص التجريبية</button></div> : <div className={styles.invalid}><strong>مرفوض · يحتاج مراجعة</strong><ul>{result.errors.map(error => <li key={error}>{error}</li>)}</ul><p>المخرج غير الصالح لا يتحول إلى درجة صفر.</p></div>)}</div>
      </section>
    </div>
    <section className={styles.card}><p className={styles.kicker}>03 · RESEARCH HANDOFF</p><h2>مسار البحث الحقيقي</h2><p>تُستخدم أدوات الحزمة البحثية لإعداد Coded export بعد تسجيل REC وConsent وAI route وReference freeze وفحص إزالة المعرفات. يبقى مرجع R1/R2 مستقلًا ومخفيًا عن AI حتى تجميده.</p><div className={styles.gates}><span>Consent منفصل</span><span>Reference freeze</span><span>فحص المطابقة</span><span>Human signoff</span></div><p className={styles.note}>Human score وReference score وAI proposed score حقول منفصلة. عرض AI في Phase B يحتاج توزيعًا وموافقة مستقلين؛ التهيئة التقنية وحدها لا تفعّل البحث.</p></section>
  </div>
}
