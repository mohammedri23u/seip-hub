# Named student grading workspace — 2026-10-01

## Implemented scope

Entry route `/grading`, with a dashboard card. Program directors, assessment leads and platform administrators can select a learner by name or student ID, filter by pending review/approval, open the learner's Pre/Post and practice attempts, and review each submitted answer. Teachers retain the existing assigned, blinded-response queue. No teacher is granted general learner identity access by this change.

The student's assessment view shows per-item marks, a weighted partial total, pending items, pending approvals, moderation and a separate completed final total. Raw rubric totals are normalized to assessment-item weights once. Missing/unreviewed written answers are not converted to zero. Computed but unrecorded MCQ grades are marked provisional. Released results are displayed separately from approval status.

The rubric form includes live totals, required criterion scores, reference/scoring guidance, feedback, draft save, commit, and save-and-next. A named learner parameter is validated on the server against the response before it is used for navigation. Committed reviews are locked, while final approval/moderation continues through existing human-authority RPCs. No final grade is automatically released.

A pre-existing integration mismatch was repaired: scientific responses must use `ten_save_scientific_review`, not `ten_save_human_review`. The form now requires the independent safety judgment and requires a note when unsafe. Scientific answers do not enable the AI proposal action. No paid AI dependency was introduced.

## Database change

Migration `20261001141324_named_student_grading_workspace.sql` is applied. Its timestamp matches the connected migration history. The CLI-created development file was reconciled to that recorded timestamp, without repairing or rewriting remote migration history.

The public read RPC is SECURITY INVOKER and calls a role-checked private function with an empty search path. Anonymous EXECUTE is revoked. The private function requires a signed-in, allowed managed session and program leadership; it validates learner-program membership. It returns no answer details from attempts still in progress. Existing RLS policies and blinded-review functions were not loosened.

## Verification performed

- TypeScript typecheck: PASS.
- Next.js production build: PASS, including all three new routes.
- Calculation and search tests: 15/15 PASS (`node --experimental-strip-types scripts/qa/grading-workspace.test.mjs`).
- `git diff --check`: PASS.
- Database permission-context read test: directory and submitted-attempt details returned correctly, with correct pre-test phase classification.
- Anonymous function call: rejected. Anonymous EXECUTE privilege: false.
- In-progress attempt answer details: hidden.
- No human review or final score was entered during this implementation. Existing attempts and active micro forms were retained.

These database checks are not authenticated browser end-to-end tests. Saving, advancing, moderation, final approval and result release through a real browser session have not been verified end to end. No student score was fabricated to perform such a test.

## Security review

Supabase security advisors were inspected after the migration. Existing notices remain for private RLS-enabled tables with no direct-user policy, existing callable SECURITY DEFINER RPCs, two existing anonymous RPCs, and disabled leaked-password protection. This is not a blanket security clearance. The new public RPC is SECURITY INVOKER, with explicit role checks inside its private implementation. No unrelated auth or research setting was changed.

Official remediation references:
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Deployment limitation at verification

The branch is `codex/astra-the-ten-ui-overhaul-v1`. The inspected production-domain deployment still pointed to the older CLI production deployment, while recent branch commits were READY preview deployments. The connected deploy action returned `Tool deploy_to_vercel not found`; no authenticated CLI or browser profile was available for production promotion. Do not equate a successful branch deployment with a production alias change. The deployment status of this commit must be checked separately.
