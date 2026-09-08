# THE TEN — First Activation Content Fidelity Audit

Updated: 2026-09-09
Canonical source: Drive package `THE_TEN_FIRST_ACTIVATION_CONTENT_v1.0`, especially `website_content_v1.json` (file ID `1ud3ESyFXiABvUCdSUE3EbDF1fyvnnIFv`) and the four Mission Session Packs.

## Contract

The educational sequence, clinical facts, options, answer keys, expected reasoning, mentor lenses, transfer cases and Nexus Echo items are source-controlled content. Visual/narrative production may become more immersive, but it must not silently rewrite these educational elements.

Program contract verified from the source package:
- 10 total THE TEN Signals
- 4 revealed in First Activation
- 4 missions
- process-based Mission Stability
- no public leaderboard, coins, streaks, loot or speed bonus
- changed answers after discussion are never penalized
- future clues and answer rationales remain hidden before Reveal
- initial answer and revote are separate records
- Nexus Echo unlock target is 48–72 hours; current source items use 60 hours

## Mission parity

### M01 — SEE THE PATTERN · Ibn Sina
Canonical activities:
1. 60-second solo Problem Representation
2. Differential Builder
3. Peer Instruction Cycle
4. Evidence Weighting
5. Transfer Micro-case

Runtime mapping:
- Problem Representation is a private first commit before discussion.
- Differential Builder stores Most Likely / Must Not Miss / Less Likely as separate structured fields.
- Stages 2–4 use canonical Peer Instruction where marked: initial commit → locked distribution → discussion → revote → Reveal.
- Evidence weighting is represented by the canonical highest-diagnostic-weight decision stage.
- Transfer Micro-case is a separate required transfer response.

Fidelity note: the current Differential Builder is structured and touch-friendly but uses fields rather than literal drag-and-drop. This preserves semantics and accessibility; drag sorting is visual/interaction polish, not a content change.

### M02 — QUESTION THE EVIDENCE · Al-Razi
Canonical activities:
1. Framing Challenge
2. Peer Instruction Cycle
3. Confidence Tracking
4. Evidence Board
5. Bias Tagging

Runtime mapping:
- The canonical initial framing decision is delivered before downstream test evidence.
- ECG and early hs-cTn stages preserve Peer Instruction and separate revote records.
- confidence is captured at canonical marked stages on the 20/40/60/80/100 scale and is never a mark multiplier.
- Evidence Board is a structured Supports / Opposes / Missing / Final judgment interaction.
- premature-closure bias tagging is a canonical decision stage.

Fidelity note: the source activity description says learners “rewrite indigestion into a neutral symptom representation”; the structured JSON stage itself is a single-choice framing decision. Production follows the canonical stage contract rather than inventing an extra scored response.

### M03 — TEST THE HYPOTHESIS · Jabir ibn Hayyan
Canonical activities:
1. Probability Before Test
2. Rule Builder — PERC + two-level Wells walkthrough
3. Choose-the-Next-Test
4. Test Meaning Card
5. Sequence Reconstruction

Runtime mapping:
- Stage 1 requires ranked differential + explicit low/intermediate/high probability before investigation stages.
- PERC and Wells are progressive separate stages, preserving the clinical order and peer cycles.
- D-dimer choice and meaning are separate decisions.
- CTPA and management appear only after the preceding reasoning sequence.
- Stage 6 explicitly reconstructs the educational sequence in the shared debrief: suspicion → probability rule → D-dimer → imaging → management.

Fidelity note: the current learner interaction expresses PERC/Wells through staged decisions rather than a literal interactive checklist, and Sequence Reconstruction is represented in debrief rather than a drag-sort widget. These are the two main remaining interaction-fidelity opportunities; the clinical sequence itself is already correct and protected.

### M04 — TREAT THE PATIENT · Hippocrates
Canonical activities:
1. Parallel Priorities
2. Safety Multiselect
3. Reassessment Loop
4. Handover Synthesis
5. Final Transfer Case

Runtime mapping:
- initial free-text reasoning captures immediate priorities before downstream evidence.
- allergy/renal/medication/local-guidance safety actions use canonical multiselect.
- treatment is followed by mandatory reassessment stages before further action.
- final team commit stores the short synthesis/rationale.
- Transfer Micro-case is separately required for Signal completion.

Fidelity note: Parallel Priorities is currently a free-text response rather than a two-column visual organizer; its required reasoning is still recorded before management reveal.

## Assessment parity

Database verification confirms both journey checkpoints contain 12 distinct items in positions 1–12:
- `THE TEN — Entry Baseline`
- `THE TEN — Exit Transfer Check`

The pair uses the matched `TEN-CR-01` through `TEN-CR-12` bank. The corrected source keys are preserved. The post-test remains inaccessible until all four mission Signals have valid completion credit.

## Completion integrity rehearsal

Transactional database rehearsals were run for M01–M04 and rolled back after each test. For every mission:
- all initial stage responses + all canonical peer revotes + transfer → `ten_completion_ready = true`
- removing any required peer revote → `false`
- removing a required stage response → `false`
- removing transfer → `false`

This confirms that facilitator room completion alone cannot grant Signal/My Codex credit to a passive or incomplete learner.

## Reveal / leakage rehearsal

Learner snapshot projection was tested separately:
- before Reveal: no answer key, expected reasoning or facilitator stage cue is present
- at Reveal: the permitted answer/feedback/expected reasoning becomes available
- facilitator-only stage ID remains removed from learner projection

## Remaining fidelity work before final sign-off

These are interaction/visual fidelity items, not missing medical content:
1. identity-locked character reaction pose assets
2. richer PERC/Wells Rule Builder presentation without changing canonical answer flow
3. optional accessible sequence-reconstruction interaction for M03 debrief
4. optional two-column Parallel Priorities organizer for M04 while retaining the canonical free-text record
5. final authenticated multi-device live-room rehearsal on real phones

No item above should delay or alter the canonical educational sequence. If a richer interaction threatens accessibility, real-time reliability, or the source content contract, the existing structured response remains authoritative.
