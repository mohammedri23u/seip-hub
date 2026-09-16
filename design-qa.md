# THE TEN Stage 1 Design QA

**Source visual truth**

- `/tmp/the-ten-stage1-approved/references/full-website-reference.png` — 941 × 1672 px.
- `/tmp/the-ten-stage1-approved/references/medical-cases-ui-reference.png` — 1448 × 1086 px.
- Production asset identities and roles: `docs/THE_TEN_DRIVE_ASSET_MAP.md`.

**Implementation evidence**

- `/tmp/the-ten-stage1-browser-artifacts/home-1440.png` — 1440 × 2007 px at a 1440 × 1050 CSS viewport, device scale factor 1.
- `/tmp/the-ten-stage1-browser-artifacts/assessment-1440.png` — 1440 × 1954 px at a 1440 × 1050 CSS viewport, device scale factor 1.
- `/tmp/the-ten-stage1-browser-artifacts/home-390.png` — 390 × 3357 px at a 390 × 1050 CSS viewport, device scale factor 1.
- Full-view normalized comparisons: `/tmp/the-ten-stage1-browser-artifacts/comparison-home.png` and `/tmp/the-ten-stage1-browser-artifacts/comparison-assessment.png`. Each source and implementation image is scaled to the same comparison-column width without changing aspect ratio.
- Focused mobile world comparison: `/tmp/the-ten-stage1-browser-artifacts/home-world-390.png`.

**State and scope**

Authenticated learner states are rendered with synthetic persisted-record fixtures. This pass applies the approved visual world to the existing product hierarchy; it does not reproduce the public marketing-page sections or add learner features.

**Findings**

- No actionable P0, P1, or P2 differences remain for the Stage 1 scope.
- Fonts and typography: the implementation keeps its readable Georgia display hierarchy and Arial UI/body stack. Weight, wrapping, and small-label tracking follow the reference's editorial display/UI contrast. The exact illustrated marketing typeface is embedded in the approved lockup rather than approximated in CSS.
- Spacing and layout rhythm: desktop uses the reference's broad ivory canvas, centered content frame, strong hero block, two-column cards, generous section gaps, and restrained rounded surfaces. Tablet and mobile collapse without overlap or page-width overflow; the mobile hero retains a clear copy → Baghdad → navigation → Nexus sequence.
- Colors and visual tokens: parchment, deep teal, turquoise, and gold map directly to the reference palette. State colors remain semantically distinct and retain text labels.
- Image quality and fidelity: all visible illustration and brand content uses the exact approved Stage 1 PNGs. Baghdad keeps an undistorted square crop, Nexus is contained in a progression card instead of a wallpaper, and character identities are not redrawn, mirrored, recolored, or altered. Composed reference screenshots are absent from production.
- Copy and content: existing learner copy, data semantics, lock reasons, assessment language, grading boundaries, and certificate fallback remain intact. The Nexus copy describes navigation and recorded growth without asserting completion.
- Focused regions: the learner-home world region confirms readable next-action contrast, undistorted Baghdad/Nexus crops, and parallel textual navigation. The assessment region confirms the existing question-card density, badge hierarchy, form controls, and confirmation treatment align with the medical UI sheet's coded-component language.
- Accessibility and behavior: skip link, account menu, native radio/checkbox controls, visible focus, 44 px-class targets, semantic image alternatives, reduced motion, and answered/unanswered confirmation were checked. No console error, failed request, broken image, or image 404 occurred.

**Comparison history**

- Initial post-integration comparison found no actionable P0/P1/P2 visual mismatch within the defined Stage 1 scope, so no corrective comparison loop was required.

**Open Questions**

- Approved reaction poses, isolated decorative exports, and medical-system icons have not been supplied. Neutral portraits and coded UI remain the approved fallbacks.

**Implementation Checklist**

- [x] Use only mapped Stage 1 production assets.
- [x] Keep reference screenshots outside `public/`.
- [x] Preserve accessible text navigation and product contracts.
- [x] Use one true learner-home image preload and lazy secondary imagery.
- [x] Verify desktop, tablet, mobile, keyboard, reduced motion, and image network behavior.

**Follow-up Polish**

- P3: add separately exported and approved decorative/icon assets only when their isolated source files are available.

final result: passed
