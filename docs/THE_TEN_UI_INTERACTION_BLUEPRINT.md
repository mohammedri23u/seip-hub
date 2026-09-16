# THE TEN — BAGHDAD NEXUS
## UI / UX Interaction Blueprint for Codex

This document translates the approved visual references into implementation behavior for the SEIP learner experience.

---

## 1. Product experience target

The learner should feel they are progressing through a medical-learning journey inside the world of **THE TEN — BAGHDAD NEXUS**, not browsing a conventional LMS.

The experience must still preserve the clarity, predictability, accessibility, and academic seriousness expected from a medical-education platform.

The visual story supports the learning flow; it must never obscure assessment content or navigation.

---

## 2. Visual asset groups

Use the approved visual reference files as source of truth for these groups:

### Brand
- THE TEN — BAGHDAD NEXUS primary lockup
- badge/seal lockup
- horizontal logo lockup

### World
- Baghdad city artwork
- Nexus artwork
- Baghdad/Nexus home composition

### Characters
- Ibn Sina
- Jabir ibn Hayyan
- Hippocrates
- Al-Razi

### Decorative kit
- palms
- domes
- minarets
- geometric frames
- scrolls
- books
- medical symbols
- flask/alchemy references
- astrolabe/scientific instruments
- specimen/clinical visual motifs

### Case UI kit
- medical-system icons
- case type badges
- difficulty badges
- case status tags
- CTA buttons
- case cards
- progress states
- answer options
- feedback states
- resource chips
- tab states
- timer and score modules

---

## 3. Learner UX journey

### Phase A — Entry

#### A1. Signup / first login
Purpose: reduce administrative feeling and establish the story world.

Behavior:
- successful signup should transition into a concise welcome sequence
- do not drop a new learner directly into a dense dashboard
- show the program title and one approved character as guide
- primary action: `Begin your journey`

Motion:
- logo/heading: subtle fade + 8–16 px rise
- character: gentle fade/scale only
- no cinematic intro longer than the learner can skip

#### A2. Orientation
Explain only what the learner needs to know before starting:
- how progress works
- how cases/sessions unlock
- what assessments are for
- where completion/certificate status appears

Use 3–4 concise steps rather than a long walkthrough.

#### A3. Pre-test / baseline assessment
The pre-test must visually feel important, but not punitive.

UI:
- progress bar / question count
- focus on one question at a time
- minimal world decoration around the reading area
- clear submit action

After completion:
- show completion acknowledgment
- do not reveal protected answers/results if assessment policy forbids it
- transition into the learner's Baghdad journey

---

## 4. Learner home / Baghdad world

The home experience should use the approved Baghdad/Nexus composition as the narrative anchor.

### Primary information hierarchy
1. current mission / next action
2. overall progress
3. available sessions/cases
4. locked upcoming content
5. latest feedback or result

### Baghdad world interactions
World elements may have:
- hover/focus highlight
- subtle parallax or depth on pointer movement (desktop only, optional)
- click/tap to open a linked learning area
- unlock pulse when new content becomes available

Do NOT make essential navigation dependent only on illustrated hotspots.
A parallel textual/card navigation must exist.

### Nexus state
The Nexus should visually evolve only through approved static/pose/state assets or CSS effects that do not redraw the artwork.

Suggested states:
- dormant
- active
- newly unlocked
- completed chapter

Use glow/opacity/ring effects around the existing asset rather than changing its geometry.

---

## 5. Case card behavior

Each case card should communicate:
- case type
- title
- short clinical framing
- difficulty
- system
- estimated duration if available
- completion/lock state

### Idle
- neutral elevation
- strong title legibility

### Hover/focus
- lift 2–4 px
- shadow/edge strengthens slightly
- optional image/decorative layer shifts 1–2 px for depth

### Press
- scale to ~0.985 briefly

### Locked
- no misleading hover affordance
- visible lock icon + reason
- show prerequisite on click/tap when useful

### In progress
- progress indicator
- resume CTA

### Completed
- completed mark
- muted but still accessible
- allow review if policy permits

### Newly unlocked
- short one-time accent pulse
- no looping animation

---

## 6. Case/session entrance

When learner opens a case:
1. card expands/fades into case intro OR route transition mimics continuity
2. character guide appears with case framing
3. case metadata appears
4. learner begins with a single dominant CTA

Do not overwhelm the intro with all sections at once.

Suggested intro content:
- case name
- case type
- system
- difficulty
- estimated time
- short scenario
- `Start case`

---

## 7. Question experience

### Layout
Desktop:
- main question column
- optional character/clinical art companion area
- progress visible but visually quiet

Mobile:
- question first
- answer choices
- feedback
- character reduced to a small contextual element when needed

### Answer selection
Before submission:
- selected state must be obvious
- do not mark correctness prematurely

On submit:
- disable duplicate submissions
- show short submitting state

---

## 8. Correct answer interaction

Sequence:
1. selected answer locks
2. success border/background transitions in
3. small success icon appears
4. character changes to `correct`/`celebrate` pose if supplied
5. concise positive feedback appears
6. explanation expands
7. `Continue` becomes the primary action

Recommended effects:
- 180–240 ms answer-state transition
- one soft pulse
- optional 3–6 decorative sparkle particles max, CSS-only and short-lived

Avoid:
- screen-filling confetti
- loud bounce chains
- audio by default

---

## 9. Incorrect answer interaction

Sequence:
1. learner's selected answer remains visible
2. error treatment enters
3. answer gives a short 2–6 px lateral nudge or border pulse
4. character changes to `thinking`, `guide`, or `encouraging` pose if supplied
5. corrective feedback appears
6. explanation or retry pathway appears according to assessment rules

Tone:
- formative, never punitive
- explain the reasoning gap

Avoid:
- large red screen flash
- repeated shake
- sad/humiliating character reaction

---

## 10. Partial-credit interaction

For multi-step or structured reasoning questions:
- amber state
- show what portion is correct
- identify missing reasoning step
- preserve learner response
- character uses `guide` or `thinking`

---

## 11. Hints

Hints should feel like guidance from THE TEN, not answer giveaways.

Flow:
- learner clicks `Hint`
- compact character callout or scroll-style panel opens
- optional small point/attempt consequence can be shown if gamification rules use it

Never hide essential accessibility/help content behind a gamified penalty.

---

## 12. Progress tracker

Recommended case sequence:
- Intro
- History
- Examination
- Investigations
- Management
- Summary

States:
- completed
- active
- available
- locked

Interaction:
- completed/available nodes may be reviewable if learning policy permits
- locked nodes explain prerequisite
- tracker animates only the changed segment

Mobile:
- horizontal scroll or compact step label
- do not compress six labels until unreadable

---

## 13. Character system

Implement a `CharacterGuide` component.

Suggested props:
- `character`
- `reaction`
- `size`
- `placement`
- `speech`
- `priority`

Suggested reaction values:
- neutral
- intro
- guide
- question
- thinking
- hint
- correct
- incorrect
- partial
- celebrate
- locked

### Asset behavior
Each reaction must resolve through a typed asset manifest.

If a pose does not exist:
- fall back to neutral
- do not generate a new drawing in code
- record missing pose in a TODO list

### Character usage density
Characters should appear at meaningful teaching/narrative moments, not beside every paragraph.

Good moments:
- welcome
- case introduction
- hint
- important reasoning pivot
- feedback
- case completion
- chapter/session unlock

---

## 14. World transitions

Use the Baghdad/Nexus world to punctuate major milestones.

Examples:
- pre-test completed → Baghdad home reveal
- first session unlocked → Nexus activation pulse
- case completed → Baghdad location receives completed state
- chapter completed → short world progress transition
- certificate eligibility → final Nexus/Baghdad completion moment

World transitions should last under ~1 second and never block the learner unnecessarily.

---

## 15. Completion and certificate UX

Do not make certificate eligibility mysterious.

The learner should see a checklist such as:
- required sessions completed
- required attendance completed
- required assessments completed
- required post-test completed
- minimum completion condition met

When eligible:
- show a clear `Certificate unlocked` state
- optional character celebration
- one-time Nexus/gold accent
- primary action: view/download certificate

When not eligible:
- list exact remaining requirements
- each actionable requirement links to the relevant screen

---

## 16. Motion token proposal

Create centralized tokens rather than arbitrary durations.

```ts
export const motionTokens = {
  instant: 120,
  fast: 180,
  base: 240,
  panel: 300,
  route: 380,
  celebration: 650,
}
```

Suggested easing:
- controls: standard ease-out
- entering panels: cubic-bezier style ease-out
- card physical response: spring when motion library is used

Respect reduced motion globally.

---

## 17. Component build order

### Foundation
1. design tokens
2. asset manifest
3. button system
4. badges/tags
5. icon/system badge
6. feedback colors/states

### Learning primitives
7. CaseCard
8. QuestionCard
9. AnswerOption
10. CaseProgressTracker
11. FeedbackPanel
12. CharacterGuide

### World
13. BaghdadWorld
14. NexusState
15. WorldNavCard / MissionCard

### Screens
16. learner home
17. pre-test experience
18. case intro
19. case question flow
20. completion/result
21. certificate eligibility

---

## 18. Technical constraints for current repo

Current stack is Next.js + React + TypeScript + Tailwind + Supabase.

Do not convert the project to another framework.
Do not replace existing server actions unnecessarily.
Do not move assessment correctness or grading authority into client-only state.

Interactive presentation can use client components, while data authority remains on the server/database side.

If a motion dependency is added, keep the dependency minimal and document why it is required.

---

## 19. QA checklist per screen

Before marking a learner screen complete, test:
- default state
- hover
- focus
- keyboard activation
- loading/submitting
- success
- error
- locked state
- completed state
- small mobile
- tablet
- desktop
- reduced motion
- slow image loading / missing optional asset fallback

---

## 20. First Codex implementation task

Codex should NOT redesign the whole application in one uncontrolled pass.

First implementation slice:
1. create THE TEN design tokens and asset manifest structure
2. build reusable case badges/buttons/card/answer/feedback/progress components
3. restyle the learner assessment-taking route using these components
4. implement correct/incorrect/loading/disabled/reduced-motion states
5. keep existing assessment submission behavior intact
6. run typecheck and build
7. provide screenshots or a concise implementation report and list any missing pose assets

After this slice is validated, apply the system to learner home/world and the full journey.
