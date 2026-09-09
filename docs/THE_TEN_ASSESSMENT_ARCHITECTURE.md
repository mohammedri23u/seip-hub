# THE TEN — BAGHDAD NEXUS Assessment Architecture

Updated: 2026-09-09
Status: First Activation assessment architecture v2

## Purpose

THE TEN uses assessment to make clinical reasoning visible, support feedback, and generate program-level learning signals. It is **formative and low-stakes**. It must not be presented as a validated clinical-competence examination unless future validation work supports that claim.

The architecture combines:
- canonical First Activation assessment content
- structured Learning Objectives
- matched Entry/Exit checkpoints
- brief constructed responses for generated reasoning
- analytic rubrics
- objective-level analytics
- optional AI-assisted proposed grading with mandatory human governance

## Source fidelity vs evidence-informed extension

### Canonical source retained

The Drive package `THE_TEN_FIRST_ACTIVATION_CONTENT_v1.0` remains the content source of truth.

The canonical Assessment / Retrieval / Transfer Bank defines:
- a 12-item Baseline / Post Mini-Assessment
- novel mini-cases rather than teaching-case wording
- rationale collection where feasible
- confidence as a calibration signal rather than a mark multiplier
- matched post-assessment
- Nexus Echo retrieval
- no public punitive ranking

The original 12 questions (`TEN-CR-01` through `TEN-CR-12`) remain unchanged as positions 1–12 in both Entry and Exit checkpoints.

### Evidence-informed extension

Assessment Architecture v2 adds four brief constructed-response mini-cases to each checkpoint. These items are **not claimed to be part of the original canonical bank**. They are an evidence-informed extension intended to complement selected-response recognition with learner-generated reasoning.

The Entry and Exit constructed responses are parallel forms rather than identical prompts. They target the same reasoning domains while reducing direct recall of the exact pre-test wording.

## Entry / Exit structure

Both checkpoints now contain:
- 12 canonical single-best-answer items × 1 mark
- 4 brief constructed-response mini-cases × 4 marks
- 16 total items
- 28 total marks
- 30-minute delivery window

The four constructed-response domains are:
1. Problem Representation + urgency-focused prioritization
2. Evidence interpretation + diagnostic updating
3. Pretest probability + test strategy
4. Management + patient safety + reassessment

The Exit form uses parallel novel cases rather than repeating the Entry prompts.

## Learning Objectives

The program now has ten active THE TEN Learning Objectives.

| Code | Learning Objective | Primary competency |
|---|---|---|
| TEN-LO-01 | Construct a discriminating Problem Representation | Problem Representation |
| TEN-LO-02 | Prioritize a Differential and Red Flags | Differential Diagnosis |
| TEN-LO-03 | Interpret Evidence With Its Limits | Evidence Interpretation |
| TEN-LO-04 | Update Probability and Resist Cognitive Bias | Diagnostic Updating |
| TEN-LO-05 | Set Pretest Probability Before Testing | Pretest Probability |
| TEN-LO-06 | Sequence and Interpret Diagnostic Tests | Investigation Strategy |
| TEN-LO-07 | Prioritize Management and Patient Safety | Management and Patient Safety |
| TEN-LO-08 | Reassess and Update After Intervention | Reassessment |
| TEN-LO-09 | Calibrate Confidence Under Uncertainty | Confidence Calibration |
| TEN-LO-10 | Transfer the Reasoning Framework | Transfer |

All ten sit within the `Clinical Reasoning` domain.

## Mission-to-objective map

### M01 — SEE THE PATTERN
- TEN-LO-01 — 40%
- TEN-LO-02 — 40%
- TEN-LO-10 — 20%

### M02 — QUESTION THE EVIDENCE
- TEN-LO-03 — 40%
- TEN-LO-04 — 30%
- TEN-LO-09 — 10%
- TEN-LO-10 — 20%

### M03 — TEST THE HYPOTHESIS
- TEN-LO-05 — 40%
- TEN-LO-06 — 40%
- TEN-LO-09 — 10%
- TEN-LO-10 — 10%

### M04 — TREAT THE PATIENT
- TEN-LO-07 — 40%
- TEN-LO-08 — 30%
- TEN-LO-09 — 10%
- TEN-LO-10 — 20%

## Canonical SBA-to-objective map

| Question | Objective |
|---|---|
| TEN-CR-01 | TEN-LO-02 |
| TEN-CR-02 | TEN-LO-01 |
| TEN-CR-03 | TEN-LO-03 |
| TEN-CR-04 | TEN-LO-03 |
| TEN-CR-05 | TEN-LO-04 |
| TEN-CR-06 | TEN-LO-05 |
| TEN-CR-07 | TEN-LO-06 |
| TEN-CR-08 | TEN-LO-05 |
| TEN-CR-09 | TEN-LO-08 |
| TEN-CR-10 | TEN-LO-07 |
| TEN-CR-11 | TEN-LO-09 |
| TEN-CR-12 | TEN-LO-10 |

## Constructed-response objective map

For both parallel Entry and Exit forms:

- CRQ-01 → TEN-LO-01 60% + TEN-LO-02 40%
- CRQ-02 → TEN-LO-03 60% + TEN-LO-04 40%
- CRQ-03 → TEN-LO-05 50% + TEN-LO-06 50%
- CRQ-04 → TEN-LO-07 45% + TEN-LO-08 35% + TEN-LO-10 20%

TEN-LO-09 is measured directly through the canonical confidence-calibration item and the live mission confidence/revote telemetry rather than forcing confidence into the written-response score.

## Analytic rubrics

Four approved rubric families are linked to the constructed responses.

### TEN-RUB-REP — Representation & Prioritization
Each criterion: 0–1 point; half-points allowed.
- REP-1 Discriminating features
- REP-2 Tempo and context
- REP-3 Urgency-focused prioritization
- REP-4 Precision and concision

### TEN-RUB-EVID — Evidence Interpretation & Updating
- EVID-1 What the evidence supports
- EVID-2 What the evidence cannot exclude
- EVID-3 Probability update
- EVID-4 Next evidence or action

### TEN-RUB-TEST — Probability & Test Strategy
- TEST-1 Pretest probability first
- TEST-2 Appropriate test/pathway selection
- TEST-3 Result meaning
- TEST-4 Diagnostic sequence

### TEN-RUB-SAFE — Management, Safety & Reassessment
- SAFE-1 Immediate priorities
- SAFE-2 Parallel diagnosis and safety work
- SAFE-3 Patient-specific safety
- SAFE-4 Reassessment and escalation

Each rubric has a maximum of 4 points. The current moderation threshold is an absolute 1.0-point difference between an AI proposal and an independent human review.

## Grading governance

Objective-response items use the existing machine-scoring path.

Written responses use this workflow:
1. learner submits a text response
2. response enters the written grading queue
3. qualified reviewer scores every analytic criterion independently
4. optional AI proposal may be generated when a server-side provider key is configured
5. AI output is advisory only
6. the human reviewer remains authoritative
7. material AI–human disagreement can open moderation
8. a final score is released only through the governed human/moderation decision path

The human-review screen is intentionally not prefilled from AI. The AI proposal is revealed for comparison only after an independent human review has been submitted, reducing anchoring risk.

## AI boundary

Current implementation:
- server-only OpenAI Responses API integration
- default model: `gpt-5.6-luna`
- rubric-constrained structured output
- criterion-level proposed score, rationale, confidence, missing concepts and errors
- no automatic final grading
- no learner chatbot
- no dependency of the core THE TEN journey on AI availability

If `OPENAI_API_KEY` is absent, human grading remains fully functional.

## Objective analytics

The existing `private.refresh_attempt_result` pipeline aggregates finalized item scores through `question_learning_objectives` and writes released objective-level outcomes into `learner_objective_results`.

This enables analysis such as:
- Entry → Exit performance by Learning Objective
- representation vs evidence vs testing vs safety domains
- objective evidence counts
- aggregate cohort learning-gap patterns

Interpretation must remain appropriately bounded. Objective results are educational signals from this assessment system, not validated diagnoses of stable learner competence.

## Blueprint

Both Entry and Exit assessments contain ten blueprint rows, one per Learning Objective. Blueprint marks and weights now mirror the actual mapped evidence in the 28-mark form rather than assigning artificial equal weights.

| Objective | Target marks | Target weight |
|---|---:|---:|
| TEN-LO-01 | 3.4 | 12.143% |
| TEN-LO-02 | 2.6 | 9.286% |
| TEN-LO-03 | 4.4 | 15.714% |
| TEN-LO-04 | 2.6 | 9.286% |
| TEN-LO-05 | 4.0 | 14.286% |
| TEN-LO-06 | 3.0 | 10.714% |
| TEN-LO-07 | 2.8 | 10.000% |
| TEN-LO-08 | 2.4 | 8.571% |
| TEN-LO-09 | 1.0 | 3.571% |
| TEN-LO-10 | 1.8 | 6.429% |

The weights sum to 100% and target marks sum to 28. TEN-LO-09 is intentionally lightly represented in the formal checkpoint because confidence calibration is also sampled repeatedly in the live mission telemetry. The blueprint is an explicit coverage contract and analytic organizing layer; it is not psychometric validation.

## Evidence rationale for the extension

The four written items are an evidence-informed design extension, not a claim that one format is universally superior.

Relevant evidence reviewed before implementation includes:
- **Very Short Answer Questions and reduced cueing / generated recall**: recent medical-education work reports that VSAQ-style formats can reduce recognition cueing and require learners to generate responses. PubMed PMID: 41137731.
- **Constructed-response marking schemes**: Medical Teacher guidance emphasizes explicit, objective-aligned marking schemes for constructed-response assessment. PubMed PMID: 38484293.
- **VSAQ vs MCQ systematic evidence**: a recent systematic review/meta-analysis reports strong discrimination and acceptable reliability for VSAQs across included studies while noting format differences and context dependence. PubMed PMID: 42067879.
- **Programmatic clinical-reasoning assessment**: clinical reasoning is better represented by triangulating multiple assessment sources than relying on a single score or format. Academic Medicine, PubMed PMID: 38412485.
- **AI grading of short-answer assessment**: recent studies show promising rubric-based agreement in some settings but meaningful variation across questions, difficulty and models; continued human oversight remains necessary.

## Claims boundary

Do not claim from this architecture alone that:
- THE TEN is a validated competence examination
- a learner is clinically competent or deficient based on one objective score
- AI grading is equivalent to expert human judgment in this local context
- a pre/post score change proves durable clinical performance

Appropriate claims are narrower:
- the assessment is blueprint-driven
- it samples multiple clinical-reasoning processes
- it combines selected and constructed responses
- written responses use explicit analytic rubrics
- final written grading remains human-governed
- objective-level outcomes can support formative program evaluation and future validation research
