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

## Canonical content

Source of truth: Drive package `THE_TEN_FIRST_ACTIVATION_CONTENT_v1.0`, including `website_content_v1.json`.

Published mission content:
- M01 — SEE THE PATTERN · Ibn Sina · 6 stages
- M02 — QUESTION THE EVIDENCE · Al-Razi · 6 stages
- M03 — TEST THE HYPOTHESIS · Jabir ibn Hayyan · 6 stages
- M04 — TREAT THE PATIENT · Hippocrates · 7 stages

The runtime preserves the supplied sequence, options, keys, expected reasoning, mentor lenses, error tags, transfer cases, references and Nexus Echo items. Full interaction parity is documented in `THE_TEN_CONTENT_FIDELITY_AUDIT.md`.

Entry/Exit checkpoints are matched 12-item assessments using `TEN-CR-01` through `TEN-CR-12`. The earlier answer-index interpretation error was corrected before production attempts existed for this bank.

## Baghdad / visual product layer

Production assets now include:
- approved THE TEN — BAGHDAD NEXUS lockup and crest
- approved Baghdad artwork
- approved Nexus artwork
- approved neutral portraits for all four First Activation mentors
- approved-source medical-system sprite atlas
- approved-source Baghdad decorative sprite atlases

World/interaction surfaces now use those assets directly:
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

The only remaining art dependency is the identity-locked reaction-pose pack. Typed reaction states already exist and currently fall back safely to each approved neutral portrait.

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

Additional canonical activity fidelity now exists as supplemental, unscored reasoning tools:
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

Realtime broadcasts drive learner state; polling remains a resilience fallback.

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

Formal assessment delivery continues to exclude correctness fields. Written-response AI grading remains optional/advisory; human review/moderation remains authoritative for final written grading.

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

Remote Supabase has the matching applied migration sequence.

## Validation

PR Quality Gate runs:
- `npm ci`
- `npm run typecheck`
- `node --experimental-strip-types scripts/test-the-ten.mjs`
- `npm run build`

Visual/interaction commits are not considered acceptable until this gate is green.

Database rehearsals additionally covered all four completion contracts and learner Reveal projection without retaining synthetic rows.

Final operational sign-off still requires a real authenticated multi-device rehearsal with one facilitator device and at least two learner phones. That is the remaining reliability test that cannot be substituted by a database transaction or static build.

## Account-level security item

Supabase Leaked Password Protection is currently disabled. This is an Auth project setting, not a migration, and should be enabled before production launch.

TEN/journey tables intentionally use RLS deny-by-default with access through authorized RPCs. Public certificate verification is intentionally anonymous; other journey actions remain authenticated and internally authorized.

## Merge status

Do not merge PR #3 to `main` until:
1. latest Quality Gate is green
2. identity-locked reaction art is reviewed/staged or explicitly deferred with neutral fallback accepted
3. authenticated multi-device live-room rehearsal passes
4. user visually signs off on the actual phone experience
