import type { Metadata } from 'next'
import { ClassroomOverview } from '@/components/classroom/learner-overview'
import { LearnerShell } from '@/components/the-ten/learner-shell'

export const metadata: Metadata = {
  title: 'THE TEN — اللقاءات الحضورية',
  description: 'خمسة لقاءات حضورية مبسطة لتعلّم Clinical Reasoning بالنقاش والعمل الجماعي، يقودها المعلم باستخدام PowerPoint.',
}

export default function HomePage() {
  return <LearnerShell publicView immersive lang="ar" title="نتعلّم التفكير السريري، معًا." intro="برنامج حضوري مبسّط؛ يعرض المعلم الحالة، ويفكّر الطلبة ويناقشونها خطوة بخطوة.">
    <ClassroomOverview publicView />
  </LearnerShell>
}
