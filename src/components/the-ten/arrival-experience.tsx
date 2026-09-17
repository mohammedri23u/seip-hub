'use client'

import { StoryPlayer } from '@/components/the-ten/experience/story-player'
import { getArrivalStory } from '@/lib/the-ten/experience'
import { useI18n } from '@/components/i18n-provider'

type ArrivalExperienceProps = {
  completeAction: (formData: FormData) => Promise<void>
  progressAction: (storyId: string, sceneId: string, completed: boolean) => Promise<void>
  initialSceneId?: string | null
}

export function ArrivalExperience({ completeAction, progressAction, initialSceneId }: ArrivalExperienceProps) {
  const { locale } = useI18n()
  return <StoryPlayer story={getArrivalStory(locale)} initialSceneId={initialSceneId} progressAction={progressAction} completionAction={completeAction} />
}
