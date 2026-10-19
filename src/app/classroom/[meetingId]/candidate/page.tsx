import { notFound } from 'next/navigation'
import { CandidateWorkbench } from '@/components/classroom/candidate-workbench'
import { getClassroomCandidateMeeting } from '@/lib/classroom/candidate'
import { getClassroomMeetingSummaries } from '@/lib/classroom/content'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'معاينة المنهج المرشح | THE TEN', robots: { index: false, follow: false } }
export default async function CandidatePreview({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params
  const meeting = await getClassroomCandidateMeeting(meetingId)
  const summary = getClassroomMeetingSummaries().find(item => item.id === meetingId)
  if (!summary) notFound()
  return <CandidateWorkbench summary={summary} staged={meeting} />
}
