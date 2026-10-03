import Image from 'next/image'
import { characterAssets, getCharacterAsset, getNexusStateAsset, storyAssets, worldAssets } from '@/lib/the-ten/assets'
import { storyMotionClasses, type StoryScene as StorySceneDefinition } from '@/lib/the-ten/experience'
import { SignalRegister } from './signal-register'

export function storyVisualSource(scene: StorySceneDefinition) {
  if (scene.visualKey === 'quiet') return null
  if (scene.visualKey === 'city') return worldAssets.baghdadHero
  if (scene.visualKey === 'baghdad') return worldAssets.baghdadBlueHourNexusReveal
  if (scene.visualKey === 'seeker') return storyAssets.chroniclerDesk
  if (scene.visualKey === 'guardians') return storyAssets.guideSelectionHall
  return getNexusStateAsset(scene.nexusLevel ?? 0)
}

export function StoryScene({ scene }: { scene: StorySceneDefinition }) {
  const source = storyVisualSource(scene)
  const character = scene.character ? getCharacterAsset(scene.character, scene.characterReaction ?? 'neutral') : null
  return <section className={`ten-story-composition ten-story-layout-${scene.layout ?? 'left'}`} data-visual={scene.visualKey} data-atmosphere={scene.atmosphere ?? 'quiet'} aria-labelledby="story-title">
    <div className="ten-story-backdrop" aria-hidden="true">{source && <Image key={source} src={source} alt="" fill sizes="(max-width: 1100px) 1672px, 100vw" quality={90} className={`object-cover ${storyMotionClasses[scene.motion ?? 'still']}`} preload />}</div>
    <div className="ten-story-scrim" aria-hidden="true" />
    {scene.visualKey === 'guardians' && <div className="ten-story-guardian-assembly" aria-hidden="true">{Object.entries(characterAssets).map(([key,poses])=><div key={key}>{poses.introduce && <Image src={poses.introduce} alt="" fill sizes="(max-width: 720px) 24vw, 210px" quality={90} className="object-contain object-bottom" />}</div>)}</div>}
    {character && <div className="ten-story-character-frame" aria-hidden="true"><Image src={character} alt="" fill sizes="(max-width: 720px) 210px, 32vw" quality={90} className="object-contain object-bottom"/></div>}
    <div className="ten-story-copy">
      {scene.eyebrow && <p className="ten-scene-label">{scene.eyebrow}</p>}
      <h1 tabIndex={-1} id="story-title">{scene.title}</h1>
      {scene.speaker && <p className="ten-story-speaker">{scene.speaker}</p>}
      {scene.dialogue && <blockquote>“{scene.dialogue}”</blockquote>}
      {scene.narration && <p className="ten-story-narration">{scene.narration}</p>}
      {scene.emphasis && <SignalRegister completed={0} reachable={scene.id === 'ten' ? 10 : scene.id === 'fracture' ? 0 : 4} />}
    </div>
  </section>
}
