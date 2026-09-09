import type { WorldState } from '@/lib/the-ten/experience'

export function WorldAtmosphere({ state }: { state: WorldState }) {
  return <div className="ten-world-atmosphere" data-world-state={state.level} aria-hidden="true">
    <span className="ten-world-haze" />
    <span className="ten-world-nexus-pulse" />
    <span className="ten-world-gold-light" />
  </div>
}
