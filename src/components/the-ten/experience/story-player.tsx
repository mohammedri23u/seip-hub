'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { StoryDefinition } from '@/lib/the-ten/experience'
import { StoryScene } from './story-scene'
import { PendingButton } from './pending-button'

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
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveQueue = useRef<Promise<void>>(Promise.resolve())
  const [exiting, setExiting] = useState(false)
  const scene = story.scenes[index]
  const last = index === story.scenes.length - 1
  const canGoBack = index > 0 && scene.allowPrevious !== false

  useEffect(() => {
    if (!progressAction || replaying) return
    saveQueue.current = saveQueue.current.then(() => progressAction(story.id, scene.id, false)).catch(() => setSaveError('This position could not be saved. You can continue, but reload may return to the last recorded scene.'))
  }, [progressAction, replaying, scene.id, story.id])

  useEffect(() => {
    headingRef.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
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

  useEffect(() => () => { if (transitionTimer.current) clearTimeout(transitionTimer.current) }, [])

  function go(nextIndex: number, nextDirection: 'forward' | 'back') {
    if (exiting) return
    setDirection(nextDirection)
    const enter = () => { setIndex(Math.max(0, Math.min(story.scenes.length - 1, nextIndex))); setExiting(false) }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { enter(); return }
    setExiting(true)
    transitionTimer.current = setTimeout(enter, 120)
  }

  async function finish() {
    try {
      await saveQueue.current
      if (progressAction && !replaying) await progressAction(story.id, scene.id, true)
      await onComplete?.()
    } catch {
      setSaveError('The Nexus could not record this transition. Try again; no academic response was affected.')
    }
  }

  return <main className="ten-story-player" data-experience="story" data-transition={exiting ? 'exit' : 'enter'} data-direction={direction} data-story={story.id} aria-label={story.title}>
    <a href="#story-controls" className="ten-skip">Skip to story controls</a>
    <header className="ten-story-header">
      <p className="ten-story-wordmark">THE TEN <span>BAGHDAD NEXUS</span></p>
      <div className="ten-story-progress" role="img" aria-label={`Scene ${index + 1} of ${story.scenes.length}`}>{story.scenes.map((item, itemIndex) => <span key={item.id} data-state={itemIndex === index ? 'current' : itemIndex < index ? 'complete' : 'future'} />)}</div>
      {replaying && onDismiss ? <button type="button" onClick={onDismiss} className="ten-story-dismiss">Close replay</button> : <span className="ten-story-count">{index + 1}/{story.scenes.length}</span>}
    </header>

    <div key={scene.id} ref={headingRef} className="ten-story-scene-enter"><StoryScene scene={scene} /></div>

    {saveError && <p role="alert" className="ten-story-save-error">{saveError}</p>}
    <footer id="story-controls" className="ten-story-controls">
      <button type="button" onClick={() => go(index - 1, 'back')} disabled={!canGoBack || exiting} className="ten-story-back">Previous</button>
      {!last ? <button type="button" onClick={() => go(index + 1, 'forward')} disabled={exiting} className="ten-story-next">{scene.ctaLabel ?? 'Continue'} <span aria-hidden="true">→</span></button>
        : completionAction ? <form action={async (formData) => { await saveQueue.current; await completionAction(formData) }}><input type="hidden" name="story_id" value={story.id} /><input type="hidden" name="scene_id" value={scene.id} /><PendingButton className="ten-story-next">{scene.ctaLabel ?? 'Continue'} <span aria-hidden="true">→</span></PendingButton></form>
          : <button type="button" onClick={() => { startTransition(async () => { await finish() }) }} disabled={pending} className="ten-story-next">{pending ? 'Recording…' : scene.ctaLabel ?? 'Continue'} <span aria-hidden="true">→</span></button>}
    </footer>
  </main>
}
