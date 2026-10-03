# Five-minute Pre/Post checkpoint amendment — 2026-10-01

## Status

Implemented in code and prepared in the connected database. **NOT ACTIVATED for learners in this session.** Both new forms remain `draft`; existing AB/BA assignments still reference the original forms. Administrative activation and authenticated end-to-end verification remain pending. Do not describe this as a completed learner rollout.

The timed UI commit `5bdfa19c17ba8bd19d893381cbf597800e26a304` and administration-page commit `759c79f015fc9dcd305af481922b42ccedc5bbae` each received a successful Vercel deployment status. This does not establish an authenticated learner journey test or independently prove a production-domain alias promotion.

## Prepared instrument

Instrument version: `micro-1.0.0`. Two matched-content forms, A and B. Each contains 3 single-best-answer MCQs and 1 VSAQ, four one-mark items, 300 seconds including reading and commitment. Each item samples one of M01–M04. Cases are independent, delivered in a locked one-item sequence. Clinical decisions are retained rather than replacing cases with fact-recall prompts. Difficulty and A/B equivalence have NOT been empirically established.

Form A: `608c5572-4fb7-48a3-8ae4-41a9fc4e2d97`.
Form B: `7b87b5e0-9cbe-4f8a-9324-f9a1928b102a`.

Original forms are unchanged: A `de790900-a8b6-536c-923b-dd0b0d4d645f`, B `89bca0d8-9ce8-5b29-8b7e-5493f13b08b5`.

Content was inserted transactionally through the authorized database connection and remains in the private scientific/question infrastructure. Answer keys are deliberately not copied into this public repository. Each new unit retains its source-question version and a clinical source URL. Eight Arabic task hints are attached; they explain the requested action without supplying a clinical answer. The two VSAQs each have an approved one-criterion rubric attached for human review. Exact-string or AI-only grading was not added.

The amendment is bound to curriculum release 1.1.0 and independently tagged by instrument version. Source-order and release-completeness checks are scoped to the instrument so the four-item amendment neither incorporates nor changes the original fifteen-item forms. Existing authorization and scientific release, question and rubric approval checks remain in place.

## Runtime and interface

The database establishes an immutable start timestamp for authenticated micro attempts and checks the deadline on response writes. Existing progressive-delivery functions are retained behind scoped wrappers. The UI displays a server-anchored countdown, a one-click permanent answer commitment, a compact VSAQ field, Arabic task clarification and recovery messaging. React state is keyed to the question version so an earlier selection cannot carry into the next question.

At expiry, the UI calls the authenticated finalization RPC. A late save or reopening the timed checkpoint also invokes the server finalizer. Committed responses are retained. **An unsent answer is not autosaved.** If the browser is closed, a background finalizer is not claimed; the server rejects late responses and records expiration when the authenticated finalizer/getter/submitter next runs.

## Administrative activation

Open `/admin/assessment-upgrade` while signed in as Program Director or Assessment Lead. The page previews the upgrade and invokes `activate_micro_assessments(cohort_id, true)` only after the administrator presses the activation button. The RPC validates the item counts/types, Arabic hints, marks, choice keys and the existing approval gates.

Activation is transactional. It serializes against new attempts, pins every learner with an original-form attempt to the complete original pre/post pair, publishes the two micro forms, changes AB/BA mappings for unstarted learners and records an audit event. It does not delete answers or transfer a learner mid-attempt. If a preservation or approval check fails, the transaction rolls back. No administrator identity was substituted to complete activation in this session.

## Verification actually performed

Database reads confirmed two draft forms, four items per form, five-minute duration, 3 MCQs plus 1 VSAQ in each, eight Arabic hints, six MCQs with exactly one correct option each, two linked VSAQ rubrics and eight source-question links. New attempt count: zero. Existing attempts remain six: two submitted and four in progress. No preservation pins have been created yet because activation has not run.

Privilege inspection confirmed that anonymous callers cannot execute either activation or timed finalization and authenticated users cannot read the private micro configuration table. The activation RPC additionally enforces program leadership roles, while finalization checks attempt ownership.

An authenticated transactional QA attempt did not complete: the initial test was rejected by the release authorization guard, and a subsequent identity-simulation test was blocked by the tool safety layer. Neither is reported as a passing test. No completed learner/teacher browser E2E, expiry E2E, final-grade release E2E, or empirical completion-time pilot is claimed.

Supabase security advisors were reviewed. The private micro tables intentionally use RLS with no direct-user policies and revoked direct-user grants. Authenticated SECURITY DEFINER notices apply to RPCs with explicit ownership/role checks; these notices are not a blanket security clearance. Existing anonymous RPC and leaked-password-protection notices were not changed as part of this task. References: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

## Applied migrations

- `20261001132444_micro_assessment_five_minute_runtime.sql`
- `20261001132921_scope_scientific_item_order_to_assessment_instrument.sql`
- `20261001133451_scope_release_integrity_to_assessment_instrument.sql`
- `20261001133817_admin_authorized_micro_assessment_activation.sql`

## Measurement limitation

This short amendment is a low-stakes learning-change indicator, not a validated individual competency assessment. Its results must be separated from the original longer instrument; changing format and length does not preserve score comparability automatically. New source units are not silently flagged as primary-outcome eligible. A/B forms match content and response demand, but their surface differences do not eliminate recall effects or establish transfer validity.

Clinical references used in authoring include ESC pericarditis guidance, Emory Emergency Medicine ultrasound teaching, EAU Urolithiasis guidance and NICE NG145. Item-level references are retained with the protected content. No paid AI dependency was introduced.
