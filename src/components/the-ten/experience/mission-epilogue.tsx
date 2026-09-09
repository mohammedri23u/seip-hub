'use client'

import { StoryPlayer } from './story-player'
import type { StoryDefinition } from '@/lib/the-ten/experience'

export function MissionEpilogue({ story, initialSceneId, onProgress, onComplete, replaying, onDismiss }: { story: StoryDefinition; initialSceneId?: string | null; onProgress: (storyId: string, sceneId: string, completed: boolean) => Promise<void>; onComplete: () => void | Promise<void>; replaying?: boolean; onDismiss?: () => void }) {
  return <StoryPlayer story={story} initialSceneId={initialSceneId} progressAction={onProgress} onComplete={onComplete} replaying={replaying} onDismiss={onDismiss} />
}
