# THE TEN — Experience Layer QA Addendum

Date: 2026-09-10

Branch: `codex/the-ten-interaction-system`

PR: #3 (Draft)

## Implemented scope

- typed, content-agnostic Story, Guide, world-state and motion contracts
- shared learner-paced Story Player with keyboard navigation, first-view recording, resume and replay support
- normalized Arrival using the shared Story Player
- persistent selected-Guide presence in Living Baghdad
- deterministic `SYNTHESIZE`, `CHALLENGE`, `TEST` and `OBSERVE` workspaces inside Live Mission
- one idempotent, server-recorded Guide invocation per learner/run; private workspace text is not persisted
- five visible Baghdad world states derived from authoritative completed Signal data
- configurable mission Prelude and Epilogue factories using runtime metadata rather than clinical answers
- one-time Signal Activation keyed by Signal and gated by authoritative `ten_codex` eligibility
- Story/Activation isolation from the supplemental mission overlays and tools

## Database verification

Applied `20260910023000_ten_experience_story_and_guide_state.sql` to the linked SEIP Hub Supabase project.

Verified remotely:
- `story_progress jsonb not null default '{}'`
- `guide_uses jsonb not null default '{}'`
- object-shape constraints exist
- `ten_experience_state()` exposes story, Guide-use, earned-run and distinct earned-Signal state
- `ten_experience_command()` contains Signal-level activation idempotency
- `anon` cannot execute the command RPC; `authenticated` can
- an authenticated-context probe for a non-enrolled UUID returned only `{ "enrolled": false }`

No learner rows, mission responses, attempts, sessions, migrations or unrelated data were deleted or rewritten.

## Required quality gate

Executed from the branch worktree after implementation:

- `npm ci` — passed; 58 packages installed, 59 audited, 0 vulnerabilities
- `npm run typecheck` — passed
- `node --experimental-strip-types scripts/test-the-ten.mjs` — passed; the existing package-module warning remains non-fatal
- `npm run build` — passed with Next.js 16.3.4; all existing routes compiled

The regression script now also checks Experience contracts, world-state levels, Guide scaffold boundaries, story/activation persistence authorization, Signal idempotency, and absence of current case diagnoses from generated mission stories.

## Realtime and leakage review

No Realtime topic or subscription was added. Static verification confirms:
- Live Mission: `ten:<runId>`
- supplemental reasoning tools: `ten-tool:<runId>`

Guide Ability receives only the selected Guide definition and run ID. It does not receive `stage.answer`, `expectedReasoning`, future stages or academic keys. Story factories receive runtime title, mentor, lens and focus only.

## Responsive and accessibility review

Source-level review covers explicit layouts at 320px, 390px, 768px and 1440px:
- bounded widths and no fixed minimum canvas width
- safe-area-aware bottom story controls
- 44–52px primary touch targets
- no drag-only interaction
- semantic buttons and `aria-live` scene/room updates
- programmatic scene-heading focus and keyboard Arrow/Enter navigation
- visible global focus treatment
- `prefers-reduced-motion` disables scene, camera, world-pulse and activation motion

Authenticated browser/device automation was not available in this environment (no browser executable or Playwright installation). These checks are not represented as authenticated E2E or visual-regression evidence. A real 320/390/768/1440 authenticated walkthrough remains required for final visual approval.

## Remaining assets

All identity-locked reaction poses remain intentionally `null` and fall back through `getCharacterAsset()` to the approved neutral portrait. The outstanding pack is: `introduce`, `guide`, `thinking`, `hint`, `correct`, `incorrect`, `partial`, `celebrate`, and `locked` for each of the four Guides.

## Boundaries

- Current SAH/NSTEMI/PE/sepsis content was not hard-coded into the Experience Engine.
- Existing academic content, response types, grading, facilitator commands and completion rules were not rewritten.
- No learner chatbot, generative-AI Guide, Zoom integration, WebGL or new motion dependency was added.
- The safety stash remains untouched.
- PR #3 remains Draft and unmerged pending authenticated visual/device QA and user approval.
