'use client'

import { StoryPlayer } from '@/components/the-ten/experience/story-player'
import { arrivalStory } from '@/lib/the-ten/experience'

type ArrivalExperienceProps = {
  completeAction: (formData: FormData) => Promise<void>
  progressAction: (storyId: string, sceneId: string, completed: boolean) => Promise<void>
  initialSceneId?: string | null
}

export function ArrivalExperience({ completeAction, progressAction, initialSceneId }: ArrivalExperienceProps) {
  return <StoryPlayer story={arrivalStory} initialSceneId={initialSceneId} progressAction={progressAction} completionAction={completeAction} />
}
