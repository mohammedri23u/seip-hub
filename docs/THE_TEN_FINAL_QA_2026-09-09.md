# THE TEN — BAGHDAD NEXUS Final QA Addendum

Date: 2026-09-09
Branch: `codex/the-ten-interaction-system`
PR: #3 (Draft)

## Scope completed in this pass

This addendum records the final Assessment Architecture v2 / analytics hardening pass after the learner-facing First Activation journey had already completed its primary live-mission QA.

### Mixed-format checkpoint experience

Entry and Exit checkpoints remain 16 items / 28 marks / 30 minutes:
- 12 canonical single-best-answer items
- 4 evidence-informed short constructed-response items

The learner assessment surface now explicitly transitions into a `PART II · GENERATE, DON’T RECOGNIZE` section before the written cases. It explains that concise generated reasoning is expected, that there is no speed bonus, and that written responses are reviewed using human-governed rubrics. A live word count is shown as a writing aid; it is not a scoring rule.

### Written grading pipeline rehearsal

An authenticated QA learner submitted all 16 Entry items. Database verification confirmed:
- 16 persisted responses
- 12 objective responses machine-scored
- 4 written responses routed to rubric grading

For a controlled pipeline rehearsal, the four intentionally minimal QA written responses were scored through the human-review path using:
- 4 human rubric reviews
- 16 criterion scores
- 4 final human-score decisions

The assessment was temporarily placed in `released` state long enough to run the authoritative result refresh, then returned to `live`.

Verified output:
- 16 / 16 items recognized as scored after final written decisions
- overall result generated against the 28-mark form
- all 10 `TEN-LO-*` Learning Objectives generated in `learner_objective_results`
- objective evidence counts and weighted performance populated

The QA response content was intentionally not used to infer educational effectiveness.

### Immutable final-score behavior

Attempt cleanup after finalization was intentionally blocked by the database integrity trigger: final score decisions are immutable and require the audited correction workflow. This is treated as a successful integrity safeguard, not a defect.

Rather than bypassing that protection, QA/test accounts are explicitly excluded from program analytics through `program_analytics_exclusions`.

### Program analytics

New protected aggregate RPC:
- `public.ten_program_analytics(target_program_id uuid)`

New management route:
- `/programs/[programId]/analytics`

Visible as `Reasoning Signals` for authorized program directors / assessment leads / platform administrators.

Current aggregate signals include:
- active learners and cohorts
- released Entry / Exit result counts and mean percentages
- descriptive Entry → Exit change
- objective-level Entry / Exit means, sample counts and descriptive deltas
- mission participants / completers
- initial and revote confidence means
- peer-discussion answer-change rate
- learner-feedback summaries
- research-consent status counts

The analytics layer excludes accounts registered in `program_analytics_exclusions`; the three SEIP QA accounts are pre-registered as synthetic/test accounts.

The interface intentionally does not offer a one-click identifiable research export. Program evaluation and research use remain separate governance decisions.

### Research outputs

`docs/THE_TEN_RESEARCH_OUTPUTS.md` now defines a staged research program around:
1. paired Entry/Exit reasoning signals
2. Peer Instruction answer change and confidence
3. SBA vs constructed-response signal comparison
4. human rubric reliability
5. optional AI-human grading agreement
6. confidence calibration
7. Nexus Echo delayed retrieval
8. feasibility and learner experience

Claims remain bounded: no competence diagnosis, causal-superiority claim, or autonomous-AI-equivalence claim is supported by First Activation alone.

## Database migrations in this final pass

- `20260909074500_ten_program_analytics_v1.sql`
- `20260909083500_ten_analytics_exclusions.sql`

Both matching changes were applied to the linked Supabase project.

## Automated validation

A fresh branch snapshot was downloaded into an isolated cloud environment and the following passed:
- `npm ci` — 0 package vulnerabilities reported by npm audit during install
- `npm run typecheck`
- `node --experimental-strip-types scripts/test-the-ten.mjs`
- `npm run build`

Production build confirms the new dynamic route `/programs/[programId]/analytics`.

GitHub Quality Gate run #199 on commit `6e7bef1ee742e8ba29ddc770d0ae446845fc7581` completed successfully.

## Security / governance state

Intentional architecture remains:
- TEN/journey data uses server-authoritative/RPC-governed access patterns
- security-definer gateway RPCs perform internal authorization checks
- public certificate verification remains intentionally anonymous and limited
- AI grading remains optional/advisory and cannot create a final autonomous written grade

Outstanding account-level action before production launch:
- enable Supabase Auth Leaked Password Protection

The security advisor also reports expected security-definer/RPC notices and RLS-with-no-direct-policy informational notices for RPC-governed tables. These should continue to be reviewed function-by-function rather than dismissed globally.

## Remaining external dependencies

### Identity-locked reaction art

The application safely falls back to the approved neutral portraits. The requested reaction-pose pack cannot be generated from repository-only image references in the current chat workflow; a usable approved character image must be supplied as the image-generation reference before identity-locked variants are produced.

### Optional AI provider configuration

The AI grading implementation exists, but no server-side API secret is committed. If AI proposals are desired in an environment, configure the provider secret there; never commit it or expose it to the learner client. Human grading remains fully functional without AI.

## Merge state

PR #3 remains Draft and unmerged. The code/data architecture and Quality Gate are green. Final merge should follow user approval of the revised mixed-format checkpoint experience and any desired external production settings/art assets.