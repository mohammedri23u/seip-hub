# THE TEN — BAGHDAD NEXUS Implementation Status

Updated: 2026-09-09
Branch: `codex/the-ten-interaction-system`
PR: #3 — Draft, open, not merged

## Safety / preservation

- `main` remains unchanged by this implementation.
- Safety ref remains untouched: `safety/main-before-the-ten-interaction-system-2026-09-08` / `7f41c60a9efdee77be5fe874d0d14a6da5f4a210`.
- No stash apply/pop/drop, hard reset or merge is part of this work.
- Learner progression, grading and certificate state remain server/database authoritative; page visits cannot fabricate completion.

## Final learner journey implemented

Primary journey:

`Sign in → Orientation → Entry Baseline → Baghdad World → M01 → M02 → M03 → M04 → My Codex / Nexus Echo → Exit Transfer Check → Final Feedback → Completion Certificate`

Primary learner navigation is now only:
- Baghdad
- My Codex
- Completion

The learner home is world-first/immersive rather than dashboard-first. Once the Entry Baseline is submitted, the visible page heading is removed and Baghdad itself leads the experience while the accessible document title remains available to assistive technology.

No Zoom/meeting/video integration exists. The website is a mobile-first reasoning controller used alongside whatever teaching environment the facilitator chooses.

## Canonical mission content

Source of truth: Drive package `THE_TEN_FIRST_ACTIVATION_CONTENT_v1.0`, including `website_content_v1.json`.

Published mission content:
- M01 — SEE THE PATTERN · Ibn Sina · 6 stages
- M02 — QUESTION THE EVIDENCE · Al-Razi · 6 stages
- M03 — TEST THE HYPOTHESIS · Jabir ibn Hayyan · 6 stages
- M04 — TREAT THE PATIENT · Hippocrates · 7 stages

The runtime preserves the supplied sequence, options, keys, expected reasoning, mentor lenses, error tags, transfer cases, references and Nexus Echo items. Full interaction parity is documented in `THE_TEN_CONTENT_FIDELITY_AUDIT.md`.

## Assessment Architecture v2

The original source bank remains intact:
- canonical `TEN-CR-01` through `TEN-CR-12`
- same source stems/options/keys/rationales
- positions 1–12 in both Entry and Exit

A documented evidence-informed extension now adds four brief constructed-response mini-cases to each checkpoint. These new written items are not represented as canonical Drive-bank content.

Current Entry and Exit structure:
- 12 single-best-answer items × 1 mark
- 4 brief constructed-response mini-cases × 4 marks
- 16 items
- 28 marks
- 30 minutes
- Entry/Exit use parallel written cases rather than identical stems

Ten active `TEN-LO-*` Clinical Reasoning Learning Objectives now cover:
- Problem Representation
- Differential Diagnosis / Red Flags
- Evidence Interpretation
- Diagnostic Updating / Bias
- Pretest Probability
- Investigation Strategy
- Management / Patient Safety
- Reassessment
- Confidence Calibration
- Transfer

They are mapped to prepared M01–M04 sessions, all canonical SBA items, all new written items, and both Entry/Exit blueprints.

Four approved analytic rubric families are linked to the written questions:
- `TEN-RUB-REP` — Representation & Prioritization
- `TEN-RUB-EVID` — Evidence Interpretation & Updating
- `TEN-RUB-TEST` — Probability & Test Strategy
- `TEN-RUB-SAFE` — Management, Safety & Reassessment

Each rubric has four criteria and a 4-point total. Written responses use independent human rubric review. Optional AI grading can generate a criterion-level proposal, but it remains advisory; human review/moderation remains authoritative.

The existing result pipeline can aggregate finalized scores through the objective mappings into `learner_objective_results`, enabling released Entry/Exit performance by reasoning objective. These results remain formative educational signals and are not competence diagnoses.

Full design, mappings and evidence boundary: `docs/THE_TEN_ASSESSMENT_ARCHITECTURE.md`.

## Baghdad / visual product layer

Production assets include:
- approved THE TEN — BAGHDAD NEXUS lockup and crest
- approved Baghdad artwork
- approved Nexus artwork
- approved neutral portraits for all four First Activation mentors
- approved-source medical-system sprite atlas
- approved-source Baghdad decorative sprite atlases

World/interaction surfaces use those assets directly:
- illustrated Baghdad Signal map with central Nexus
- four mentor Signal locations and live/waiting/completed states
- mission medical iconography
- Baghdad decorative details
- illustrated live-mission atmosphere
- visual My Codex Signal records
- Nexus-based Entry/Exit assessment gates
- Nexus-based Completion/certificate pathway
- illustrated Facilitator Control Room

Reference screenshots are not shipped as raster UI.

The only remaining art dependency is the identity-locked reaction-pose pack. Typed reaction states already exist and fall back safely to each approved neutral portrait.

## Live Mission Engine

Learner route: `/learner/mission/[runId]`
Facilitator route: `/facilitator/the-ten`

Authoritative state flow:

`Waiting → Commit Open → Commit Locked → Discussion → Revote Open → Reveal → Next`

Discussion/Revote are present only on canonical Peer Instruction stages. Non-peer stages move directly from locked commit to Reveal.

After the final stage:

`Transfer → Debrief → Completed`

Supported recorded interactions:
- single choice
- true/false
- multiselect
- free text
- Problem Representation + differential categories
- Evidence Map
- diagnosis + confidence
- differential + probability
- team commit
- transfer response

Additional canonical activity fidelity exists as supplemental, unscored reasoning tools:
- M02 Framing Challenge scratchpad
- M03 PERC Rule Builder
- M03 two-level PE Wells score builder
- M03 accessible Sequence Reconstruction
- M04 Parallel Priorities organizer

These tools use only already-released clues, do not read answer keys, and cannot grant progress themselves. Persisted canonical mission responses remain authoritative.

## Realtime / facilitator operation

Four prepared 90-minute sessions exist with join codes `TEN-M01` through `TEN-M04`.

Creating a room marks its prepared session live through the database trigger. Normal facilitator operation is:

`Make session live → Commit → Lock → Discussion/Revote when canonical → Reveal → Next → Transfer → Debrief → Complete`

The facilitator sees:
- connected/responded counts
- initial and revote distributions
- initial/revote confidence distributions and mean confidence
- changed-answer count / percentage
- expected reasoning
- mentor lens
- common errors
- completion-ready/incomplete counts
- fidelity closeout

Realtime broadcasts drive learner state; polling remains a resilience fallback. Supplemental reasoning tools use the isolated `ten-tool:<runId>` realtime channel so they do not interfere with the primary mission room subscription.

## Completion integrity

Mission Signal / My Codex credit requires, at database level:
- one initial response for every required stage
- every required Peer Instruction revote
- the transfer response
- room phase `completed`

The `ten_codex` trigger calls the same strict completion helper, so direct/inadvertent inserts cannot bypass this rule.

Transactional database rehearsals were run for all four missions and rolled back after verification:
- complete response set → completion ready = true
- any required revote missing → false
- any required stage missing → false
- transfer missing → false

This prevents passive attendees from receiving Signal credit simply because the facilitator completed the room.

## Content leakage / assessment integrity

Learner snapshot projection was verified:
- pre-Reveal: no answer key, expected reasoning or facilitator stage cue
- Reveal: permitted answer/feedback/expected reasoning only
- facilitator-only stage ID remains excluded from learner payload

Formal assessment delivery excludes correctness fields and explanations. The current learner assessment component supports the new short-answer items as text responses without exposing linked rubrics/reference answers.

Written-response AI grading is optional/advisory. The human-review screen is intentionally independent and is not prefilled from AI; AI comparison becomes available only after independent human review. Moderation can be triggered by material AI–human disagreement. Final written grading remains human-governed.

## My Codex / Nexus Echo

My Codex is a visual Signal record, not a progress-score dashboard. Each valid mission completion records the transferable reasoning principle, reflection and completion time.

Nexus Echo uses the canonical 60-hour unlocks. The answer anchor remains hidden until the learner first submits a retrieval response.

## Certificate pathway

Completion requires persisted records for:
- orientation
- Entry Baseline
- M01–M04 completion
- Exit Transfer Check
- configured attendance requirement
- final feedback when required

Certificate issuance creates a verification code and eligibility snapshot. It is presented as a completion certificate, not a claim of independent clinical competence.

## Database migrations added for First Activation

- `20260908030720_ten_first_activation`
- `20260908212856_ten_journey_assessment_seed`
- `20260908214008_ten_first_activation_sessions`
- `20260908215241_ten_assessment_source_truth_correction`
- `20260908215612_ten_runtime_live_hardening`
- `20260908220213_ten_journey_fk_indexes`
- `20260908220542_ten_facilitator_metrics`
- `20260908220948_ten_api_command_delegate`
- `20260908221033_ten_snapshot_projection_hardening`
- `20260908221519_ten_facilitator_confidence_metrics`
- `20260908223026_ten_completion_credit_hardening`
- `20260908223623_ten_codex_trigger_completion_hardening`
- `20260908232400_ten_tool_realtime_channel`
- `20260909072000_ten_assessment_architecture_v2`

Remote Supabase has the assessment v2 data applied and verified:
- 10 THE TEN Learning Objectives
- M01/M02/M03/M04 objective map counts 3/4/4/4
- 12 canonical SBA objective mappings
- 4 new analytic rubrics / 16 rubric criteria
- 8 new written questions / 8 rubric links
- Entry and Exit = 16 items, 28 marks, 30 minutes
- 10 blueprint rows / 100% blueprint weight on each checkpoint
- no Entry/Exit attempts existed when the assessment structure was changed

## Validation

PR Quality Gate runs:
- `npm ci`
- `npm run typecheck`
- `node --experimental-strip-types scripts/test-the-ten.mjs`
- `npm run build`

Visual/interaction commits are not acceptable until the latest branch head passes this gate.

Database rehearsals additionally covered all four mission completion contracts and learner Reveal projection without retaining synthetic rows.

A real authenticated facilitator + learner M01 walkthrough was completed during QA. The QA mission/run data was then cleaned and the prepared session returned to a clean scheduled state. A higher-load simultaneous multi-learner rehearsal remains optional resilience testing rather than evidence already claimed.

Assessment v2 still requires a fresh browser smoke test of:
- 16-item Entry delivery
- four written-response text submissions
- grading queue visibility
- one independent human rubric review
- optional AI proposal only if a server-side provider key is intentionally configured
- released objective-result generation after final written scores

## Security / performance advisors

Latest Supabase advisor review after Assessment Architecture v2 reports:
- intentional RLS-enabled/no-direct-policy notices for RPC-governed journey/TEN tables
- SECURITY DEFINER RPC warnings that require function-by-function intent review; existing public certificate verification is intentionally anonymous and other exposed gateways rely on internal authorization checks
- Leaked Password Protection remains disabled at the Auth project level and should be enabled before production
- performance advisor currently reports only unused-index informational notices; do not remove indexes merely because a fresh/low-traffic environment has not used them yet

Remediation references:
- RLS linter: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- Security-definer linter: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- Password protection: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Unused indexes: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

## Merge status

Keep PR #3 Draft until:
1. latest Quality Gate on Assessment Architecture v2 is green
2. revised Entry/Exit written-response flow passes browser/grading smoke QA
3. user visually signs off on the revised checkpoint experience
4. identity-locked reaction art is either reviewed/staged or explicitly deferred with neutral fallback accepted

Do not claim validated competence measurement or autonomous AI grading from this First Activation implementation.
