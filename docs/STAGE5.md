# Stage 5 — Narrative Gamified Learning Core

Stage 5 adds a deliberately light gamification layer to the existing SEIP learning workflow. It does **not** turn SEIP Hub into a game engine and it does not change the approved curriculum or formal assessment model.

The Stage 5 learner loop is:

**Comic / episode teaser → 10-second cold open → live educational mission → facilitator feedback → XP / progression → debrief → cliffhanger**

## Locked product invariant

**Learning remains the core product. Story, characters, XP and missions are a motivational and interaction layer around the approved educational sessions.**

The following are explicitly out of scope for v1:

- inventory / item systems
- coins, gems or shops
- health bars or avatar statistics
- random loot or reward mechanics
- public individual leaderboards
- branching game-engine logic
- AI-generated live diagnoses or hints
- formal grades derived from XP

## Why this design

The implementation is intentionally simple, team-oriented and feedback-rich.

- A 2026 narrative synthesis of active learning in health-professions education found stronger gamification results when interaction was team-oriented, rules were simple, and structured debriefing was present; more complex digital interfaces can add extraneous cognitive load.
  - https://doi.org/10.1080/10872981.2026.2656830
- A randomized cross-over study in medical students found that a simple competitive gamification design did not improve the target learning outcome or intrinsic motivation and that most participants rejected the competitive concept; the authors recommended more collaborative approaches.
  - https://doi.org/10.1186/s12909-023-04258-5
- A longitudinal emergency-medicine gamification program increased reported motivation, engagement and challenge, but did not establish an exam-score benefit, reinforcing that gamification should support engagement rather than substitute for the curriculum.
  - https://doi.org/10.1186/s12245-022-00445-1

## Technical invariants

1. XP, levels, characters and abilities are technically isolated from formal assessment/grading tables.
2. The browser continues to use only the Supabase publishable key; all new public tables are RLS-protected.
3. One learner selects one character per cohort; duplicate character selections are allowed.
4. Character choice never changes formal assessment score.
5. Team comparison is derived from member XP. There is no second team currency and no public individual rank.
6. XP is an auditable ledger, not a directly editable total.
7. Stage 5 core has no paid AI/API dependency.
8. The live session remains deliverable if the gamification layer is temporarily unavailable.

## Locked characters

| Character | Archetype | Signature ability |
| --- | --- | --- |
| Ibn Sina | The Synthesizer | Synthesis |
| Jabir ibn Hayyan | The Experimentalist | Test the Hypothesis |
| Al-Razi | The Observer | Reveal a Clue |
| Hippocrates | The Clinical Guardian | Red Flag |
| Dr. Gregory House | The Diagnostic Challenger | Challenge the Diagnosis |
| Dr. Stephen Strange | The Time Keeper | Time Reversal |
| Tony Tony Chopper | The Team Medic | Call the Crew |
| Senku Ishigami | The Evidence Scientist | Evidence Check |
| Sherlock Holmes | The Deductionist | Connect the Dots |
| Baymax | The Safety Guardian | Safety Scan |

## Levels

| Level | XP | Unlock |
| --- | ---: | --- |
| I — Recruit | 0–99 | Signature Ability once per Episode |
| II — Investigator | 100–199 | Second Chance once during the program when facilitator-permitted |
| III — Strategist | 200–299 | Ability Share once during the program |
| IV — Master | 300+ | Signature Ability may be used twice in Episode IV |

## Stage 5A database slice

The first migration adds:

- `game_characters`
- `game_level_definitions`
- `learner_game_profiles`
- `game_episodes`
- `game_missions`
- `game_mission_responses`
- `game_xp_events`
- `game_ability_uses`
- `learner_game_progress_v`
- aggregate team-score RPC `get_group_game_totals()`

The migration reuses the existing `cohorts`, `groups`, `sessions`, `session_facilitators`, `cohort_memberships`, and RLS helper functions instead of duplicating roster or authorization models.

### XP governance

`game_xp_events` is the canonical source of truth. Totals and levels are derived from the ledger.

Learners can read their own XP history but cannot award arbitrary XP to themselves. XP insertion is restricted to authorized session managers/facilitators. Corrections are recorded as new ledger entries rather than rewriting history.

### Character locking

Learners may select their own character while eligible. When an Episode first becomes `live`, the cohort's current selections are automatically locked. A Program Director can correct a profile when necessary, but character choice remains independent from academic assessment.

### Ability workflow

A learner can request the selected character's Signature Ability during a live Episode. The database validates:

- the learner belongs to the Episode cohort
- the Episode is live
- the requested character matches the learner's selected character
- the learner has not exceeded the allowed use count
- Level IV permits a second Signature Ability use only in Episode IV

The facilitator resolves the request; the platform does not automatically reveal a diagnosis or answer.

## Episode runtime

Stage 5 v1 uses a deliberately small state model:

- `draft`
- `published`
- `live`
- `completed`
- `archived`

The facilitator advances `current_mission_order` linearly. A multiplayer game-state engine is not required.

## Mission types v1

- `feature_selection`
- `problem_representation`
- `ranked_differential`
- `focused_history`
- `investigation_choice`
- `clinical_decision`
- `reflection`
- `facilitator_only`

Mission configuration lives in structured `jsonb`, but Stage 5 is **not** a general-purpose game authoring CMS.

## Live interaction strategy

The first pilot should work without Supabase Realtime. Server actions and normal reads/polling are sufficient for the initial interaction model. Realtime can be added later if it materially improves facilitation.

## Creating the Stage 5 migration

Run from the repository root:

```bash
./scripts/create-stage5-migration.sh
```

The script calls the Supabase CLI to create a timestamped migration and copies the reviewed Stage 5 SQL template into it.

Then validate:

```bash
python3 scripts/check-foundation.py
npm run typecheck
npx supabase migration list
npx supabase db push --dry-run
```

Review the diff before applying:

```bash
npx supabase db push
```

## Planned Stage 5 sequence

1. **5A — Data foundation**: tables, seeds, RLS, level/progress reads and team aggregate RPC.
2. **5B — Character & Journey**: `/learner/journey` and character selection.
3. **5C — Live Mission MVP**: learner mission page, facilitator console, linear runtime and responses.
4. **5D — XP & Ability Workflow**: facilitator XP operations, ability resolution, audit integration and level unlock rules.
5. **5E — Episode Seed Pack**: four approved SEIP episodes and mission metadata.
6. **5F — Pilot QA**: responsive testing, RLS tests, accessibility, failure-mode rehearsal, typecheck/build.
7. **5G — Optional Realtime**: only after the v1 interaction model is stable.

## Definition of done for Stage 5 v1

- learner can choose one of the ten characters and see it persist
- four Episodes map to four existing sessions
- comic/video asset links can be attached to each Episode
- facilitator can start an Episode and advance missions linearly
- learner can submit the required mission response types
- ability use is tracked and cannot exceed allowed limits
- XP remains auditable and independent from formal grading
- team totals are visible without a public individual leaderboard
- debrief/exit reflection is captured
- a gamification UI outage cannot prevent the educational session from continuing
- RLS validation, typecheck and production build pass before merge
