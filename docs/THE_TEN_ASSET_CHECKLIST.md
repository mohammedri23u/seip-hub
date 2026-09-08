# THE TEN Asset Staging Checklist

The implementation intentionally does not fabricate or redraw approved artwork. Before `CharacterGuide` or world artwork is enabled on production learner screens, stage the approved files under the paths below.

## Brand
- `public/the-ten/brand/the-ten-baghdad-nexus.png`

## World
- `public/the-ten/world/baghdad.png`
- `public/the-ten/world/nexus.png`

## Characters — required neutral poses
- `public/the-ten/characters/ibn-sina/neutral.png`
- `public/the-ten/characters/jabir/neutral.png`
- `public/the-ten/characters/hippocrates/neutral.png`
- `public/the-ten/characters/al-razi/neutral.png`

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

No approved image files are available in the current branch. `assets.ts` therefore uses `null` for the brand/world paths and all character poses. The previous branch's safety stash has not been used as an asset source.

The learner world renders accessible text navigation while world art is absent. Character guidance renders the character name and message while neutral art is absent; a missing reaction falls back to neutral only after an approved neutral file has been staged. There is no fabricated placeholder character and no request to a nonexistent image.

`missingCharacterAssets` lists the exact expected neutral/reaction filenames for all four identities. Stage the files above, then change only the matching manifest entries.
