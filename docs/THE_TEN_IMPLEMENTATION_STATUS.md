# THE TEN Implementation Status

## Current branch and preservation

Continued on `codex/the-ten-interaction-system` from its remote tracking branch on 2026-09-08.

All previous tracked and untracked work from `main` is preserved in the untouched safety stash:
`On main: safety/main-before-the-ten-interaction-system-2026-09-08`.
No stash content was applied or copied into this branch. This learner-experience slice is prepared for remote review through the existing PR #3; it is not merged into `main`. No deployment action was performed.

## Implemented learner journey slice

- `/learner`: Baghdad/Nexus home with accessible text world navigation, next action, recorded participation, session cards, and checkpoint cards.
- `/learner/orientation`: four concise orientation steps with links into the journey.
- `/learner/sessions` and `/learner/sessions/[sessionId]`: scheduled/live/ended/cancelled sessions, briefings, learning objectives, and the learner's recorded attendance.
- `/learner/assessments`: available, in-progress, upcoming, closed, submitted, released, and invalidated checkpoint states; visible opening/lock reasons and start-failure feedback.
- `/learner/progress`: attendance and checkpoint history with released-result links. Session ended, attendance recorded, and assessment submitted remain separate facts.
- `/learner/results/[attemptId]`: ownership-filtered, release-gated response scores. Final reviewed decisions take precedence over recorded objective scores. No overall grade is invented from an incomplete response set; protected questions, keys, draft reviews, and internal rationales are not fetched.
- `/learner/certificate`: explicit eligibility-unavailable state with a progress link. There is no certificate backend contract in this branch.
- Active and completed learner cohort memberships are retained in the journey. Completed cohorts keep historical sessions, attendance, progress, released results, and a path for future certificate evidence; only active cohorts contribute current/next actions or checkpoint availability.
- Persistent learner navigation, orientation/account menu, sign out, skip link, and links from the existing SEIP dashboard/workspace.
- Formal assessment taking uses the learner shell and retains the existing action binding and `q_<question_version_id>` fields. Single-answer questions use radios, `multiple_response` uses native checkboxes with multiple selected IDs, and written responses remain text. Pending submission disables edits; keyboard focus is visible on answer labels. Invalidated attempts no longer display a success state. Closed/unopened checkpoints show an explanation.
- A focused final-confirmation step reports answered and unanswered counts plus exact unanswered question numbers before an attempt can be locked.
- Loading, fetch-error/retry, empty, and missing-art states.

## Reusable formative case flow

`CaseExperience`, `CaseProgressTracker`, and `FormativeQuestion` support Intro → History → Examination → Investigations → Management → Summary.

The adapter supplies published sections, completion/lock state, and confirmed feedback. The answer state machine supports idle, selected, submitting, locked review, correct, incorrect, partial, and retry after a failed confirmation. It rejects mismatched feedback, prevents duplicate submissions, preserves the reviewed selection across section navigation, and does not advance persisted completion based on clicks. Formative feedback now has one owning `aria-live` region; `FeedbackPanel` no longer nests a second announcement region.

`CharacterGuide` reactions resolve through the typed asset manifest. Missing reaction art falls back to approved neutral art when present; missing neutral art renders the character name and guidance without an image request. No pose is invented.

Motion uses the existing centralized timing tokens, short directional section exit/entry, a single feedback pulse/nudge, delayed explanation, and reduced-motion fallbacks. The page shell remains still.

The case flow is tested with synthetic fixtures only. It is **not connected to a live case feed**: this branch has no published case content/delivery/feedback contract. No mock clinical cases are shipped to learners.

## Backend contracts preserved

- Existing Supabase auth client, claims checks, session refresh, RLS, migrations, assessment delivery RPC, scoring triggers, and grading workflow are unchanged.
- Journey reads use active and completed learner cohort memberships through the signed-in user's client. Attempts/attendance are explicitly filtered to that user and the retained cohort content. Presentation logic uses membership status to separate current learning from historical access.
- The assessment submission action now builds and validates the complete response payload before writing. Multiple-response IDs must belong to the delivered question; zero, one, and multiple selections use `selected_option_ids`, while `selected_option_id` and `text_response` are cleared. Single-answer and written rows likewise clear incompatible fields. Existing RLS and database validation/scoring triggers remain authoritative.
- Checkpoint opening times are presentation checks only. Existing RLS/RPCs remain the authority for taking and submitting an assessment.
- Formal correctness stays hidden before release, including for a learner who also has a staff role.
- No certificate eligibility, attendance, mastery, or mission completion is inferred from UI interaction.
- No database writes or schema changes were made during this work.

## Validation

- `npm ci`: passed (lockfile unchanged).
- Initial typecheck found stale `.next` generated types from the prior branch. The old cache was preserved at `/tmp/the-ten-previous-build.PjxVig`; regenerated types/build passed without changing backend source.
- Final pre-push validation (2026-09-08): `npm run typecheck`, `npm run build`, and the state tests below all passed. The build also passed with build-only Supabase placeholders, without requiring live project credentials.
- `node --experimental-strip-types scripts/test-the-ten.mjs`: passed. Covers active/completed membership retention, current-mission separation, checkpoint windows, historical released-result access, zero/one/multiple selection payloads, delivery-ID rejection, incompatible-field clearing, complete-payload validation, feedback identity checks, retry, duplicate submission, locked answers, and released-score bounds.
- Isolated Chromium component harness with synthetic data: desktop 1440px, tablet 768px, mobile 390px and 320px; no page overflow or missing-image requests. Checked skip link/account menu, keyboard radio/checkbox selection and focus, all feedback outcomes, one feedback live region, locked steps, selection review, failed submission/retry, reduced motion, answered/unanswered confirmation, and multiple-response FormData during pending submission.
- Production runtime: signed-out visits to learner home, progress, certificate, sessions, checkpoints, and a result route redirected to `/login`.
- Local QA harness and screenshots: `/tmp/the-ten-browser-qa/` (not deployed).
- Authenticated learner reads against the connected database and multi-device behavior were not exercised. Synthetic component checks do not establish production data integration.

## Missing visual assets

No approved artwork exists in this branch or was supplied separately during this run. All unavailable manifest entries are now `null` instead of pointing to nonexistent files.

See `THE_TEN_ASSET_CHECKLIST.md`: brand lockup; Baghdad/Nexus world art; four neutral portraits; nine additional reactions per character; decorative and medical-system exports. Missing character paths can also be enumerated via `missingCharacterAssets` in `src/lib/the-ten/assets.ts`.

## Next recommended slice

1. Stage independently supplied approved artwork, verify its provenance, and update manifest paths only after files exist.
2. Supply the published formative case content/feedback contract and connect it to `CaseExperience`; authoritative feedback and completion must remain outside the UI.
3. Supply the authoritative certificate requirements/eligibility/issued-certificate contract, then replace the explicit unavailable state with a linked checklist and view/download action.
4. Run authenticated integration QA for active and completed learner memberships, multiple-response scoring, released results, case delivery, and certificate states.

## Changed file inventory

- Routes: `src/app/learner/page.tsx`, `orientation/page.tsx`, `sessions/page.tsx`, `sessions/[sessionId]/page.tsx`, `assessments/page.tsx`, `progress/page.tsx`, `results/[attemptId]/page.tsx`, `certificate/page.tsx`, `loading.tsx`, and `error.tsx` (all under `src/app/learner/`).
- Existing route/navigation integration: `src/app/assessments/[assessmentId]/take/page.tsx`, `src/app/assessments/[assessmentId]/take/actions.ts`, `src/app/dashboard/page.tsx`, `src/components/app-shell.tsx`.
- New components under `src/components/the-ten/`: `learner-shell.tsx`, `journey-overview.tsx`, `world/baghdad-world.tsx`, `case/case-experience.tsx`, `case/case-progress-tracker.tsx`, `case/formative-question.tsx`.
- Updated components under `src/components/the-ten/`: `answer-option.tsx`, `assessment-experience.tsx`, `case-card.tsx`, `character-guide.tsx`, `progress-tracker.tsx`, and `index.ts`.
- Presentation/data modules under `src/lib/the-ten/`: `journey.ts`, `learner-data.ts`, `case-flow.ts`, `feedback.ts`, `motion.ts`, and `assets.ts`; formal response normalization lives in `src/lib/assessment/submission.ts`.
- Styling: `src/app/globals.css`. The generated `next-env.d.ts` import changes were excluded from the commit.
- CI: `.github/workflows/quality.yml` now uses build-only Supabase placeholders and runs the learner state tests.
- Regression checks and documentation: `scripts/test-the-ten.mjs`, `src/components/the-ten/README.md`, `docs/THE_TEN_ASSET_CHECKLIST.md`, and this status document.


## Remote review audit (2026-09-08)

- Reviewed each changed/untracked file and the complete prospective diff against fetched `origin/main`, including the earlier component-system commits already on PR #3.
- No changes to SQL/schema, Supabase clients, auth/session helpers, scoring triggers, or grading/AI services. The assessment submission action now supports validated `multiple_response` payloads while preserving its auth, attempt-status, delivery-RPC, upsert, and final-lock authority checks.
- Credential-pattern and file-type checks found no secrets, environment files, screenshots, generated build artifacts, temporary test output, or unrelated local files in the intended change set. CI project-specific public configuration was replaced with build-only placeholders.
- `next-env.d.ts` was returned to its tracked contents after validation. `.env.local`, `.next`, dependency directories, browser fixtures, and screenshots remain local and unstaged.
- PR #3 is open with base `main` and head `codex/the-ten-interaction-system`. Publishing this commit updates that existing PR; no duplicate PR or merge is required.
- Safety stash identity remains `7f41c60a9efdee77be5fe874d0d14a6da5f4a210` with its original name and position. No stash mutation is part of this review.
- Remaining fallbacks and the next recommended phase are unchanged: approved art staging, authoritative case-feed/feedback integration, authoritative certificate requirements/eligibility/issued records, then authenticated integration QA.

## PR #3 review findings resolved (2026-09-08)

- Completed learner memberships now retain historical journey access, matching the existing RLS definition of cohort membership. Current-mission and open-checkpoint presentation remains restricted to active memberships.
- Formal `multiple_response` delivery now uses accessible checkboxes, preserves all selected IDs in client state and FormData, validates IDs against delivered options before any response write, and stores them in `selected_option_ids` with incompatible fields cleared.
- Formative feedback has a single live announcement owner.
- Formal assessment locking requires an explicit confirmation that names answered and unanswered counts and lists unanswered question numbers.
- No artwork was staged while addressing the review. Existing `null` asset entries and text fallbacks remain unchanged.
