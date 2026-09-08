# THE TEN UI Components

Reusable learner-facing primitives for THE TEN — BAGHDAD NEXUS.

## Components
- `TheTenButton` — primary/secondary/gold/ghost actions
- `StatusBadge` — neutral/success/danger/warning/accent/gold labels
- `CaseCard` — available/in-progress/completed/locked/bonus case states
- `QuestionCard` — assessment/formative prompt surface
- `AnswerOption` — selected/correct/incorrect/partial/submitting/disabled option states
- `ProgressTracker` — answered/total progress
- `FeedbackPanel` — authoritative correct/incorrect/partial feedback
- `CharacterGuide` — reaction-state character presentation with asset manifest fallback
- `AssessmentExperience` — controlled learner assessment interaction shell

## Rule
Do not bypass backend assessment authority for visual convenience. Correctness UI is only used when the relevant data contract supplies authoritative feedback.

## Learner journey and formative adapters

The learner routes use `getLearnerJourney` (server-only) to read existing cohort, session, attendance, assessment, and attempt records. `checkpointState` is presentation logic; RLS and the existing submission action remain authoritative.

`CaseExperience` takes a `FormativeCase` and an asynchronous `submitAnswer(questionId, optionId)` adapter. Supply only published formative content and backend-confirmed feedback. Every feedback result must include the same question/option IDs, a `correct | incorrect | partial` outcome, and a nonempty explanation. Rejections keep the selection for retry. Provide persisted feedback on each question when resuming; confirmed feedback is also retained during navigation within the mounted case. Key `CaseExperience` by case ID when switching cases.

`completed` and each section's `completed`/`lockedReason` come from the adapter. The component never marks a case complete or unlocks a section because a learner clicked Continue. Supply refreshed props after authoritative state changes. Do not use this API to expose protected formal assessment keys.

Approved artwork is optional at render time: missing manifest entries are `null`, neutral poses are the only fallback for missing reactions, and missing neutral poses produce text guidance. See the asset checklist for staging requirements.
