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

Fidelity note: the current Differential Builder is structured and touch-friendly but uses accessible fields rather than literal drag-and-drop. This preserves semantics and keyboard/mobile usability; drag sorting is optional visual polish, not missing content.

### M02 — QUESTION THE EVIDENCE · Al-Razi
Canonical activities:
1. Framing Challenge
2. Peer Instruction Cycle
3. Confidence Tracking
4. Evidence Board
5. Bias Tagging

Runtime mapping:
- the recorded canonical initial framing decision remains the authoritative stage response.
- a supplemental `Framing Challenge` scratchpad lets the learner strip away the patient-provided label and build a neutral symptom/context/high-value-feature frame before committing. It is intentionally unscored and does not reveal an answer.
- ECG and early hs-cTn stages preserve Peer Instruction and separate revote records.
- confidence is captured at canonical marked stages on the 20/40/60/80/100 scale and is never a mark multiplier.
- Evidence Board is a structured Supports / Opposes / Missing / Final judgment interaction.
- premature-closure bias tagging is a canonical decision stage.

The scratchpad closes the activity-description gap without inventing an extra scored question or altering the structured JSON stage contract.

### M03 — TEST THE HYPOTHESIS · Jabir ibn Hayyan
Canonical activities:
1. Probability Before Test
2. Rule Builder — PERC + two-level Wells walkthrough
3. Choose-the-Next-Test
4. Test Meaning Card
5. Sequence Reconstruction

Runtime mapping:
- Stage 1 requires ranked differential + explicit low/intermediate/high probability before investigation stages.
- the live M03 experience includes an accessible, mobile Rule Builder synchronized to the room:
  - Stage 2: learner works through all eight PERC features from already-released clues; the tool does not label the correct mission answer before Reveal.
  - Stage 3: learner builds the two-level PE Wells score using the canonical criteria/weights and sees the ≤4 / >4 threshold while the separate mission commit remains authoritative.
- PERC and Wells remain progressive separate canonical stages with their original peer cycles.
- D-dimer choice/meaning, CTPA and management remain in source sequence.
- during Debrief/Completed, an accessible order-reconstruction tool asks learners to rebuild `Suspicion → Clinical probability → D-dimer when indicated → Definitive imaging → Management` using move-earlier/move-later controls instead of inaccessible drag-only UI.

This implements the intended Rule Builder and Sequence Reconstruction without changing the answer flow or exposing future clinical evidence.

### M04 — TREAT THE PATIENT · Hippocrates
Canonical activities:
1. Parallel Priorities
2. Safety Multiselect
3. Reassessment Loop
4. Handover Synthesis
5. Final Transfer Case

Runtime mapping:
- initial free-text reasoning remains the authoritative response before downstream evidence.
- a supplemental two-column `Parallel Priorities` scratchpad separates `STABILIZE NOW` from `DIAGNOSE SAFELY`, helping learners prepare the recorded response without auto-supplying clinical actions.
- allergy/renal/medication/local-guidance safety actions use canonical multiselect.
- treatment is followed by mandatory reassessment stages before further action.
- final team commit stores the short synthesis/rationale.
- Transfer Micro-case is separately required for Signal completion.

The organizer is intentionally a local reasoning aid; it cannot grant completion and does not replace the canonical free-text record.

## Assessment fidelity and extension boundary

### Canonical source retained

The source Assessment / Retrieval / Transfer Bank defines a **12-item Baseline / Post Mini-Assessment** and the master content specifies an 8–12 item low-stakes baseline using novel mini-cases. The canonical `TEN-CR-01` through `TEN-CR-12` bank remains unchanged and occupies positions 1–12 in both:
- `THE TEN — Entry Baseline`
- `THE TEN — Exit Transfer Check`

The corrected source answer keys remain preserved. The post-test remains gated until all four mission Signals have valid completion credit.

### Evidence-informed Assessment Architecture v2

The production checkpoint has been deliberately extended beyond the original 12-item bank with **four brief constructed-response mini-cases** at positions 13–16. These eight Entry/Exit CRQ prompts are **not canonical Drive-bank content** and must not be represented as such. They are a documented evidence-informed extension intended to sample learner-generated reasoning in addition to selected-response recognition.

Current checkpoint structure:
- 12 canonical single-best-answer items × 1 mark
- 4 constructed responses × 4 marks
- 16 items
- 28 marks
- 30 minutes

Entry and Exit use parallel novel written cases, not identical stems.

The new written domains are:
1. Problem Representation + urgency-focused prioritization
2. Evidence interpretation + diagnostic updating
3. Pretest probability + test sequencing
4. Management + patient safety + reassessment

Detailed mappings, rubrics and evidence boundary are documented in `THE_TEN_ASSESSMENT_ARCHITECTURE.md`.

## Learning Objective / rubric integration

Assessment Architecture v2 adds ten active `TEN-LO-*` Clinical Reasoning objectives and maps them to:
- M01–M04 prepared sessions
- all twelve canonical SBA items
- all eight new constructed-response items
- Entry and Exit assessment blueprint rows

Four approved analytic rubric families (`TEN-RUB-REP`, `TEN-RUB-EVID`, `TEN-RUB-TEST`, `TEN-RUB-SAFE`) contain four 0–1 criteria each and are linked to the corresponding written questions.

The existing result pipeline can aggregate released final item scores through `question_learning_objectives` into `learner_objective_results`. These are formative learning signals, not competence diagnoses.

Written-response AI grading remains optional/advisory. Human review and moderation remain authoritative for final written scores. The system remains fully functional when no AI provider key is configured.

Entry and Exit start screens use the Nexus gate visual language, while the actual question-taking surface remains deliberately focused and conventional for accessibility and assessment integrity.

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

Supplemental reasoning tools use only rule structures and clues already released in the current stage. They do not fetch private content tables or model-answer fields.

## Remaining fidelity work before final sign-off

Mission-content parity is intact. Remaining work should not alter the canonical mission sequence:
1. browser QA of the revised 16-item Entry/Exit assessment, including written-response submission and grading queue
2. one human-governed written grading smoke test; AI proposal smoke test only if a server-side provider key is intentionally configured
3. identity-locked character reaction pose assets may be staged later; approved neutral portraits remain the safe fallback
4. optional higher-load simultaneous-learner Realtime rehearsal if concurrency assurance is desired beyond the completed single-learner live walkthrough and existing database/state-machine tests

Any further assessment extension must remain explicitly labeled as evidence-informed rather than canonical-source content.
