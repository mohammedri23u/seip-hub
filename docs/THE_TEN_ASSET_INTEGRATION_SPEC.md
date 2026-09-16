# THE TEN — BAGHDAD NEXUS
## Production Asset Integration Spec v1

Status: approved production art set prepared in Google Drive; runtime integration target is branch `codex/the-ten-interaction-system`.

## Guardrails
- Do not alter assessment, grading, RLS, realtime, or facilitator contracts.
- Academic mission content remains temporary and must not be hard-coded into the experience layer.
- Do not fabricate missing art.
- All character art is identity-locked.
- Use the approved assets as authored scenes, not as generic card decoration.
- Text remains native HTML; never embed labels into raster art.

## Runtime asset destinations

Production derivatives are stored in the public Supabase Storage bucket `the-ten-assets` under immutable runtime prefix `runtime-v1/`. The manifest in `src/lib/the-ten/assets.ts` is the single runtime source of truth. Existing neutral portraits and legacy decorative sprites remain local repository assets.

### World
- `WORLD_BAGHDAD_HERO.png` -> `runtime-v1/world/baghdad-hero.webp`
- `WORLD_BAGHDAD_BLUE_HOUR_NEXUS_REVEAL.png` -> `runtime-v1/world/baghdad-blue-hour-nexus-reveal.webp`

### First Activation Nexus states
- `NEXUS_STATE_0_DORMANT.png` -> `runtime-v1/world/nexus-state-0-dormant.webp`
- `NEXUS_STATE_1_SIGNAL_1.png` -> `runtime-v1/world/nexus-state-1-signal-1.webp`
- `NEXUS_STATE_2_SIGNAL_2.png` -> `runtime-v1/world/nexus-state-2-signal-2.webp`
- `NEXUS_STATE_3_SIGNAL_3.png` -> `runtime-v1/world/nexus-state-3-signal-3.webp`
- `NEXUS_STATE_4_FIRST_ACTIVATION.png` -> `runtime-v1/world/nexus-state-4-first-activation.webp`

### Story environments
- `GUIDE_SELECTION_HALL_EMPTY.png` -> `runtime-v1/world/guide-selection-hall-empty.webp`
- `CHRONICLER_DESK.png` -> `runtime-v1/world/chronicler-desk.webp`
- `SIGNAL_ACTIVATION_BACKGROUND.png` -> `runtime-v1/world/signal-activation-background.webp`

### Characters
Use the existing canonical runtime keys:
- `ibn-sina`
- `al-razi`
- `jabir`
- `hippocrates`

For each key, the production derivatives live at `runtime-v1/characters/<guide-key>/` with these authored states:
- `introduce.webp`
- `guide.webp`
- `thinking.webp`
- `celebrate.webp`
- `locked.webp`

Keep existing `neutral.png` as a safe fallback. Keep `hint`, `correct`, `incorrect`, and `partial` unset for v1 rather than inventing art.

## Scene mapping

### Arrival
1. Arrival / Baghdad reveal -> `baghdad-blue-hour-nexus-reveal`
2. Beneath the city / Nexus -> `nexus-state-0-dormant`
3. The Ten / Signal concept -> use native HTML progress language over `nexus-state-0-dormant`; do not depend on a raster containing ten countable objects.
4. Fracture -> use restrained CSS fracture/connection-loss treatment over the dormant Nexus or dark atmosphere; do not invent a new raster.
5. Guardians -> use four approved `introduce` character derivatives from Storage.
6. Seeker -> `chronicler-desk` or dormant Nexus depending on authored scene composition; avoid showing a fake player avatar.
7. First Activation invitation -> `nexus-state-0-dormant` with four reachable Signals described in native UI.

### Guide selection
Background: `guide-selection-hall-empty`.
Composite the four `introduce` transparent character derivatives as independent layers. Selection focus may change scale, opacity, saturation, and camera crop only; do not redraw or recolor characters.

### Living Baghdad
Use `baghdad-hero` as the authoritative day/world image.
World progress remains server-authoritative. The four-signal First Activation state is represented through Nexus state imagery and subtle native overlays; do not hard-code current medical diagnoses into world art logic.

### Live Mission Guide presence
- idle/default presence -> `guide`
- reasoning workspace -> `thinking`
- successful Signal activation / meaningful completion -> `celebrate`
- unavailable state -> `locked`
- neutral fallback -> existing `neutral`

Never switch Guide art based on answer correctness in a way that becomes punitive or functions as answer feedback.

### Signal activation
Background: `signal-activation-background`.
Use restrained CSS/SVG energy-path animation only. After authoritative activation succeeds, transition to the correct Nexus state according to completed First Activation Signals:
- 0 -> dormant
- 1 -> state 1
- 2 -> state 2
- 3 -> state 3
- 4 -> First Activation complete

Signal state must be derived from authoritative progression, not local optimistic UI.

### Epilogue
Use the newly reached Nexus state and then Baghdad hero. Guide `celebrate` may appear as a quiet acknowledgement. No confetti or correctness celebration.

## Motion / performance
- Use `next/image`.
- Preload only current hero/LCP and immediate next scene.
- Character derivatives load on demand; do not preload all poses.
- Keep CSS transitions subtle and deterministic.
- Honor `prefers-reduced-motion` by disabling camera drift, pulse, and activation movement while preserving state changes.
- Avoid video, canvas, WebGL, Three.js, or runtime generative AI.

## Mobile behavior
- World scenes use authored object-position rules rather than destructive manual crops.
- Character composites must keep full face/torso visible at 320/390px widths.
- Guide selection must remain usable without relying on the exact illustrated standing zones as hit targets.
- Native controls remain keyboard- and touch-accessible.

## Acceptance checks
- All production paths resolve with no 404s.
- Arrival uses the new authored world/story art.
- Guide Selection uses the empty hall plus independent character layers.
- Character reaction manifest resolves introduce/guide/thinking/celebrate/locked for all four Guides.
- Living Baghdad is driven by authoritative world progress.
- Signal activation moves through 0/1/2/3/4 authored Nexus states.
- No academic case diagnosis, answer, question count, or response format is hard-coded into asset selection.
- `npm run typecheck`, THE TEN regression script, and `npm run build` pass.
- PR stays Draft until authenticated visual QA is complete.
