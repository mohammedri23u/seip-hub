# THE TEN Asset Staging Checklist

The implementation intentionally does not fabricate or redraw approved artwork. Before `CharacterGuide` or world artwork is enabled on production learner screens, stage the approved files under the paths below.

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

## Recommended reaction pose set for each character
Do not create these in code. Add approved transparent PNG/WebP assets only.
- `introduce`
- `guide`
- `thinking`
- `hint`
- `correct`
- `incorrect`
- `partial`
- `celebrate`
- `locked`

Example:
`public/the-ten/characters/ibn-sina/correct.png`

After a pose is added, update `src/lib/the-ten/assets.ts` from `null` to the corresponding path.

## UI decorative kit
Stage approved exported elements in:
- `public/the-ten/decor/`
- `public/the-ten/icons/`

Use semantic filenames (for example `nexus-spark.png`, `baghdad-arch.png`, `medical-bag.png`) rather than source screenshot names.

## Rules
- preserve transparent backgrounds where intended
- do not crop facial/body details from the approved character source
- do not recolor characters
- do not mirror a pose unless explicitly approved
- optimize large PNGs before production while visually comparing against the master asset
- use `next/image` for raster display

## 2026-09-08 staging status

Stage 1 is staged from the eight production-candidate Drive IDs documented in `THE_TEN_DRIVE_ASSET_MAP.md`. Every file is a verified PNG at the mapped semantic path. The package's `references/` directory is excluded from `public/` and the reference compositions are not part of the production bundle. The previous branch's safety stash was not used or modified.

The learner shell uses the clean lockup. Learner home uses Baghdad as its LCP narrative illustration and Nexus as a smaller progression focal element while preserving accessible text navigation. `CharacterGuide` uses all four neutral portraits; every missing reaction continues to fall back to that character's neutral image.

`missingCharacterAssets` now lists only the nine unavailable reaction filenames for each identity. Decorative/vector exports and medical-system icon exports also remain unavailable; do not crop them from the reference sheets.
