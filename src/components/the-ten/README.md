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
