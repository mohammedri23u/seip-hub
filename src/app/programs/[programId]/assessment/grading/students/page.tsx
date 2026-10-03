import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { StudentDirectory } from '@/components/grading/student-directory'
import { requireProgramRole } from '@/lib/auth/require-program-role'
import type { LearnerRow } from '@/lib/assessment/grading-workspace'

export default async function GradingStudents({ params }: { params: Promise<{ programId: string }> }) {
 const { programId } = await params
 const { supabase } = await requireProgramRole(programId, ['program_director', 'assessment_lead'])
 const { data, error } = await supabase.rpc('ten_grading_workspace', { target_program_id: programId })
 if (error) throw new Error('Student grading workspace is temporarily unavailable.')
 return <AppShell title="الدرجات وتصحيح إجابات الطلبة" eyebrow="THE TEN · GRADING WORKSPACE" actions={<Link href={`/programs/${programId}/assessment/grading`} className="rounded-xl border bg-white px-4 py-2.5">قائمة الإجابات المستقلة</Link>}>
  <p dir="rtl" className="mb-6 text-sm leading-7 text-slate-600">اختَر اسم الطالب لعرض اختباراته وإجاباته، ثم صحّح كل إجابة وفق الـRubric. هذه الصفحة الاسمية مخصّصة للإدارة ومسؤولي التقييم؛ يبقى مسار المعلمين المستقل مقتصرًا على الإجابات المكلّفين بها.</p>
  <StudentDirectory programId={programId} learners={(data?.learners ?? []) as LearnerRow[]} />
 </AppShell>
}
