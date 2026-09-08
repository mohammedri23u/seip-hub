import { notFound } from 'next/navigation'
import { FacilitatorRoomIntelligence } from '@/components/the-ten/facilitator-room-intelligence'
import { LiveMission } from '@/components/the-ten/live-mission'
import { getTenSnapshot } from '@/lib/the-ten/runtime'

type InitialSnapshot = Record<string, unknown> & {
  manager?: boolean
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

  return <>
    <LiveMission initial={snapshot as never} />
    {snapshot.manager && snapshot.phase ? <FacilitatorRoomIntelligence runId={runId} initialPhase={snapshot.phase} initialCloseoutSaved={Boolean(snapshot.closeout_saved)} /> : null}
  </>
}
