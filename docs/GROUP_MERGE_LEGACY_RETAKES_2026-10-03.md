# Teaching-group consolidation and legacy retakes — 2026-10-03

## Applied owner request

The four teaching groups were consolidated into two, using the existing membership assignments rather than inferring gender from student names. The female group has 14 learners and both existing female educators. The male group has 16 learners and all four existing male educators. Original group records and memberships were captured in the administrative audit before the two redundant group records were removed. The independent AB/BA allocation groups and their memberships were not changed.

Six learners had started or completed the original 15-item instrument. All six were assigned a fresh Pre-test and the corresponding Post-test on the current four-item self-paced instrument. These comprise three completed original attempts and three incomplete original attempts. Learners who already used the current instrument were not reset. Existing user accounts and credentials were not changed. No new assessment attempt was fabricated; each affected learner starts their assigned new test through their existing account.

## Preservation and current scoring

The six original attempts are archived using the existing invalidated state, explicitly annotated as superseded by instrument replacement rather than student misconduct. Original attempt IDs, start/submission timestamps, and all 50 previously committed legacy responses remain stored. The prior attempt statuses, immutable assessment pins and review-assignment state are retained in append-only reassignment records. Current assessment-pair resolution reads this new directive before the original preservation pin; no immutable pin or trigger was bypassed.

Pending review assignments for the retired instrument were cancelled, not deleted. The two original forms were closed to new entry after verifying that no active learner remained assigned to them. They do not count toward current Pre/Post completion or the current written-review queue. Historical responses and marks were not transferred into the new form. No human mark, final decision or answer was fabricated.

The maintenance transaction verified hashes of all student responses, machine scores, human reviews, criterion scores, final decisions, corrections, original pins and existing current-form attempts before and after the changes. Every protected hash matched. All 30 active learners have a four-item self-paced Pre/Post assignment. Every learner belongs to exactly one of the two teaching groups. Each affected learner's new Pre-test orientation gate is already satisfied.

## Interface

Affected learners see a clear Arabic retake notice on the learner home, checkpoints page and the new Pre-test entry page. Old test links explain the archive and direct the learner to the assigned new form. The named gradebook shows a retake-required badge and filter; historical attempts have an explicit archive label and do not contribute a zero or a completion credit. The notice clears when the new Pre-test is submitted. The compulsory timer remains absent; the four-item MCQ/VSAQ format and weights are unchanged.

## Schema and audit evidence

Applied schema migration: `20261003133605_group_merge_legacy_retake_support.sql`.
Migration MD5: `4e5fc8698d4b7b6cf930867eacb1d9f7`, verified against connected migration history.
The CLI-created development migration filename was reconciled to that returned remote version; remote history was not rewritten.

Data-operation audit identifier: `merge-teaching-groups-and-legacy-retakes-2026-10-03`.
The operation completed at 2026-10-03 13:37:34 UTC.
Audit event types: `cohort.restructure_complete` and `assessment.legacy_retake_assigned`.
These records identify administrative maintenance performed on the user's explicit request. No administrator or student JWT identity was forged.

The new directive table is private, RLS-enabled, append-only, and not directly readable or writable by anonymous or authenticated API roles. Internal notice/annotation helpers are SECURITY INVOKER with direct EXECUTE revoked. Existing public RPC session/role gates remain unchanged.

## Verification

- Typecheck: PASS.
- Next.js production build: PASS.
- Existing grading calculations/search: 15/15 PASS.
- Existing completion-status checks: 12/12 PASS.
- Self-paced rendering checks: 10/10 PASS.
- Retake notice, safe navigation and archive checks: 14/14 PASS.
- Migration content matches the applied migration.
- Live database reads verify membership, assignments, archived attempt annotations, preserved answer counts and no pending legacy review assignments.

These checks are not an authenticated learner-browser submission or a complete administrator-browser grading test. No student's answers were submitted for testing. Production deployment and primary-domain status must be verified separately after publication.

## Research handling

Historical-instrument, prior-exposure and repeat-attempt provenance is retained. The retake is not relabelled as an untouched baseline, and the historical and replacement scores must not be silently combined as interchangeable observations.
