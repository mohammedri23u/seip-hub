# THE TEN — BAGHDAD NEXUS
## Production Art Integration QA — 2026-09-16

Branch: `codex/the-ten-interaction-system`
PR: #3 (Draft)

## Scope
Integrated the approved Production Asset Library into the existing Experience Layer without changing assessment, grading, Supabase authorization, realtime topics, or current academic mission content.

## Integrated authored assets
- Baghdad: hero + blue-hour hidden-Nexus reveal.
- Nexus: five deterministic First Activation states (0–4).
- Story environments: Guide Selection Hall, Chronicler Desk, Signal Activation background.
- Guides: `introduce`, `guide`, `thinking`, `celebrate`, and `locked` for Ibn Sina, Al-Razi, Jabir ibn Hayyan, and Hippocrates.
- Existing neutral portraits remain fallback assets.
- Runtime derivatives are high-quality WebP (quality 92) served from the public Supabase Storage bucket `the-ten-assets/runtime-v1`; original PNG masters remain outside the runtime bundle.
- `hint`, `correct`, `incorrect`, and `partial` remain intentionally unset so Guide art is not used as correctness feedback.
- Al-Razi `INTRO` and `GUIDE` intentionally use the same approved raster at the user's request.

## Runtime integration
- 30 production WebP derivatives are stored under the versioned `runtime-v1/` prefix; public retrieval is enabled while anonymous upload permission is not retained.
- Arrival maps Baghdad/Nexus/Chronicler/Guardian scenes to authored art.
- Guide Selection composites transparent character layers over the authored empty hall.
- Living Baghdad uses the new Baghdad hero and authoritative progression.
- Nexus landmark resolves state 0–4 from authoritative completed-Signal progress.
- Live Mission mentor art uses contextual authored reactions.
- Signal Activation uses the authored dormant Signal environment and transitions to the authoritative Nexus state reached by the learner.
- Character images use `object-contain` where full-body transparent art must remain intact.

## Content boundary
Asset selection is not keyed to SAH, NSTEMI, PE, sepsis, answer text, question count, or current response formats. Mission presentation remains driven by runtime/config data.

## Verification
- `npm ci`: PASS, 0 vulnerabilities.
- `npm run typecheck`: PASS.
- `node --experimental-strip-types scripts/test-the-ten.mjs`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- No browser executable or Playwright installation was available in the execution environment, so authenticated rendered-device/E2E visual QA is not claimed.

## Remaining approval gate
Keep PR #3 Draft until authenticated browser walkthrough and final visual approval are complete.
