import Link from 'next/link'
import { requireUser } from '@/lib/auth/require-user'
import { LearnerShell } from '@/components/the-ten/learner-shell'
import { StatusBadge } from '@/components/the-ten/status-badge'

export default async function CertificatePage() {
  await requireUser()
  return <LearnerShell active="/learner/progress" title="Completion & certificate" intro="Understand what remains before your completion can be confirmed."><section className="ten-panel"><StatusBadge>Requirements awaiting publication</StatusBadge><h2>Eligibility is not available yet</h2><p>Your program has not published its certificate requirements in this experience. Ask your facilitator which attendance, session, and assessment requirements apply to you.</p><p>We will show an eligibility checklist and a certificate action when those records are available. No certificate has been unlocked here.</p><Link className="ten-action ten-spaced" href="/learner/progress">Review your recorded progress →</Link></section></LearnerShell>
}
