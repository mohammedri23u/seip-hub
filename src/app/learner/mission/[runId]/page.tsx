import { notFound } from 'next/navigation'
import { LiveMission } from '@/components/the-ten/live-mission'
import { getTenSnapshot } from '@/lib/the-ten/runtime'

export default async function LearnerMissionPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  let snapshot: Record<string, unknown>
  try {
    snapshot = await getTenSnapshot(runId)
  } catch {
    notFound()
  }
  return <LiveMission initial={snapshot as never} />
}
