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
  priority = false,
}: {
  character: TheTenCharacter
  reaction?: CharacterReaction
  message?: string
  priority?: boolean
}) {
  const src = getCharacterAsset(character, reaction)

  return (
    <aside className="flex items-end gap-3 rounded-[24px] border border-[#D8CCB6] bg-[#FFFDF8] p-4">
      {src && <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-[18px] bg-[#F0E5D1]">
        <Image
          src={src}
          alt={names[character]}
          fill
          priority={priority}
          sizes="96px"
          className="object-contain object-bottom"
        />
      </div>}
      <div className="min-w-0 pb-1">
        <p className="text-xs font-black tracking-[0.13em] text-[#1F6668]">{names[character]}</p>
        {message ? <p className="mt-1 text-sm leading-6 text-[#425F62]">{message}</p> : null}
      </div>
    </aside>
  )
}
