import type { CSSProperties } from 'react'

const missionSystem = {
  M01: { index: 0, label: 'Neurology' },
  M02: { index: 1, label: 'Cardiovascular' },
  M03: { index: 2, label: 'Respiratory' },
  M04: { index: 3, label: 'Infectious disease' },
} as const

const decor = {
  lantern: { file: '/the-ten/art/decor-world-a.webp', index: 0 },
  astrolabe: { file: '/the-ten/art/decor-world-a.webp', index: 1 },
  palm: { file: '/the-ten/art/decor-world-a.webp', index: 2 },
  'baghdad-arch': { file: '/the-ten/art/decor-world-b.webp', index: 0 },
  waves: { file: '/the-ten/art/decor-world-b.webp', index: 1 },
  'geometric-star': { file: '/the-ten/art/decor-world-b.webp', index: 2 },
} as const

function spriteStyle(file: string, index: number, cells: number, size: number): CSSProperties {
  return {
    width: size,
    height: size,
    display: 'inline-block',
    flex: '0 0 auto',
    backgroundImage: `url(${file})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${size * cells}px ${size}px`,
    backgroundPosition: `${-index * size}px 0`,
  }
}

export function MissionSystemIcon({ missionId, size = 56, className = '', label }: { missionId: string; size?: number; className?: string; label?: string }) {
  const system = missionSystem[missionId as keyof typeof missionSystem]
  if (!system) return null
  const accessibleLabel = label ?? system.label
  return <span className={className} style={spriteStyle('/the-ten/art/mission-systems.webp', system.index, 5, size)} role="img" aria-label={accessibleLabel} />
}

export function DecorSprite({ name, size = 72, className = '' }: { name: keyof typeof decor; size?: number; className?: string }) {
  const item = decor[name]
  return <span aria-hidden="true" className={className} style={spriteStyle(item.file, item.index, 3, size)} />
}
