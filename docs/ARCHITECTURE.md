# SEIP Hub Architecture v0.1

## Current vertical slice

Foundation only:

- Supabase Auth
- Profiles
- Platform administrators
- Programs and program roles
- Cohorts and cohort membership
- Groups
- Learning objectives
- Sessions and facilitators
- Attendance
- Audit-read model

## Non-negotiable governance rules

1. RLS is enabled on every table in the exposed `public` schema.
2. Authorization never trusts `raw_user_meta_data` / user-editable metadata.
3. Browser code uses only the Supabase publishable key.
4. Final assessment grades will never be writable by the AI layer.
5. AI-assisted written grading will produce a proposed score only; a human reviewer must approve or modify it.
6. Statistical analyses will be executed by versioned Python protocols rather than improvised by an LLM.
7. Raw learner responses and grading decisions remain auditable and versioned.

## Planned build sequence

1. Foundation (this package)
2. Learning: session console, QR attendance, realtime activities
3. Assessment core: question bank, blueprint, exam lifecycle
4. Written assessment: rubrics, immutable responses
5. AI proposed grading + human gate
6. Python analytics + psychometrics
7. Reports, QA, certificates
