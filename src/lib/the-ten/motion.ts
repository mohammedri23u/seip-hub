import type { CSSProperties } from 'react'
import { theTenTokens } from './tokens'

export const motionTokens = theTenTokens.motion
export const motionStyles = Object.fromEntries(
  Object.entries(motionTokens).map(([name, milliseconds]) => [`--ten-${name}`, `${milliseconds}ms`]),
) as CSSProperties
