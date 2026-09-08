import { notFound } from 'next/navigation'
import { FacilitatorRoomIntelligence } from '@/components/the-ten/facilitator-room-intelligence'
import { LiveMission } from '@/components/the-ten/live-mission'
import { MissionVisualOverlay } from '@/components/the-ten/mission-visual-overlay'
import { getTenSnapshot } from '@/lib/the-ten/runtime'
import styles from './mission-world.module.css'

type InitialSnapshot = Record<string, unknown> & {
  manager?: boolean
  mission_id?: 'M01' | 'M02' | 'M03' | 'M04'
  phase?: 'waiting' | 'commit_open' | 'commit_locked' | 'discussion' | 'revote_open' | 'reveal' | 'transfer' | 'debrief' | 'completed'
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

  return <div className={styles.root} data-mission={snapshot.mission_id ?? 'unknown'}>
    <LiveMission initial={snapshot as never} />
    <MissionVisualOverlay missionId={snapshot.mission_id} phase={snapshot.phase} />
    {snapshot.manager && snapshot.phase ? <FacilitatorRoomIntelligence runId={runId} initialPhase={snapshot.phase} initialCloseoutSaved={Boolean(snapshot.closeout_saved)} /> : null}
  </div>
}
