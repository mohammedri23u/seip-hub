import Image from 'next/image'
import { characterAssets, getCharacterAsset, storyAssets, worldAssets } from '@/lib/the-ten/assets'
import { storyMotionClasses, type StoryScene as StorySceneDefinition } from '@/lib/the-ten/experience'

export function storyVisualSource(scene: StorySceneDefinition) {
  if (scene.character) return getCharacterAsset(scene.character, scene.characterReaction ?? 'neutral')
  if (scene.visualKey === 'baghdad') return worldAssets.baghdadBlueHourNexusReveal
  if (scene.visualKey === 'nexus' || scene.visualKey === 'signals') return worldAssets.nexusState0Dormant
  if (scene.visualKey === 'seeker') return storyAssets.chroniclerDesk
  return null
}

export function StoryScene({ scene }: { scene: StorySceneDefinition }) {
  const centered = scene.layout === 'center'
  return <div className={`ten-story-composition ten-story-layout-${scene.layout ?? 'left'}`} data-atmosphere={scene.atmosphere ?? 'quiet'}>
    <StoryBackdrop scene={scene} />
    <div className={`ten-story-copy ${centered ? 'ten-story-copy-center' : ''}`}>
      {scene.eyebrow && <p className="ten-story-eyebrow">{scene.eyebrow}</p>}
      <h1 tabIndex={-1}>{scene.title}</h1>
      {scene.speaker && <p className="ten-story-speaker">{scene.speaker}</p>}
      {scene.dialogue && <blockquote>“{scene.dialogue}”</blockquote>}
      {scene.narration && <p className="ten-story-narration">{scene.narration}</p>}
      {scene.emphasis && <p className="ten-story-emphasis" aria-label={scene.emphasis}>{scene.emphasis}</p>}
    </div>
  </div>
}

function StoryBackdrop({ scene }: { scene: StorySceneDefinition }) {
  const motionClass = storyMotionClasses[scene.motion ?? 'still']

  if (scene.visualKey === 'guardians') {
    const characters = [
      ['ibn-sina', 'Ibn Sina'], ['al-razi', 'Al-Razi'], ['jabir', 'Jabir ibn Hayyan'], ['hippocrates', 'Hippocrates'],
    ] as const
    return <div className="ten-story-backdrop ten-story-guardians" aria-hidden="true">
      <Image src={storyAssets.guideSelectionHall} alt="" fill sizes="100vw" className="object-cover opacity-55" />
      <div className="ten-story-guardian-grid">{characters.map(([key, label], index) => {
        const source = characterAssets[key].introduce ?? characterAssets[key].neutral
        return <div key={key} className="ten-story-guardian" style={{ translate: `0 ${index % 2 ? 22 : 0}px` }}>
          {source && <Image src={source} alt={label} fill sizes="25vw" className="object-contain object-bottom" />}
        </div>
      })}</div>
    </div>
  }

  if (scene.character) {
    const source = getCharacterAsset(scene.character, scene.characterReaction ?? 'neutral')
    return <div className="ten-story-backdrop ten-story-character" aria-hidden="true">
      <Image src={worldAssets.nexusState0Dormant} alt="" fill sizes="100vw" className="object-cover opacity-35" />
      {source && <div className="ten-story-character-frame"><Image src={source} alt="" fill sizes="(max-width: 720px) 65vw, 38vw" className={`object-contain object-bottom ${motionClass}`} /></div>}
    </div>
  }

  if (scene.visualKey === 'baghdad') return <div className="ten-story-backdrop"><Image src={worldAssets.baghdadBlueHourNexusReveal} alt="" fill sizes="100vw" className={`object-cover ${motionClass}`} priority /></div>
  if (scene.visualKey === 'nexus') return <div className="ten-story-backdrop"><Image src={worldAssets.nexusState0Dormant} alt="" fill sizes="100vw" className={`object-cover ${motionClass}`} priority /></div>
  if (scene.visualKey === 'seeker') return <div className="ten-story-backdrop"><Image src={storyAssets.chroniclerDesk} alt="" fill sizes="100vw" className={`object-cover ${motionClass}`} /></div>
  if (scene.visualKey === 'signals') return <div className="ten-story-backdrop ten-story-signals"><Image src={worldAssets.nexusState0Dormant} alt="" fill sizes="100vw" className={`object-cover ${motionClass}`} /></div>
  if (scene.visualKey === 'dark') return <div className="ten-story-backdrop ten-story-fracture" aria-hidden="true"><Image src={worldAssets.nexusState0Dormant} alt="" fill sizes="100vw" className="object-cover opacity-30" /><div className={motionClass}><i /><i /><i /><i /></div></div>
  return <div className={`ten-story-backdrop ten-story-fracture ${motionClass}`} aria-hidden="true"><i /><i /><i /><i /></div>
}
