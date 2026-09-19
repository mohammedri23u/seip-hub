# Launch readiness review — 19 September 2026

Status: **NOT Pilot-Locked**. Engineering verification is substantial, but clinical, research and operational acceptance remain pending. This report does not constitute REC approval or authorization to recruit research participants.

## Delivered

- Optional, version-bound research consent with explicit acknowledgement, withdrawal, participant-information publication and real Ethics/governance controls.
- Independently approved, single-use research downloads with pseudonymisation and current-consent/exclusion checks. Current dataset scope is submitted human criterion ratings; comprehensive FCE/live/formative exports are not yet delivered.
- Independent immutable human ratings, protected reviewer rubric projections, blinded queue, disagreement detection and atomic human moderation. AI remains advisory.
- Optional FCE scheduling, two independent examiner assessments and moderation, with the existing 2 core / 2 reserve package.
- Facilitator activity sequencing, voting/revoting/reveal gates, attendance and fidelity records.
- Director session scheduling, facilitator assignment, assessment availability, AB/BA allocation locks, completion settings and release-evidence entry.
- Multiple active staff roles now resolve consistently. BA Arrival checks the assigned pre-form instead of assuming Form A.
- Reconciled 64 migration files against the applied database history; preserved the four Missions/Signals and existing content architecture. Fresh-database migration replay has not been verified.

## Evidence

| Verification | Result and limit |
| --- | --- |
| Database/RPC role and journey suite | 65/65 passed on 18 September; see `launch-database-qa-results.json` and `../scripts/qa/launch-database.sql` |
| Both learner journeys | AB and BA: orientation, all 15 pre tasks, Arrival/Guide, all four Missions/Signals, opposite post-form, feedback/attendance and certificate eligibility despite declining research |
| Security contracts | Six synthetic identities; wrong forms, out-of-order/replayed submissions, answer-key access, unauthorized scoring/export and premature reveal/finalization denied |
| Human assessment | Immutable independent ratings, disagreement block, atomic moderation, FCE second examiner and moderation verified |
| Test cleanup | Transaction rolled back; follow-up found zero synthetic accounts and zero test FCE encounters |
| Production build | Passed on 19 September with placeholder public Supabase configuration; this is not a production connectivity test |
| THE TEN integrity checks | Passed on 19 September |
| Foundation checks | Passed: all 79 public tables enable RLS; no service-role secrets/grants; protected answer keys; human final authority; server-only AI key |
| Browser verification | Cloud browser refused local server with `ERR_BLOCKED_BY_CLIENT`; authenticated role/mobile/accessibility E2E is not verified |
| Security advisor | Intentional RPC-only/RLS and SECURITY DEFINER findings require contextual review; leaked-password protection remains disabled. No blanket clean-security claim |

## Remaining release gates

| Category | Concrete outstanding work | Responsible role |
| --- | --- | --- |
| Technical QA | Exercise actual deployed UI with authenticated learner AB/BA, facilitator, reviewer, assessment lead and director; verify mobile, keyboard, reduced motion, error recovery, downloads and realtime reconnect | Engineering / QA |
| Research data | Validate the current ratings export and specify/implement any required FCE, live or formative datasets before those are promised in a research protocol | Research lead / engineering |
| SME | Review and record clinical content approval and curriculum mapping; English source cases were not clinically revalidated by these engineering tests | Clinical SME |
| Assessment validation | Record form equivalence/validation, rater calibration, double-rating sample target and selection rule | Assessment lead |
| REC and governance | Obtain actual Ethics decision; configure retention, contact and privacy URL; publish approved participant information | Principal investigator / director |
| Operational dry run | Schedule sessions, assign facilitators, run actual room/journey rehearsal, verify attendance/fidelity and record evidence | Programme operations |
| Security configuration | Review and enable leaked-password protection through the authorized Supabase settings workflow | Project administrator |

The last live readiness inspection returned education=false, research=false and pilot_locked=false. All six evidence gates were pending: SME, assessment validation, rater calibration, operational dry run, role QA and curriculum mapping. Ethics was pending and there was no published participant information. Do not mark any of these approved solely because automated engineering tests pass.

## Review locations

- `/programs/[programId]/pilot`: readiness and blockers.
- `/programs/[programId]/pilot/operations`: scheduling, allocation, completion, assessment publication and evidence.
- `/programs/[programId]/pilot/governance`: participant information, Ethics and approved export workflow.
- `/programs/[programId]/assessment/grading`: independent written-response review.
- `/programs/[programId]/pilot/fce`: optional performance assessment.
- `/sessions/[sessionId]/live`: supplemental live activity facilitation.

Repository delivery and deployment status should be checked against the final GitHub commit. A successful local build is not evidence of a successful hosted deployment.
