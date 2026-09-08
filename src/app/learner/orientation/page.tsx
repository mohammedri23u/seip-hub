import Link from 'next/link'
import { requireUser } from '@/lib/auth/require-user'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { CharacterGuide } from '@/components/the-ten/character-guide'

export default async function OrientationPage() {
  await requireUser()
  return <LearnerShell title="Begin your Baghdad journey" intro="Four things to know before your first session.">
    <ol className="ten-orientation">{[
      ['Find your starting point', 'Begin with a baseline checkpoint when one is open. It helps establish where your learning starts.', '/learner/assessments', 'View checkpoints'],
      ['Gather for your sessions', 'Read the briefing and learning objectives. Your facilitator controls session availability and records attendance.', '/learner/sessions', 'Explore sessions'],
      ['Commit, discuss, reflect', 'Take time with your reasoning. Submit assessments when ready; submission locks the attempt. Released results appear in Progress.', '/learner/progress', 'Find your progress'],
      ['Know what completion means', 'Review attendance and submitted checkpoints separately. Certificate eligibility will appear when your program publishes its requirements.', '/learner/certificate', 'View completion status'],
    ].map(([title, copy, href, label], index) => <li className="ten-panel" key={title}><span className="ten-step-number">0{index + 1}</span><h2>{title}</h2><p>{copy}</p><Link className="ten-text-link" href={href}>{label} →</Link></li>)}</ol>
    <CharacterGuide character="ibn-sina" reaction="introduce" message="Make space for careful reasoning. Each session is another opportunity to learn with your peers." />
    <Link className="ten-action ten-spaced" href="/learner">Begin your journey →</Link>
  </LearnerShell>
}
