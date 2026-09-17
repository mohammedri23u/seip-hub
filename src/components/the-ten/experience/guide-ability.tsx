'use client'

import Image from 'next/image'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCharacterAsset } from '@/lib/the-ten/assets'
import { getGuide, type GuideKey } from '@/lib/the-ten/experience'
import { useI18n } from '@/components/i18n-provider'

export function GuideAbility({ guideKey, runId, previouslyUsed = false }: { guideKey: GuideKey; runId: string; previouslyUsed?: boolean }) {
  const { locale, tr } = useI18n()
  const guide = getGuide(guideKey, locale)
  const [open, setOpen] = useState(false)
  const [used, setUsed] = useState(previouslyUsed)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})
  if (!guide) return null

  async function callGuide() {
    if (!used) {
      setBusy(true)
      setError(null)
      const supabase = createClient()
      const { error: rpcError } = await supabase.rpc('ten_experience_command', { operation: 'use_guide', payload: { run_id: runId }, target_cohort_id: null })
      setBusy(false)
      if (rpcError) { setError(rpcError.message); return }
      setUsed(true)
    }
    setOpen(true)
  }

  const portrait = getCharacterAsset(guideKey, open ? 'guide' : 'neutral')
  return <section className="ten-guide-ability" data-open={open || undefined} aria-label={tr(`Your personal Guide, ${guide.name}`, `مرشدك الشخصي، ${guide.name}`)}>
    <div className="ten-guide-ability-summary">
      {portrait && <div><Image src={portrait} alt="" fill sizes="64px" className="object-contain object-bottom" /></div>}
      <span><small>{used ? tr('GUIDE LENS RECORDED', 'تم تسجيل عدسة المرشد') : tr('YOUR COMPANION IS NEAR', 'مرشدك قريب')}</small><strong>{guide.name} · {guide.ability.name}</strong></span>
      <button type="button" onClick={open ? () => setOpen(false) : callGuide} disabled={busy} aria-expanded={open} aria-controls="personal-guide-workspace">
        {busy ? tr('Calling…', 'جارٍ الاستدعاء…') : open ? tr('Return to mission', 'العودة إلى المهمة') : used ? tr('Review your Guide lens', 'مراجعة عدسة مرشدك') : tr('Call your Guide', 'استدعِ مرشدك')}
      </button>
    </div>
    {error && <p role="alert" className="ten-guide-ability-error">{error}</p>}
    {open && <div className="ten-guide-workspace" id="personal-guide-workspace">
      <div><p className="ten-eyebrow">{guide.title} · {guide.ability.name}</p><h2 id="guide-ability-title">{tr('Change how you think, never what the answer is.', 'غيّر طريقة تفكيرك، لا الإجابة أبداً.')}</h2><p>{guide.ability.description} {tr('Use only information the facilitator has already revealed.', 'استخدم فقط المعلومات التي كشفها الميسّر بالفعل.')}</p></div>
      <div className="ten-guide-prompts">{guide.ability.prompts.map((prompt, index) => <label key={prompt}><span>{String(index + 1).padStart(2, '0')}</span>{prompt}<textarea value={notes[index] ?? ''} onChange={event => setNotes(current => ({ ...current, [index]: event.target.value }))} placeholder={tr('Your private thinking…', 'تفكيرك الخاص…')} aria-label={prompt} /></label>)}</div>
      <p className="ten-guide-privacy">{tr('Private, temporary workspace. These notes are not submitted and cannot change mission completion or scoring.', 'مساحة عمل خاصة ومؤقتة. لا تُرسل هذه الملاحظات ولا يمكنها تغيير إكمال المهمة أو تقييمها.')}</p>
    </div>}
  </section>
}
