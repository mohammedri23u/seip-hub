export type WorldStateLevel = 0 | 1 | 2 | 3 | 4
export type WorldState = { level: WorldStateLevel; name: string; description: string; pathLayers: number; nexusActive: boolean; activationComplete: boolean }

const worldStates: Record<WorldStateLevel, Omit<WorldState, 'level'>> = {
  0: { name: 'Nexus dormant', description: 'The revealed pathways are silent.', pathLayers: 0, nexusActive: false, activationComplete: false },
  1: { name: 'First Signal active', description: 'One route now carries Nexus energy.', pathLayers: 1, nexusActive: true, activationComplete: false },
  2: { name: 'Pathways awakening', description: 'A second layer now connects the city.', pathLayers: 2, nexusActive: true, activationComplete: false },
  3: { name: 'Nexus responding', description: 'The restored routes are beginning to move together.', pathLayers: 3, nexusActive: true, activationComplete: false },
  4: { name: 'First Activation', description: 'All four reachable Signals are active.', pathLayers: 4, nexusActive: true, activationComplete: true },
}

export function computeWorldState(completedSignals: number, reachableSignals = 4): WorldState {
  const safeCompleted = Math.max(0, Math.min(completedSignals, reachableSignals))
  const normalized = reachableSignals <= 0 ? 0 : Math.round((safeCompleted / reachableSignals) * 4)
  const level = Math.max(0, Math.min(4, normalized)) as WorldStateLevel
  return { level, ...worldStates[level] }
}
