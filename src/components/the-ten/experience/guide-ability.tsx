'use client'

import Image from 'next/image'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCharacterAsset } from '@/lib/the-ten/assets'
import { getGuide, type GuideKey } from '@/lib/the-ten/experience'

export function GuideAbility({ guideKey, runId, previouslyUsed = false }: { guideKey: GuideKey; runId: string; previouslyUsed?: boolean }) {
  const guide = getGuide(guideKey)
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
  return <section className="ten-guide-ability" data-open={open || undefined} aria-labelledby="guide-ability-title">
    <div className="ten-guide-ability-summary">
      {portrait && <div><Image src={portrait} alt="" fill sizes="64px" className="object-cover object-top" /></div>}
      <span><small>{used ? 'GUIDE LENS RECORDED' : 'YOUR COMPANION IS NEAR'}</small><strong>{guide.name} · {guide.ability.name}</strong></span>
      <button type="button" onClick={open ? () => setOpen(false) : callGuide} disabled={busy} aria-expanded={open}>
        {busy ? 'Calling…' : open ? 'Return to mission' : used ? 'Review your Guide lens' : 'Call your Guide'}
      </button>
    </div>
    {error && <p role="alert" className="ten-guide-ability-error">{error}</p>}
    {open && <div className="ten-guide-workspace">
      <div><p className="ten-eyebrow">{guide.title} · {guide.ability.name}</p><h2 id="guide-ability-title">Change how you think, never what the answer is.</h2><p>{guide.ability.description} Use only information the facilitator has already revealed.</p></div>
      <div className="ten-guide-prompts">{guide.ability.prompts.map((prompt, index) => <label key={prompt}><span>{String(index + 1).padStart(2, '0')}</span>{prompt}<textarea value={notes[index] ?? ''} onChange={event => setNotes(current => ({ ...current, [index]: event.target.value }))} placeholder="Your private thinking…" aria-label={prompt} /></label>)}</div>
      <p className="ten-guide-privacy">Private, temporary workspace. These notes are not submitted and cannot change mission completion or scoring.</p>
    </div>}
  </section>
}
