# SEIP Hub / THE TEN — Codex Operating Rules

## Mission
Build the learner-facing SEIP experience as an interactive story-driven medical-education product branded **THE TEN — BAGHDAD NEXUS**. Preserve the existing backend, assessment logic, Supabase behavior, grading governance, and data model unless a task explicitly requires changing them.

The UI is not a generic dashboard. It should feel like a polished interactive learning world built from the approved Baghdad/Nexus visual identity while remaining fast, accessible, and academically credible.

## Non-negotiable visual source of truth
The approved reference set lives in the project Google Drive folder used by the team and includes:
- homepage/world composition
- THE TEN logo variants
- Baghdad city artwork
- Nexus artwork
- four approved hero character illustrations
- decorative/vector asset kit
- medical-case UI asset sheet

Do not replace the approved look with a different illustration style, generic SaaS styling, shadcn defaults, stock icons, emoji, gradients unrelated to the reference palette, or AI-looking glass-card clutter.

### Character preservation rule
The four heroes are **identity-locked visual assets**. Do not redraw, restyle, recolor, distort, morph, mirror, or approximate them in code.

For new poses, the implementation must reference explicitly supplied pose assets for the same character. Until those assets exist, use an approved existing pose and mark the desired pose in code/config as a missing asset dependency. Never fabricate a new face/body with CSS, SVG, or an unrelated illustration.

Character identities:
- Ibn Sina — The Visionary
- Jabir ibn Hayyan — The Experimenter
- Hippocrates — The Explorer
- Al-Razi — The Empath

## Core implementation strategy
Build a reusable design and interaction system before polishing individual screens.

Preferred structure:
- `src/components/the-ten/` — branded primitives and composites
- `src/components/the-ten/case/` — case and question experience
- `src/components/the-ten/characters/` — character presenter/reaction components
- `src/components/the-ten/world/` — Baghdad/Nexus/world components
- `src/lib/the-ten/motion.ts` — motion tokens/variants
- `src/lib/the-ten/assets.ts` — typed asset manifest
- `src/lib/the-ten/feedback.ts` — feedback state mapping

Do not duplicate large Tailwind class strings across pages when a reusable component is appropriate.

## Interaction architecture
Use state-driven interactions. Every interactive component should have explicit states and predictable transitions.

### Case card
States:
- idle
- hover/focus
- pressed
- locked
- in-progress
- completed
- bonus

Behavior:
- subtle lift and depth on hover/focus
- tactile compress on press
- never rotate or move enough to hurt readability
- status must be visible through icon/text, not color alone

### Answer option
States:
- idle
- hover/focus
- selected
- submitting
- correct
- incorrect
- partially-correct when supported
- disabled/locked after submission

Correct answer response:
- short success pulse on selected answer
- green/teal success treatment matching the reference UI
- optional small gold/Nexus sparkle accent
- character reaction switches to an approved success pose if available
- explanation panel reveals after the result motion settles
- no excessive confetti

Incorrect answer response:
- concise horizontal nudge or border pulse, not a violent shake
- red/coral error treatment matching the reference UI
- preserve the learner's selected answer for review
- reveal clear corrective feedback
- character reaction switches to an approved thinking/encouraging pose if available
- never use humiliating or punitive animation

Partially correct response:
- amber treatment
- brief positive pulse
- direct learner toward the missing reasoning step

### Question transition
When moving to the next question:
- old question exits with a short directional fade/slide
- next question enters from the direction of progress
- progress tracker animates by one logical step
- do not animate the whole page shell

### Case progress tracker
Use the approved sequence language from the UI sheet where applicable:
Intro → History → Exam → Investigations → Management → Summary

The active step must be obvious, completed steps must remain readable, and locked future steps must not look clickable.

### Character reactions
Implement as a small state machine, not hard-coded conditionals scattered across pages.
Suggested states:
- neutral
- introduce
- guide
- thinking
- hint
- correct
- incorrect
- partial
- celebrate
- locked

Each state maps to an approved asset path in `assets.ts`. Missing states fall back to `neutral` without changing the character design.

## Motion rules
Use CSS motion for simple transitions. For coordinated component/page transitions, install and use a lightweight React motion library compatible with the current Next.js/React stack only if needed.

Motion should feel premium and deliberate, not gamey or noisy.

Recommended timing tokens:
- instant feedback: 100–140 ms
- controls/cards: 160–220 ms
- panels: 220–320 ms
- page/section transitions: 300–450 ms
- celebration accents: max ~700 ms and self-terminating

Prefer spring motion for card lift/return and eased motion for opacity/position transitions.

Never run decorative infinite animation across many elements. Ambient motion, if used, must be low-amplitude and limited to one or two focal elements.

Honor `prefers-reduced-motion`. The experience must remain fully understandable with motion disabled.

## Visual language
Extract design tokens from the approved THE TEN references instead of inventing a new palette.

Key visual characteristics:
- warm parchment / ivory backgrounds
- deep teal/navy as structural color
- turquoise/cyan accents
- warm gold as a premium/action accent
- Baghdad architectural silhouettes and palms
- rounded but not overly bubbly component geometry
- illustrated world elements used as narrative anchors, not wallpaper everywhere
- strong typographic hierarchy and generous whitespace

Do not use generic neon gaming UI, cyberpunk styling, dark glassmorphism everywhere, purple SaaS gradients, or random 3D icons.

## Medical case UI inventory
Implement reusable versions of the approved asset-sheet elements:
- CaseTypeBadge
- DifficultyBadge
- SystemIcon / SystemBadge
- StatusTag
- PrimaryButton / SecondaryButton / UtilityButton
- CaseCard
- QuestionCard
- AnswerOption
- CaseProgressTracker
- FeedbackPanel
- ResourceChip
- InfoPanel
- Timer
- ScoreBadge
- NavigationTabs
- NotificationPill
- DecorativeAsset

All variants must be driven by typed props, not one-off class overrides.

## Learner journey to optimize
The target UX is a continuous journey:
1. account/signup completion
2. welcome/orientation
3. baseline/pre-test
4. learner dashboard / Baghdad map
5. story/session unlock
6. learning case or session interaction
7. in-session checks and reasoning decisions
8. immediate formative feedback
9. session completion
10. post-test / assessment when applicable
11. progress/results reflection
12. eligibility/completion state
13. certificate unlock and download/view action

The user should always know:
- where they are
- what they have completed
- what comes next
- why something is locked
- what action advances progress

## Navigation model
Learner-facing navigation should prioritize the learning journey, not admin information architecture.

Prefer a compact persistent structure such as:
- Journey / Home
- Cases or Sessions
- Progress
- Resources/Notes if available
- Profile

The Baghdad/Nexus world can act as the primary narrative navigation layer, but all critical actions must remain accessible without relying on illustration hotspots alone.

## Accessibility
Mandatory:
- keyboard-accessible controls
- visible focus states
- semantic buttons/links
- `aria-live` for submitted answer feedback where appropriate
- minimum comfortable touch target sizing
- no color-only status communication
- readable contrast over illustrated backgrounds
- responsive down to small mobile screens

## Performance
- Prefer `next/image` for raster assets
- define sensible image sizes
- lazy-load below-the-fold artwork
- preload only true LCP/hero imagery
- avoid video backgrounds and large canvas/WebGL effects for normal navigation
- do not add Three.js for decorative movement
- avoid loading all character poses on first paint

## Backend safety
Do not break or bypass:
- Supabase auth/session behavior
- RLS assumptions
- assessment submission logic
- human-governed grading workflow
- server actions
- existing IDs and relational data

Visual feedback may be optimistic only when it does not misrepresent persisted completion/assessment state.

## Implementation workflow for Codex
For every UI task:
1. inspect the target route and neighboring shared components
2. identify the existing backend/data contract
3. map the screen to reusable THE TEN components
4. implement the states before decorative polish
5. add responsive behavior
6. add reduced-motion/accessibility handling
7. run typecheck/build
8. report changed files and any missing visual assets separately

Do not silently invent unavailable art. Use TODO asset-manifest entries with clear filenames/state names.

## Definition of done
A UI task is done only when:
- it visually matches THE TEN — BAGHDAD NEXUS direction
- all visible controls work
- correct/incorrect/locked/loading/completed states are implemented where relevant
- mobile layout works
- keyboard/focus behavior works
- reduced-motion fallback works
- typecheck/build pass
- no backend behavior regresses
