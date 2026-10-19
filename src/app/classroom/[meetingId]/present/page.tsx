import { notFound } from 'next/navigation'
import { SessionStage } from '@/components/classroom/session-stage'
import { getClassroomMeeting } from '@/lib/classroom/content'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = {
  title: 'عرض القاعة | THE TEN',
  robots: { index: false, follow: false },
}

export default async function ClassroomPresentation({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params
  // The getter authorizes the teacher before reading protected formative content.
  // Secure assessment items and research data are never part of this contract.
  const meeting = await getClassroomMeeting(meetingId)
  if (!meeting) notFound()
  return <SessionStage meeting={meeting} />
}
