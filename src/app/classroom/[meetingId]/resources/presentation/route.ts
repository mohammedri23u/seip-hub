import { getClassroomMeeting } from '@/lib/classroom/content'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const privateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  Vary: 'Cookie',
  'X-Content-Type-Options': 'nosniff',
}

function escapeRtf(text: string): string {
  let result = ''
  // RTF Unicode uses signed 16-bit code units, including surrogate pairs.
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index)
    const character = text[index]
    if (character === '\\' || character === '{' || character === '}') result += '\\' + character
    else if (character === '\n') result += '\\line '
    else if (code >= 32 && code <= 126) result += character
    else result += '\\u' + (code > 32767 ? code - 65536 : code) + '?'
  }
  return result
}

function paragraph(text: string, level: 0 | 1): string {
  const direction = /[\u0600-\u06ff]/.test(text) ? '\\rtlpar\\qr ' : '\\ltrpar\\ql '
  return '\\pard\\plain\\s' + (level + 1) + '\\outlinelevel' + level + direction + escapeRtf(text) + '\\par\n'
}

export async function GET(_request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params
  const meeting = await getClassroomMeeting(meetingId)
  if (!meeting) return new Response('Not found', { status: 404, headers: privateHeaders })

  const header = '{\\rtf1\\ansi\\deff0\\uc1\\deflang1025\n' +
    '{\\fonttbl{\\f0 Arial;}}\n' +
    '{\\stylesheet{\\s1\\f0\\fs36\\b\\outlinelevel0 Heading 1;}{\\s2\\f0\\fs24\\outlinelevel1 Heading 2;}}\n'
  const body = meeting.slides.map(slide => paragraph(slide.title, 0) + slide.body.map(line => paragraph(line, 1)).join('')).join('\n')
  return new Response(header + body + '}', {
    headers: {
      ...privateHeaders,
      'Content-Type': 'application/rtf; charset=us-ascii',
      'Content-Disposition': 'attachment; filename="THE_TEN_' + meeting.id + '_outline.rtf"',
    },
  })
}
