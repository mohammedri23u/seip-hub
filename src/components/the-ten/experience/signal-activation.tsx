'use client'

import Image from 'next/image'
import { useEffect, useState, useTransition } from 'react'
import { getCharacterAsset, getNexusStateAsset, storyAssets } from '@/lib/the-ten/assets'
import { experienceMotion, computeWorldState, getGuide, type GuideKey } from '@/lib/the-ten/experience'
import { SignalRegister } from './signal-register'
import { useI18n } from '@/components/i18n-provider'
import { LanguageSwitcher } from '@/components/language-switcher'

export function SignalActivation({ signalNumber, totalSignals = 10, guideKey, onContinue }: { signalNumber: number; totalSignals?: number; guideKey?: GuideKey | null; onContinue: () => void | Promise<void> }) {
  const { locale, tr } = useI18n()
  const [pending, startTransition] = useTransition()
  const [phase, setPhase] = useState<'path' | 'restored'>('path')
  const [error, setError] = useState<string | null>(null)
  const guide = getGuide(guideKey, locale)
  const portrait = guideKey ? getCharacterAsset(guideKey, 'celebrate') : null
  // Entry is gated by earned_run_ids in LiveMission. Animation never earns a Signal.
  const world = computeWorldState(signalNumber, 4, locale)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finish = () => setPhase('restored')
    if (preference.matches) finish()
    const timer = window.setTimeout(finish, experienceMotion.activation)
    preference.addEventListener('change', finish)
    return () => { window.clearTimeout(timer); preference.removeEventListener('change', finish) }
  }, [])

  async function continueJourney() {
    setError(null)
    try { await onContinue() } catch { setError(tr('Your Signal is already recorded. The epilogue could not be opened. Please try again.', 'إشارتك مسجّلة بالفعل، لكن تعذّر فتح الخاتمة. حاول مجدداً.')) }
  }

  return <main className="ten-signal-activation" data-experience="activation" data-phase={phase} aria-labelledby="signal-activation-title">
    <div className="ten-activation-environment" aria-hidden="true">
      <Image src={storyAssets.signalActivationBackground} alt="" fill preload sizes="(max-width: 720px) 900px, (max-width: 1100px) 1672px, 100vw" quality={90} className="object-cover" />
      <Image src={getNexusStateAsset(world.level)} alt="" fill sizes="(max-width: 720px) 900px, (max-width: 1100px) 1672px, 100vw" quality={90} className="ten-activation-destination object-cover" loading="eager" />
    </div>
    <svg className="ten-activation-path" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path pathLength="1" d="M500 700 V520 L350 410 L500 290 L650 410 L500 520"/><circle cx="500" cy="290" r="22"/></svg>
    <header><p className="ten-scene-label">{tr('FIRST ACTIVATION / A RECORDED CONNECTION', 'التفعيل الأول / رابط مسجّل')}</p><LanguageSwitcher /><p>{String(signalNumber).padStart(2,'0')} / {String(totalSignals).padStart(2,'0')}</p></header>
    <section className="ten-activation-copy">
      <p className="ten-scene-label">{world.name}</p><h1 id="signal-activation-title">{tr('The path holds.', 'المسار ثابت.')}</h1><p>{tr('A Signal is restored. One more connection now belongs to Baghdad.', 'تمت استعادة إشارة. أصبح رابطٌ آخر الآن جزءاً من بغداد.')}</p>
      <SignalRegister completed={signalNumber} reachable={4} total={totalSignals}/>
      {guide && <aside className="ten-activation-guide">{portrait && <span><Image src={portrait} alt="" fill sizes="110px" quality={90} className="object-contain object-bottom" /></span>}<blockquote>“{tr('Carry its way of thinking forward.', 'احمل طريقته في التفكير إلى الأمام.')}”<small>{guide.name} / {tr('Your Guide', 'مرشدك')}</small></blockquote></aside>}
      {error && <p role="alert" className="ten-activation-error">{error}</p>}
      <button type="button" className="ten-scene-action" disabled={pending} onClick={() => startTransition(async () => { await continueJourney() })}>{pending ? tr('Opening the epilogue…', 'جارٍ فتح الخاتمة…') : tr('Continue to the epilogue', 'متابعة إلى الخاتمة')} <span aria-hidden="true">→</span></button>
    </section>
  </main>
}
