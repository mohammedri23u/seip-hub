# Self-paced Pre/Post assessments — 2026-10-02

## Owner-requested change

Remove the compulsory five-minute time limit and reopen incomplete attempts closed by the timer. Keep the four-item micro forms, question versions, weights, rubrics, AB/BA allocation and all committed responses unchanged. Do not reopen fully submitted attempts.

## Applied database change

Migration `20261002100434_self_paced_micro_assessments_resume_timeouts.sql` is applied to the connected SEIP Hub database. The committed SQL MD5 matches the applied migration: `4e65f59598aae756ddfaf89d3be4758e`.

Both micro forms remain live with `duration_minutes = NULL`. Their metadata records `self-paced-1`, the change timestamp and the former 300-second policy. The protected getter reports no deadline or time limit. It uses `compact_assessment=true` and `micro_assessment=false` for self-paced delivery so older deployed clients fall back to the untimed progressive component instead of interpreting a null deadline as expired. The new UI accepts either compact flag.

The existing owner/session-checked expiration RPC returns false for a null-duration attempt. It is retained for already-open browser clients; it cannot close the self-paced attempt. The response guard explicitly applies deadline checks only when a deadline exists. The original attempt start time and identities stay immutable. Previously committed answers remain locked; only unanswered steps can be submitted.

Five incomplete timed-out attempts were reopened transactionally. Their ten already-committed responses and machine scores were verified unchanged using per-attempt hashes. Each retains its original attempt ID, assessment ID and start timestamp. Only status and submission timestamp were reset. Original expiration evidence was retained with `reopened_at` and a reason. Separate audit events record each reopening. Completed attempts, human grades, final decisions, allocation and research-consent settings were not modified. No administrator JWT identity was fabricated for this maintenance operation.

The gradebook distinguishes reopened attempts from expired or completed attempts. Recorded scores are retained in the database; the existing in-progress score-visibility rules remain unchanged until resubmission. Historical timed results and resumed/self-paced completions have distinct timing/audit evidence and should not be silently treated as identical testing conditions.

## Interface

The compact learner form has no countdown, automatic finalization effect, clock-based input disabling or deadline warning. It explains self-paced completion and allows returning to the journey. Arabic task hints and the VSAQ field remain. A reopened learner sees a resumption notice. Learners must still press Save to commit each answer; unsent text is not automatically saved.

Admin activation copy, assessment titles/descriptions and gradebook labels no longer promise a five-minute limit.

## Verification

- Typecheck and Next.js production build passed.
- Existing grading calculations: 15/15 passed.
- Existing completion-status tests: 12/12 passed.
- New real-React static rendering and status tests: 10/10 passed, using the installed Next SWC compiler. These include an old expired timestamp not disabling the question, no timer/finalizer, an available VSAQ, Arabic hints, and reopened state labels.
- Transactional database tests rejected submission of all five incomplete reopened attempts despite their historical expiry records; test updates were rolled back.
- Unauthenticated finalization was rejected. Anonymous fetch/submit EXECUTE remains false.
- Explicit pre/post gate checks passed for the five reopened learners.
- Live reads confirmed both forms are untimed and no incomplete expired attempt remains closed.

No authenticated learner browser submission or administrator grading was performed. No answers or grades were invented for testing. Deployment/primary-domain status is checked separately after publication.
