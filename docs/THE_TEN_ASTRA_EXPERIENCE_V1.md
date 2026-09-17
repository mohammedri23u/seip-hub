# THE TEN — Experience V1 overhaul

## Audit and implementation brief

Starting revision: `9277e696abbf1a270726c9eee7724dc24f5d47e8`. The original local checkout was behind the remote baseline; only the requested overhaul branch was fast-forwarded. Baseline and main stay unchanged.

Inspected learner entry/gates, story player, Guide selection, world, mission phases, supplemental tools, Codex, formal assessment shell, image manifest, authoring contracts, story RPC validation and existing regression suite. Protected screens are inspected using explicitly synthetic local fixtures; this does not establish authenticated end-to-end behavior.

Observed before implementation:
- Login: navy/slate generic form disconnected from the illustrated world.
- Arrival: logo/header, full-width oversized copy and identical Next/Previous structure dominate each scene. Story and setting compete for the same space.
- Guide hall: large glass header, boxed stage, boxed biography, boxed ability and boxed confirmation obscure architecture. At 1440px the hall is fragmented into separate panels.
- World source: large overlay, decorative sprites, fixed four-slot map, portrait medallions, and a second repeated mission grid. Completed mission without a retained run misleadingly uses the locked-message fallback.
- Reasoning fixture: stacked Guardian, personal Guide, clinical card and dark answer card delay the dominant task. Background blooms and repeated borders add visual weight.
- Activation source: separate framed Nexus thumbnail obscures the authored mechanism; no staged environment-to-Nexus transition; async callback not awaited inside transition.
- Image sources: sampled production scenes 1672×941; Guide 1024×1536 with alpha. Current Next/Image default quality recompresses quality-92 WebP sources. Whole-scene cover on tall screens needs deliberate focal placement. Full-body Guide assets must use contain.
- Accessibility source: story heading focus plus whole-scene aria-live duplicates narration; form pending states missing; ability title referenced while absent; small selection controls and footer overflow need mobile checks.

Direction: architectural scene composition, editorial native copy, shared controls and motion, line-based Signal register, semantic mission directory, quiet manuscript reasoning. No new illustration, motion package, backend schema, academic content, authorization or assessment changes.

## Verification

Results and limitations are recorded after implementation below.

## Implemented experience

1. Arrival: quiet opening, daylight Baghdad, blue-hour hidden-world reveal, dormant Nexus, Signals, fracture, Guardians, Chronicler and invitation. Existing persisted scene IDs are retained. A short exit/entry transition follows learner input; no timed progression. Scene position writes are serialized and completion waits for queued writes.
2. Guide hall: unboxed architecture and full-body authored figures; selected Guide has more compositional space. Mobile shows the focused Guide above four native text choices. Ability disclosure and bond submission have explicit states. No correctness cues.
3. Baghdad: full-width scholar’s view, visible named Signal locations and an accessible text directory. A single selected dossier replaces the repeated card grid. Recorded completion drives the Signal register and authored Nexus state. Closed locations are noninteractive; their reasons can be read in the directory. Completed records without an available historical run point to Codex rather than claiming they are locked.
4. Mission entry: reusable data-driven prelude. Mission Guardian is supplied separately from personal Guide. Future/unknown Guardians render without invented character art.
5. Reasoning: quiet clinical typography, one dominant response surface, stage sequence and a subordinate Guide margin. On mobile the clinical task is first. Learner inputs reset by stage/round key; controls freeze during submission. Server-returned responses remain inspectable during lock, discussion and reveal.
6. Reveal/debrief: evidence anchor, explanation and reasoning hierarchy, with optional room distribution. No client inference of correctness. Existing facilitator controls and commands are preserved.
7. Activation: authored mechanism, finite 700ms native geometry path, then crossfade to the authoritative Nexus state. Controls stay available throughout. CELEBRATE is tied to earned progression only. Awaited completion and recoverable error presentation.
8. Epilogue: current recorded Nexus level followed by daylight Baghdad; successful epilogue completion returns to `/learner`.
9. Entry/loading: illustrated Baghdad login with unchanged server action and form field contract, pending submit button, branded static loading geometry and status text.

## Shared implementation

- `src/app/experience.css`: scoped scene, hall, world, manuscript, activation and entry tokens/compositions.
- `experience/signal-register.tsx`: noninteractive text-accessible Signal state geometry.
- `experience/pending-button.tsx`: `useFormStatus` for existing native server-action forms.
- `experience/mission-reading.tsx`: stage sequence, released evidence, reveal hierarchy.
- Story/Guide/world components refactored around these patterns; obsolete mission wallpaper/visual overlay unmounted.
- No new runtime dependencies or generated art. Default Next.js development guidance was added automatically to `AGENTS.md` by `next dev`.

## Motion, accessibility and performance decisions

CSS controls 190ms, panel 280ms, scene 420ms, exit 120ms; activation path 700ms. One finite, low-amplitude 14s environmental focal shift is allowed on authored city story beats. No ambient motion in Reasoning, no permanent particle field, and no animation-driven unlocks. Reduced motion removes animation/transition and preserves final state information.

Native links, buttons, forms, details and headings remain. Story focus moves to the new heading, replacing duplicate whole-scene aria-live narration. Mission phase has one concise live announcement. Named controls and text distinguish restored/open/closed states; focus uses a high-contrast brass outline. Mobile safe areas and content wrapping are explicit. New entry surfaces use minimum 44–52px controls.

System Georgia/Arial avoids new font downloads. Only the currently contextual character poses load. Existing `next/image` optimization and restrictive remote-host configuration remain, with a quality-90 allowlist entry. No library, WebGL or canvas was introduced. See the separate asset-gaps document for source-resolution limits.

Official implementation references checked: [Next.js Image](https://nextjs.org/docs/app/api-reference/components/image), [React useTransition](https://react.dev/reference/react/useTransition), plus the installed Next.js 16.3.4 image and form guides.

## Rendered verification and limits

Browser: Chromium via the `agent-browser` skill. `npm run dev` was opened and verified before the rendered review. Protected learner components use a local synthetic fixture route, with REST/auth traffic blocked in the review browser. The helper route is ignored by git, guarded against production rendering, and removed before the final build. No live assessment response, Guide bond or learner progress was written by QA.

| Step | Surface / state | Result |
| --- | --- | --- |
| 1 | Arrival | Nine beats exercised at 390px normal motion and 320px reduced motion; heading focus and final transition checked |
| 2 | Guide Selection | All four Guides selected, ability previews opened, synthetic bond form submitted; tablet composition corrected to one dominant full-body figure |
| 3 | Living Baghdad | 320 / 390 / 768 / 1440 layouts checked; locked path has no mission link; completed path without a run retains Codex access |
| 4 | Mission prelude | Rendered at all four widths; independent Guardian / personal Guide contract covered in regression tests |
| 5 | Reasoning / locked | Rendered at all four widths; answer + confidence + justification enables submit; blocked save preserves the choice and permits retry; recorded response remains available |
| 6 | Reveal | Rendered at all four widths; explanatory hierarchy visible, no correctness celebration |
| 7 | Signal Activation | Rendered at all four widths; reduced-motion final state, zero running animations, and epilogue transition checked |
| 8 | Epilogue | Rendered at all four widths; uses supplied Nexus state; return-to-world callback only after saved story completion |
| 9 | Login | Real route rendered at all four widths; native required-field validation, visible keyboard focus, error presentation checked |

The automated layout matrix records 36 fixture screen/width combinations, plus four real login layouts: zero horizontal overflow, zero broken images, zero Next.js error overlays. The fixture matrix also checks visible links/buttons/summaries against a 40px minimum target-height detector (designed controls are 44–52px+). All 30 production asset URLs returned HTTP 200. The interaction suite records 27 checks, including complete story progression, Guide selection, locked paths, failed submission preservation and reduced motion.

The initial unloaded world screenshot was rejected and recaptured after its images completed. Final screenshots wait for image decoding/completion and short transition settling. Representative captured evidence is under `docs/qa/astra-v1/`; raw local captures and machine-readable results are in `/tmp/ten-qa/` for this session.

Limits: this is rendered component/interaction QA, not an authenticated cohort E2E test. Real multi-user facilitator sequencing, login with supplied credentials, production RLS, screen-reader speech output, physical-device touch behavior and field Core Web Vitals have not been exercised. Existing backend/security contract regression checks pass, but do not replace a live authenticated review. No Lighthouse score or production performance number is claimed.

## Review harness

- `node scripts/qa/review-ui.mjs` materializes a temporary `/ten-ui-review` development-only route.
- Start `npm run dev`, then run `scripts/qa/capture-ui.mjs`, `exercise-ui.mjs`, or `check-entry.mjs` with `TEN_BROWSER` pointing to an installed agent-browser binary.
- The scripts block REST/auth browser requests before interacting with synthetic data. They never grant a real user progress.
- `node scripts/qa/review-ui.mjs --clean` removes the temporary route before a build or deployment.

### Captured examples

WebP copies of the original browser screenshots (the exact PNG captures remain in `/tmp/ten-qa/`):

- [Arrival / blue-hour reveal](qa/astra-v1/story-normal-2.webp)
- [Guide hall / desktop](qa/astra-v1/guide-1440.webp) and [tablet](qa/astra-v1/guide-768.webp)
- [Living Baghdad](qa/astra-v1/world-1440.webp)
- [Quiet reasoning / mobile](qa/astra-v1/reasoning-390.webp)
- [Reveal](qa/astra-v1/reveal-1440.webp)
- [Signal Activation / mobile](qa/astra-v1/activation-320.webp)
- [Epilogue / mobile](qa/astra-v1/epilogue-390.webp)
- [Login](qa/astra-v1/login-1440.webp)

Machine-readable evidence: [layout matrix](qa/astra-v1/matrix.json), [interactions](qa/astra-v1/interactions.json), [entry checks](qa/astra-v1/entry.json), [production assets](qa/astra-v1/assets.json).

## Required verification

All commands actually ran successfully on this branch:

| Command | Result |
| --- | --- |
| `npm ci` | PASS; 59 packages installed, zero reported vulnerabilities |
| `npm run typecheck` | PASS, including after the final production build |
| `node --experimental-strip-types scripts/test-the-ten.mjs` | PASS; existing Node module-type warning only |
| `npm run build` | PASS; production routes generated, temporary fixture route absent |
| `git diff --check` | PASS |

A production-server smoke check also passed: login rendered, anonymous learner navigation reached login in the browser, and the removed fixture route returned 404.

No implementation/build blocker remains. Authenticated cohort acceptance still needs real test credentials and a facilitator; source artwork resolution and missing authored reaction poses are documented separately. No backend, authentication action, assessment action, migration, RLS policy, or academic content file was changed.

## Branch and review delivery

Implementation lives only on `codex/astra-the-ten-ui-overhaul-v1`, based on `9277e696abbf1a270726c9eee7724dc24f5d47e8`. The baseline and main branches remain untouched. Delivery uses a draft pull request targeting `codex/the-ten-interaction-system`; no merge or production release is part of this work. The final delivery message records the exact HEAD and available Preview status, which cannot be embedded in its own commit without changing that SHA.
