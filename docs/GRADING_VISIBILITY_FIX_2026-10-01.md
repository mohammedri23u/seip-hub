# Grade visibility and truthful completion status — 2026-10-01

## Corrected behavior

The leadership gradebook at `/grading` now includes Pre-test and Post-test summaries next to every learner's name. The summaries distinguish full submission, partial submission, timeout without answers, in-progress attempts and attempts not yet started. A timeout alone is not counted as a complete test.

MCQ scores, written-answer scores, partial totals and final approved totals are shown separately. Missing responses are not synthesized or silently assigned a score. A real recorded score of zero remains visible as zero. Current corrections take precedence over older final decisions. The independent teacher queue remains written-response-only; its leadership link now explicitly leads to the named gradebook.

The gradebook refreshes every 30 seconds while visible, on window focus, or through the refresh button. Search/filter state is retained by router refresh. The learner detail page explains missing and timed-out answers and displays the same server-calculated summary.

## Data and security

Applied migration: `20261001174951_grading_completion_and_score_visibility.sql`. This is a read-model change only; no student answers, review scores, final decisions, expirations, or assessment assignments were edited or deleted. The internal snapshot function is SECURITY INVOKER with no direct anonymous/authenticated EXECUTE privilege. It is called inside the existing leadership-checked private workspace. Existing session and role checks are unchanged; in-progress score values remain hidden. No paid AI service was added.

## Checks completed before publication

- TypeScript typecheck passed.
- Next.js production build passed.
- Existing grading-calculation/search tests: 15/15 passed.
- Completion/score-display tests: 12/12 passed.
- Live read queries verified complete written attempts, partial MCQ attempts, and timeout without answers against stored response counts.
- The internal snapshot and the public workspace are not callable anonymously.
- No clinical answer keys or student-identifying data are included in this document.

These checks are not a claim of an authenticated administrator browser end-to-end test. Deployment and primary-domain status must be checked separately after the release commit.
