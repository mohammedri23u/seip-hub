import Image from 'next/image'
import { getCharacterAsset, type TheTenCharacter } from '@/lib/the-ten/assets'
import type { CharacterReaction } from '@/lib/the-ten/tokens'

const names: Record<TheTenCharacter, string> = {
  'ibn-sina': 'Ibn Sina',
  jabir: 'Jabir ibn Hayyan',
  hippocrates: 'Hippocrates',
  'al-razi': 'Al-Razi',
}

export function CharacterGuide({
  character,
  reaction = 'neutral',
  message,
}: {
  character: TheTenCharacter
  reaction?: CharacterReaction
  message?: string
}) {
  const src = getCharacterAsset(character, reaction)

  return (
    <aside className="ten-character-guide">
      {src && <div className="ten-character-portrait">
        <Image
          src={src}
          alt=""
          fill
          sizes="(max-width: 520px) 104px, 144px"
          loading="lazy"
          className="object-cover object-center"
        />
      </div>}
      <div className="ten-character-copy">
        <p>{names[character]}</p>
        {message ? <blockquote>{message}</blockquote> : null}
      </div>
    </aside>
  )
}
