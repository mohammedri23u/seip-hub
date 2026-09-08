# THE TEN — BAGHDAD NEXUS Implementation Status

Updated: 2026-09-08
Branch: `codex/the-ten-interaction-system`
PR: #3 (Draft, not merged)

## Preservation and safety

- `main` remains unchanged by this work.
- The existing safety stash remains untouched: `safety/main-before-the-ten-interaction-system-2026-09-08` (`7f41c60a9efdee77be5fe874d0d14a6da5f4a210`).
- No stash apply/pop/drop, hard reset, or merge to `main` is part of this implementation.
- Learner, facilitator, assessment, grading, and certificate authority remains server/database-backed; page visits never fabricate completion.

## Product direction now implemented

The learner-facing product is no longer organized primarily as an LMS dashboard. The primary journey is:

`Sign in → Orientation → Entry Baseline → Baghdad World → M01 → M02 → M03 → M04 → My Codex / Nexus Echo → Exit Transfer Check → Final Feedback → Completion Certificate`

The website is a mobile-first interactive reasoning companion. It contains no Zoom SDK, meeting link, embedded video room, or dependency on a specific conferencing platform. Peer discussion occurs in the teaching space around the learner; the phone is used for private commit, optional confidence, revote, structured reasoning interactions, transfer and reflection.

## Canonical content

`THE_TEN_FIRST_ACTIVATION_CONTENT_v1.0` is the educational source of truth. The four published missions in `ten_content` are loaded from the canonical structured package:

- `M01 — SEE THE PATTERN` · Ibn Sina · 6 stages
- `M02 — QUESTION THE EVIDENCE` · Al-Razi · 6 stages
- `M03 — TEST THE HYPOTHESIS` · Jabir ibn Hayyan · 6 stages
- `M04 — TREAT THE PATIENT` · Hippocrates · 7 stages

The runtime preserves the supplied sequence, options, answer keys, expected reasoning, mentor lenses, error tags, transfer cases, clinical references and Nexus Echo content. It does not invent missing `promptIfStuck` or dedicated PPT cue fields; the canonical stage ID is used as the presenter cue where needed.

The Entry Baseline and Exit Transfer Check each contain the canonical 12-item low-stakes reasoning bank. The source-truth correction migration fixed an earlier 0-based answer-index interpretation before any attempts existed. Database verification confirms the canonical keys: B, C, B, B, A, B, B, B, B, B, B, B.

Assessment language remains formative: these records do not independently certify clinical competence, confidence is not a mark multiplier, and no public learner ranking is exposed.

## Baghdad learner journey

`/learner` is now a journey gate and world, not a sessions/checkpoints dashboard:

- Before orientation: Baghdad remains narratively closed.
- After orientation but before baseline: illustrated Nexus Entry Gate.
- After baseline: full Baghdad World with a central Nexus and four Signal locations.
- Each Signal visibly represents locked/waiting/live/completed state and links directly into the synchronized mission when available.
- Desktop uses a world map with four mentor Signal hotspots and Nexus connections; mobile uses a compact four-Signal mission dock over the world art.
- Accessible Signal Dossiers remain below the visual world as a conventional text/navigation path.
- Completed Signals remain visible as persistent world progression.

Primary learner navigation is now `Baghdad`, `My Codex`, and `Completion`. Historical sessions/checkpoints routes remain available as supporting/fallback records rather than the product's primary mental model.

## Live Mission Engine

Learner mission route: `/learner/mission/[runId]`

The synchronized room supports:

- Waiting
- Commit Open
- Commit Locked
- Peer Discussion only on canonical peer-instruction stages
- Revote Open
- Reveal
- next-stage progression
- Transfer micro-case
- Debrief
- Completed

Server-side command validation prevents invalid transitions. Non-peer stages correctly skip Discussion/Revote. Learner answer writes are accepted only during the permitted room state.

Supported canonical interaction patterns include:

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

Revote preloads the learner's initial response so changing or retaining an answer is deliberate. Initial and revote records remain separate. Required confidence must be selected before submission at marked stages. Future clues, answer keys and feedback remain excluded from learner snapshots until Reveal.

Mission-specific color atmosphere differentiates Pattern, Evidence, Hypothesis and Treatment while keeping one franchise language. Character reaction requests use the typed asset manifest and safely fall back to each approved neutral portrait until approved pose files exist.

## Realtime, attendance and completion safety

Realtime broadcasts are separated into room-state events and response-count events so learner submissions do not create unnecessary whole-room state storms. Polling remains a resilience fallback.

Live-response inserts create/update attendance records for actual participating learners. A waiting-room page visit by itself does not grant mission completion.

Mission Signal / My Codex credit is guarded at the database layer: a learner must have a recorded response for every required stage index plus the transfer response. Completing the room cannot fabricate credit for a passive or incomplete learner.

A facilitator-only metrics RPC exposes:

- joined learners
- completion-ready learners
- incomplete learners
- initial vote distribution
- revote distribution
- initial confidence mean
- revote confidence mean
- changed-answer count

These are process/learning signals, not competence labels.

## Facilitator experience

Facilitator route: `/facilitator/the-ten`

Four prepared 90-minute First Activation sessions are seeded once with join codes `TEN-M01` through `TEN-M04`. The facilitator does not rebuild content per delivery.

Normal use is:

`Make session live → Commit → Lock → (Discussion → Revote when canonical) → Reveal → Next → Transfer → Debrief → Complete`

Room creation is the authoritative launch path and atomically marks the prepared session live. It does not rely on a broad direct session-update permission.

The live facilitator UI exposes response progress, presenter stage ID, expected reasoning, mentor lens, common errors, confidence shift, initial/revote distributions, changed-answer count, and completion-readiness warnings.

After completion, the facilitator records a fidelity closeout covering:

- individual commit before discussion
- answer withheld until Reveal
- rationale elicited
- debrief completed
- optional delivery notes

Fidelity data is explicitly a delivery/process record, not a one-session teacher-quality score.

## My Codex and Nexus Echo

`/learner/progress` is presented as `My Codex`.

Each eligible completed Signal stores its reasoning principle, completion time and learner reflection. Nexus Echo items remain locked until their canonical delayed-retrieval time; the current structured package uses 60 hours, within the intended 48–72 hour interval. The answer anchor remains hidden until the learner first submits a retrieval response.

## Pre-test, post-test and completion

Journey configuration links:

- `THE TEN — Entry Baseline` (`diagnostic`, 12 items)
- `THE TEN — Exit Transfer Check` (`final`, 12 items)

The pre-test is gated by orientation. Mission access is gated by the submitted Entry Baseline. The post-test is gated by completion of all four required Signals.

`/learner/certificate` reads persisted backend records for:

- orientation
- Entry Baseline
- four required mission Signals
- Exit Transfer Check
- configured attendance requirement
- final program feedback

Only an eligible journey can issue a completion certificate. The certificate stores a verification code and eligibility snapshot. It is described as a completion record, not a validated clinical-competence credential.

## AI boundary

The existing server-only OpenAI grading integration remains optional and advisory for written-response rubric support. It is not required for mission progression and is not exposed as a learner chatbot. Human review/moderation remains authoritative for final written grading decisions.

The core First Activation journey remains functional when `OPENAI_API_KEY` is absent.

## Visual assets

Production currently includes:

- clean THE TEN — BAGHDAD NEXUS lockup
- crest
- Baghdad world artwork
- Nexus artwork
- approved neutral portraits for Ibn Sina, Al-Razi, Jabir ibn Hayyan and Hippocrates

Approved reaction-pose PNGs, isolated decorative/vector exports and medical-system icon exports are not yet physically present. Missing reaction states intentionally fall back to the corresponding neutral portrait; no character likeness is fabricated in code.

## Database migrations added for First Activation

- `20260908030720_ten_first_activation`
- `20260908212856_ten_journey_assessment_seed`
- `20260908214008_ten_first_activation_sessions`
- `20260908215241_ten_assessment_source_truth_correction`
- `20260908215612_ten_runtime_live_hardening`
- `20260908220213_ten_journey_fk_indexes`
- `20260908220542_ten_facilitator_metrics`

The remote Supabase project contains matching applied migrations.

## Validation

The GitHub Quality Gate runs:

- `npm ci`
- `npm run typecheck`
- `node --experimental-strip-types scripts/test-the-ten.mjs`
- `npm run build`

The latest fully checked implementation before this status update passed typecheck, learner regression tests and production build in GitHub Actions. Each subsequent implementation commit remains subject to the same PR Quality Gate before review/merge.

The existing browser QA covered 1440, 768, 390 and 320 px layouts, keyboard interaction and reduced motion. A final authenticated multi-device rehearsal remains the last meaningful operational QA: one facilitator device plus at least two learner phones traversing a full mission in realtime.

## Deployment/security notes still requiring account-level action

Supabase database advisors were reviewed. New journey foreign-key index findings were addressed. TEN/journey tables intentionally expose no direct RLS policies because they are RPC-only surfaces; SECURITY DEFINER RPCs perform their own user/session/role checks before accessing those tables.

One account-level Auth setting remains outside the repository migration surface: Supabase **Leaked Password Protection** is currently disabled and should be enabled in Auth settings before production launch.

Public certificate verification is intentionally callable without learner authentication; all other journey actions remain authenticated and internally authorized.

## Review status

The implementation remains on Draft PR #3 and is not merged to `main`. Do not merge until the user has reviewed the final visual/interaction experience and an authenticated live-room rehearsal has passed.
