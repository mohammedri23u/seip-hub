import { notFound } from 'next/navigation'
import { FacilitatorRoomIntelligence } from '@/components/the-ten/facilitator-room-intelligence'
import { LiveMission } from '@/components/the-ten/live-mission'
import { MissionReasoningTool } from '@/components/the-ten/mission-reasoning-tool'
import { MissionScratchpad } from '@/components/the-ten/mission-scratchpad'
import { MissionVisualOverlay } from '@/components/the-ten/mission-visual-overlay'
import { getTenSnapshot } from '@/lib/the-ten/runtime'
import styles from './mission-world.module.css'

type MissionPhase = 'waiting' | 'commit_open' | 'commit_locked' | 'discussion' | 'revote_open' | 'reveal' | 'transfer' | 'debrief' | 'completed'
type MissionId = 'M01' | 'M02' | 'M03' | 'M04'

type InitialSnapshot = Record<string, unknown> & {
  id?: string
  manager?: boolean
  mission_id?: MissionId
  stage_index?: number
  phase?: MissionPhase
  closeout_saved?: boolean
}

export default async function LearnerMissionPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  let snapshot: InitialSnapshot
  try {
    snapshot = await getTenSnapshot(runId) as InitialSnapshot
  } catch {
    notFound()
  }

  const reasoningToolInitial = !snapshot.manager && snapshot.mission_id && snapshot.phase && typeof snapshot.stage_index === 'number'
    ? { id: snapshot.id ?? runId, mission_id: snapshot.mission_id, stage_index: snapshot.stage_index, phase: snapshot.phase, manager: false }
    : null

  return <div className={styles.root} data-mission={snapshot.mission_id ?? 'unknown'}>
    <LiveMission initial={snapshot as never} />
    <MissionVisualOverlay missionId={snapshot.mission_id} phase={snapshot.phase} />
    {reasoningToolInitial ? <MissionReasoningTool initial={reasoningToolInitial} /> : null}
    {reasoningToolInitial ? <MissionScratchpad initial={reasoningToolInitial} /> : null}
    {snapshot.manager && snapshot.phase ? <FacilitatorRoomIntelligence runId={runId} initialPhase={snapshot.phase} initialCloseoutSaved={Boolean(snapshot.closeout_saved)} /> : null}
  </div>
}
