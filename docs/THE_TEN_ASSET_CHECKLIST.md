# THE TEN Asset Staging Checklist

The implementation does not redraw or approximate the approved character identities in code. Production artwork is staged only from approved source material; missing character reactions continue to fall back to the approved neutral portrait.

## Brand
- [x] `public/the-ten/brand/the-ten-baghdad-nexus.png`
- [x] `public/the-ten/brand/the-ten-baghdad-nexus-crest.png`

## World
- [x] `public/the-ten/world/baghdad.png`
- [x] `public/the-ten/world/nexus.png`

## Characters — required neutral poses
- [x] `public/the-ten/characters/ibn-sina/neutral.png`
- [x] `public/the-ten/characters/jabir/neutral.png`
- [x] `public/the-ten/characters/hippocrates/neutral.png`
- [x] `public/the-ten/characters/al-razi/neutral.png`

## Approved source-sheet exports now used in production
The source sheets remain reference material; only isolated sprite atlases derived from their approved artwork are shipped.

- [x] `public/the-ten/art/mission-systems.webp`
  - Neurology → M01
  - Cardiovascular → M02
  - Respiratory → M03
  - Infectious disease → M04
- [x] `public/the-ten/art/decor-world-a.webp`
  - lantern
  - astrolabe
  - palm
- [x] `public/the-ten/art/decor-world-b.webp`
  - Baghdad arch
  - waves
  - geometric star
- [x] semantic sprite rendering through `src/components/the-ten/art-sprite.tsx`

These assets are used as supplemental visual language on Baghdad, live Missions, My Codex, Completion, and the Facilitator Control Room. They are not used as rasterized UI screenshots and do not replace accessible text.

## Recommended reaction pose set for each character
Do not create these with CSS/SVG approximations. Add identity-locked approved transparent PNG/WebP assets only.

- [ ] `introduce`
- [ ] `guide`
- [ ] `thinking`
- [ ] `hint`
- [ ] `correct`
- [ ] `incorrect`
- [ ] `partial`
- [ ] `celebrate`
- [ ] `locked`

Example:
`public/the-ten/characters/ibn-sina/correct.png`

After a pose is approved and physically staged, update `src/lib/the-ten/assets.ts` from `null` to the corresponding path. Until then, `getCharacterAsset()` must resolve safely to that character's neutral portrait.

## Rules
- preserve transparent backgrounds where intended
- preserve face, hair, clothing palette, proportions, outline and rendering language for every character
- do not recolor, mirror or geometrically fake a character pose
- do not ship the full reference website/case-component screenshots as production UI
- keep decorative art non-interactive and `aria-hidden`
- keep medical-system visuals supplemental; interaction meaning remains available as text
- optimize raster assets without visible identity/style degradation
- use `next/image` for standalone raster display where practical
- sprite atlases may use CSS background positioning only for isolated non-character art

## Current staging status — 2026-09-09

Stage 1 brand/world/neutral-character assets are staged from the approved Drive mapping documented in `THE_TEN_DRIVE_ASSET_MAP.md`. Reference compositions are excluded from `public/`.

The visual integration now includes:
- Baghdad as the learner world's primary narrative illustration
- Nexus as entry/progression/completion landmark
- four neutral character identities at Signal locations and mission surfaces
- mission-system iconography and Baghdad decorative motifs derived from the approved source sheets
- illustrated live-mission overlays and Baghdad atmosphere
- visual Signal records in My Codex
- Nexus-based Facilitator Control Room and Completion pathway

Remaining art dependency: the nine identity-locked reaction poses per character. Their absence is explicit and safe; no production request points to a missing reaction file because neutral fallback remains authoritative.

The previous branch safety stash remains untouched and is not a source of production artwork.
