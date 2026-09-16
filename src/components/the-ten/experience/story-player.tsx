'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { brandAssets } from '@/lib/the-ten/assets'
import type { StoryDefinition } from '@/lib/the-ten/experience'
import { StoryScene, storyVisualSource } from './story-scene'

type StoryPlayerProps = {
  story: StoryDefinition
  initialSceneId?: string | null
  progressAction?: (storyId: string, sceneId: string, completed: boolean) => Promise<void>
  completionAction?: (formData: FormData) => Promise<void>
  onComplete?: () => void | Promise<void>
  onDismiss?: () => void
  replaying?: boolean
}

export function StoryPlayer({ story, initialSceneId, progressAction, completionAction, onComplete, onDismiss, replaying = false }: StoryPlayerProps) {
  const initialIndex = useMemo(() => Math.max(0, story.scenes.findIndex(scene => scene.id === initialSceneId)), [initialSceneId, story.scenes])
  const [index, setIndex] = useState(initialIndex)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const headingRef = useRef<HTMLDivElement>(null)
  const scene = story.scenes[index]
  const last = index === story.scenes.length - 1
  const canGoBack = index > 0 && scene.allowPrevious !== false

  useEffect(() => {
    if (!progressAction || replaying) return
    startTransition(() => { void progressAction(story.id, scene.id, false).catch(() => setSaveError('This position could not be saved. You can continue, but reload may return to the last recorded scene.')) })
  }, [progressAction, replaying, scene.id, story.id])

  useEffect(() => {
    headingRef.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
    const next = story.scenes[index + 1]
    if (!next) return
    const source = storyVisualSource(next)
    if (source) {
      const preload = new window.Image()
      preload.src = source
    }
  }, [index, story.scenes])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select, button, a')) return
      if ((event.key === 'ArrowRight' || event.key === 'Enter') && !last) { event.preventDefault(); go(index + 1, 'forward') }
      if (event.key === 'ArrowLeft' && canGoBack) { event.preventDefault(); go(index - 1, 'back') }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function go(nextIndex: number, nextDirection: 'forward' | 'back') {
    setDirection(nextDirection)
    setIndex(Math.max(0, Math.min(story.scenes.length - 1, nextIndex)))
  }

  async function finish() {
    try {
      if (progressAction && !replaying) await progressAction(story.id, scene.id, true)
      await onComplete?.()
    } catch {
      setSaveError('The Nexus could not record this transition. Try again; no academic response was affected.')
    }
  }

  return <main className="ten-story-player" data-direction={direction} data-story={story.id} aria-label={story.title}>
    <a href="#story-controls" className="ten-skip">Skip to story controls</a>
    <header className="ten-story-header">
      <div className="ten-story-lockup"><Image src={brandAssets.lockup} alt="THE TEN — Baghdad Nexus" fill sizes="(max-width: 480px) 124px, 160px" className="object-cover" priority /></div>
      <div className="ten-story-progress" aria-label={`Scene ${index + 1} of ${story.scenes.length}`}>{story.scenes.map((item, itemIndex) => <span key={item.id} data-state={itemIndex === index ? 'current' : itemIndex < index ? 'complete' : 'future'} />)}</div>
      {replaying && onDismiss ? <button type="button" onClick={onDismiss} className="ten-story-dismiss">Close replay</button> : <span className="ten-story-count">{index + 1}/{story.scenes.length}</span>}
    </header>

    <div key={scene.id} ref={headingRef} className="ten-story-scene-enter" aria-live="polite" aria-atomic="true"><StoryScene scene={scene} /></div>

    {saveError && <p role="alert" className="ten-story-save-error">{saveError}</p>}
    <footer id="story-controls" className="ten-story-controls">
      <button type="button" onClick={() => go(index - 1, 'back')} disabled={!canGoBack} className="ten-story-back">Previous</button>
      {!last ? <button type="button" onClick={() => go(index + 1, 'forward')} className="ten-story-next">{scene.ctaLabel ?? 'Continue'} <span aria-hidden="true">→</span></button>
        : completionAction ? <form action={completionAction}><input type="hidden" name="story_id" value={story.id} /><input type="hidden" name="scene_id" value={scene.id} /><button type="submit" className="ten-story-next">{scene.ctaLabel ?? 'Continue'} <span aria-hidden="true">→</span></button></form>
          : <button type="button" onClick={() => { startTransition(() => { void finish() }) }} disabled={pending} className="ten-story-next">{pending ? 'Recording…' : scene.ctaLabel ?? 'Continue'} <span aria-hidden="true">→</span></button>}
    </footer>
  </main>
}
