# THE TEN — Drive Asset Map

This file maps the approved visual references in the project Google Drive folder to deterministic production roles and filenames.

Source folder: `الهوية` — Google Drive folder ID `1y8XHe6G0mMD-qLAKQELAILOGYTMF_-BG`.

## Classification rule

There are two asset classes:

1. **Production candidate** — may be staged directly as an approved visual asset after local download/verification.
2. **Reference only** — a composed mockup/sheet used to guide layout, proportions, states, and visual language. Do not ship it as a UI background and do not crop UI elements from it unless an explicit exported asset is supplied.

## Production candidates

| Drive file | Drive ID | Role | Production path |
| --- | --- | --- | --- |
| `ChatGPT Image Sep 8, 2026, 07_40_09 AM.png` | `1ziCeiHq_JQCGQyedDVQqIEo3jSj9JEU9` | Clean THE TEN — BAGHDAD NEXUS wordmark | `public/the-ten/brand/the-ten-baghdad-nexus.png` |
| `ChatGPT Image Sep 8, 2026, 07_40_12 AM.png` | `1peAs7W61KxN9vvMDtkapHP_4lMorUvKy` | Decorative/crest logo variant | `public/the-ten/brand/the-ten-baghdad-nexus-crest.png` |
| `ChatGPT Image Sep 8, 2026, 07_40_15 AM.png` | `16Rhe8QvM6gP1hIXwXbZfbyLgZwYSGZ-D` | The Nexus / central world artwork | `public/the-ten/world/nexus.png` |
| `ChatGPT Image Sep 8, 2026, 07_40_21 AM.png` | `1IiqYtRgS8cTblm2ekiWMFfujHGJbhYDb` | Baghdad city/world artwork | `public/the-ten/world/baghdad.png` |
| `ChatGPT Image Sep 8, 2026, 07_40_24 AM.png` | `1I4UpoPChPqpaEZVyOddyC3-zVicsEb1G` | Jabir ibn Hayyan approved neutral portrait | `public/the-ten/characters/jabir/neutral.png` |
| `ChatGPT Image Sep 8, 2026, 07_40_28 AM (1).png` | `1Ds-zISGnCtwFXF_XE5XZDbNXWX3LaxwL` | Hippocrates approved neutral portrait | `public/the-ten/characters/hippocrates/neutral.png` |
| `ChatGPT Image Sep 8, 2026, 07_41_19 AM.png` | `19Pfxw3AunSntHzNxefCQfvoEMX7_cwnL` | Ibn Sina approved neutral portrait | `public/the-ten/characters/ibn-sina/neutral.png` |
| `ChatGPT Image Sep 8, 2026, 07_41_23 AM.png` | `1iUHYwZ0_zaj7KxO1tBIwwgUwZetRAWwu` | Al-Razi approved neutral portrait | `public/the-ten/characters/al-razi/neutral.png` |

## Source sheet requiring exported elements

| Drive file | Drive ID | Role | Handling |
| --- | --- | --- | --- |
| `ChatGPT Image Sep 8, 2026, 07_40_06 AM.png` | `1Mt8yxkSy6-a2JSIT39eKHDreYvBBaV9-` | Decorative/vector source sheet | **Reference/source sheet.** Export individual transparent assets before use. Do not ship the full sheet as a page asset. |

Desired semantic exports from this sheet:
- `public/the-ten/decor/lantern.png`
- `public/the-ten/decor/scroll.png`
- `public/the-ten/decor/open-book.png`
- `public/the-ten/decor/quill.png`
- `public/the-ten/decor/leaves.png`
- `public/the-ten/decor/astrolabe.png`
- `public/the-ten/decor/geometric-star.png`
- `public/the-ten/decor/crescent.png`
- `public/the-ten/decor/palm.png`
- `public/the-ten/decor/baghdad-arch.png`
- `public/the-ten/decor/waves.png`

Only export/crop from the approved source if the resulting file is visually clean, isolated, and transparent. Otherwise recreate/export from the original generation source rather than using a visibly cropped screenshot fragment.

## Reference-only files

| Drive file | Drive ID | Role |
| --- | --- | --- |
| `ChatGPT Image Sep 8, 2026, 08_06_36 AM.png` | `1u_pNAx_9oisodI0_BHq2Ts_tStfaJYKj` | Medical Cases UI asset-sheet reference: case badges, difficulty, systems, status, buttons, case card, question card, progress, feedback, resource chips, info panels, widgets, decor. **Do not ship the sheet itself.** |
| `ChatGPT Image Sep 8, 2026, 08_06_49 AM.png` | `1RVeNuCM1BLOIWyhPb9jfTEr3Ggg47leZ` | Full THE TEN website composition/reference. Use for layout rhythm, hierarchy, proportions, illustration density, and visual direction. **Do not use this screenshot as a page background.** |

## Character identity lock

The four neutral portrait files above are the canonical visual identity references for their characters.

Do not:
- redraw their faces in CSS/SVG
- recolor their clothing
- mirror them without explicit approval
- alter proportions
- substitute a different character illustration
- derive pose art from the website mockup thumbnails

New reaction poses must be separate approved image files created from the corresponding canonical neutral character identity and then staged into the manifest.

Expected reaction paths per character:
- `introduce.png`
- `guide.png`
- `thinking.png`
- `hint.png`
- `correct.png`
- `incorrect.png`
- `partial.png`
- `celebrate.png`
- `locked.png`

Until a reaction file exists, `CharacterGuide` must fall back to the approved neutral pose.

## Medical UI sheet → coded component mapping

The 08:06:36 asset sheet is a **visual specification**, not a raster component library. Implement its language with reusable coded components:

- Case Type Badges → `CaseTypeBadge`
- Difficulty Badges → `DifficultyBadge`
- System Icons → `SystemBadge/SystemIcon`
- Status Tags → `StatusBadge`
- Action Buttons → `TheTenButton`
- Case Card → `CaseCard`
- Multiple-choice Question Card → `QuestionCard` + `AnswerOption`
- Case Progress Tracker → `CaseProgressTracker`
- Feedback States → `FeedbackPanel`
- Resource Chips → `ResourceChip`
- Info Panels → `InfoPanel`
- Timer / score / tabs / notification → small reusable widgets

Do not embed text rendered inside the screenshot into production UI.

## World integration guidance

### Learner home
- Use `baghdad.png` as the primary narrative/world illustration.
- Use `nexus.png` as a focal unlock/progression element, not as a full-screen wallpaper.
- Keep the accessible text/card navigation already implemented in parallel.
- Allow restrained CSS effects around the image: glow, ring, opacity, slight translation/parallax. Do not distort the artwork itself.

### Performance
- Stage original approved PNGs first.
- After visual comparison, optionally create optimized WebP/AVIF derivatives while retaining the canonical PNG source outside the build or in design storage.
- Use `next/image`.
- Preload only the actual learner-home LCP image.
- Lazy-load portraits and secondary world art.

## Staging sequence for Codex

1. Download the eight production-candidate images from Drive using the IDs above.
2. Place them at the exact semantic paths listed in this document.
3. Do not rename or stage the two reference-only compositions as production assets.
4. Update `src/lib/the-ten/assets.ts` only after each file physically exists.
5. Enable neutral character imagery first.
6. Integrate Baghdad and Nexus into learner home while keeping text fallback behavior.
7. Add the clean brand lockup to learner shell/header.
8. Run typecheck/build/browser QA, including missing-image network checks.
9. Commit and push to the existing PR #3 branch.

Do not add generated reaction poses to the repository until they are separately reviewed and approved.