# Codex Handoff — THE TEN Interactive Learner Experience

Use this repository branch as the source of truth. Read `AGENTS.md`, `docs/THE_TEN_UI_INTERACTION_BLUEPRINT.md`, `docs/THE_TEN_ASSET_CHECKLIST.md`, and `docs/THE_TEN_IMPLEMENTATION_STATUS.md` before changing learner-facing UI.

## Immediate task
Continue from the implemented THE TEN component system and complete the learner-facing journey without changing backend authority or inventing artwork.

### Phase 1 — validate current slice
- inspect the new files under `src/components/the-ten/`
- run `npm ci`
- run `npm run typecheck`
- run `npm run build`
- fix any issues while preserving semantics

### Phase 2 — stage approved art
When approved assets are supplied locally, place them under `public/the-ten/` according to `docs/THE_TEN_ASSET_CHECKLIST.md`.
- do not redraw characters
- do not synthesize missing poses in SVG/CSS
- update `src/lib/the-ten/assets.ts` only after the matching approved file exists

### Phase 3 — learner journey shell
Implement a learner-first home/journey experience using actual backend data available in the repo.
- next action / current mission
- overall progression
- available sessions/cases
- locked sessions with reason
- completed sessions
- assessments/checkpoints
- certificate eligibility summary when authoritative data exists

Use the Baghdad/Nexus art as narrative navigation after approved files are staged, while keeping conventional accessible navigation alongside it.

### Phase 4 — formative case engine
Build reusable case flow components for:
Intro → History → Examination → Investigations → Management → Summary

Support authoritative states:
- idle
- selected
- submitting
- correct
- incorrect
- partial
- completed
- locked

Connect `FeedbackPanel` and `CharacterGuide` only to feedback/correctness provided by the backend or explicit case data. Never infer protected assessment correctness.

### Phase 5 — reactions and motion
Use the character reaction API:
neutral / introduce / guide / thinking / hint / correct / incorrect / partial / celebrate / locked

For missing reaction assets, use neutral fallback and report the missing pose filename.

Keep motion restrained:
- 120 ms instant feedback
- ~190 ms controls
- ~280 ms panels
- ~380 ms section transitions
- <=650 ms celebration
- no infinite decorative loops
- honor reduced motion

### Phase 6 — completion
Implement completion and certificate unlock only from authoritative backend completion state.

Run typecheck and build after each meaningful slice. Do not modify Supabase schema or grading logic simply to make visuals easier.

## Required report after each Codex run
Return:
1. changed files
2. UX states implemented
3. backend/data contracts preserved
4. typecheck/build result
5. missing visual assets
6. next recommended slice
