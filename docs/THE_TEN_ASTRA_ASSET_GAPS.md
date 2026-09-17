# Art requests / asset gaps — Experience V1

No new illustration was fabricated. All four identities and the authored character pixels remain unchanged. Full-body scenes use `object-contain`; selection moves composition and opacity, never hue, saturation, face or body shape.

## Verified sources

Sampled HTTP 200 production runtime WebPs:

| Source | Dimensions | Source bytes | Alpha |
| --- | --- | --- | --- |
| Baghdad hero | 1672 × 941 | 353,974 | No |
| Baghdad blue-hour reveal | 1672 × 941 | 360,660 | No |
| Guide Selection Hall | 1672 × 941 | 413,338 | No |
| Nexus dormant | 1672 × 941 | 335,752 | No |
| Signal Activation environment | 1672 × 941 | 240,066 | No |
| Ibn Sina introduce | 1024 × 1536 | 235,638 | Yes |

The integrated library contains 30 production paths. The full asset availability check and dimensions are in the QA evidence. Production derivatives are documented by the earlier integration as quality 92; original masters were not available locally and were not re-exported.

`next/image` now permits quality 90 for the primary illustration surfaces. This reduces additional recompression relative to the default 75, but does not create source detail. Mobile `sizes` accounts for the width required by a tall `object-cover` crop, rather than sending a 320px-wide landscape file to fill a 720px-tall scene. Below-fold scenes remain lazy-loaded. Only the current hero/mechanism uses preload; the activation destination loads eagerly for its local transition.

## Optional authored replacements

These are future quality improvements, not invented substitutes or dependencies on nonexistent URLs:

| Requested filename | Purpose / dimensions | Background | Scene behavior |
| --- | --- | --- | --- |
| `WORLD_BAGHDAD_HERO_MASTER_3840.png` | Same approved composition; 3840 × 2160 or higher | Opaque | Crisp full-width city on 1440px+ high-DPI displays; preserve all architectural details and identity |
| `WORLD_BAGHDAD_BLUE_HOUR_MASTER_3840.png` | Same approved night composition; 3840 × 2160 | Opaque | Arrival focal shift; no added UI copy |
| `GUIDE_SELECTION_HALL_MASTER_3840.png` | Same empty hall; 3840 × 2160 | Opaque | Larger screens retain clean linework; character assets remain separate |
| `WORLD_BAGHDAD_MOBILE_1080x1920.png` | Authored vertical reframing of the approved city; 1080 × 1920 | Opaque | Preserve river, scholar’s threshold and Nexus relationship on narrow phones |
| `GUIDE_HALL_MOBILE_1080x1440.png` | Authored vertical hall composition; 1080 × 1440 | Opaque | Leave central space for one full-body Guide and native copy below |
| `WORLD_BAGHDAD_FOREGROUND_LAYER.png` | Exact aligned layer from the approved master; 3840 × 2160 | Transparent | Optional true foreground depth; currently no cut-out or fabricated parallax layer |
| `NEXUS_STATE_0_TO_4_MASTER_3840_[STATE].png` | Five matching high-resolution state masters; 3840 × 2160 each | Opaque | Crossfade the same authored camera and geometry at higher DPI |

Correct/incorrect/partial/hint pose entries intentionally remain null in `assets.ts`, with neutral fallback. They are not requested for answer feedback. CELEBRATE is used only after server-recorded progression.

No sound, video, new characters, fake manuscript writing, or diagnostic clues are embedded in art.
