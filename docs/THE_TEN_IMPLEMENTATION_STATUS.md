# THE TEN Implementation Status

## Completed in first slice
- Codex operating rules in `AGENTS.md`
- UI/UX interaction blueprint
- typed THE TEN design tokens
- typed character/world asset manifest
- reusable `AnswerOption`
- reusable `QuestionCard`
- reusable `ProgressTracker`
- reusable `FeedbackPanel`
- reusable `CharacterGuide` API
- interactive `AssessmentExperience`
- THE TEN restyle of assessment start / active / submitted states
- live answered-question progress
- selected answer states
- duplicate-submit pending state
- assessment error recovery messaging
- global visible focus treatment
- global reduced-motion behavior
- asset staging checklist
- GitHub Actions typecheck/build quality gate

## Deliberately not faked
Formal assessment correctness is not displayed before submission because the current delivery RPC does not expose authoritative answer correctness to the client. Correct/incorrect/partial components are ready for formative cases where authoritative feedback is available.

## Required visual assets before enabling character/world art
See `docs/THE_TEN_ASSET_CHECKLIST.md`.

## Next implementation slice
1. stage approved art under `public/the-ten/`
2. build `CaseCard`, badges, buttons, and system icon wrappers
3. build learner Baghdad home / journey shell
4. build formative case state machine and section progression
5. connect `FeedbackPanel` + `CharacterGuide` to authoritative formative feedback
6. implement session unlock/completion visual states
7. implement progress/results reflection view
8. implement certificate eligibility/unlock experience from backend completion rules
