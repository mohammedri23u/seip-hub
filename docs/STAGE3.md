# Stage 3 — Assessment Core

Implemented in this stage:

- Versioned Question Bank
  - Single Best Answer
  - Short Answer
  - Structured Written
  - Schema support for Multiple Response, True/False, Reflection
- Question lifecycle: Draft → Review → Approved → Retired
- Learning Objective authoring and question mapping
- Assessment creation by cohort
- Assessment blueprint rows with target weight / marks
- Approved item selection into assessments
- Assessment lifecycle: Draft → Review → Approved → Scheduled → Live → Closed → Grading
- Delivery-window configuration
- Learner assessment list and start/submit flow
- Server-side objective scoring for SBA / True-False / Multiple Response
- Secure assessment delivery RPC that never sends `is_correct` or model-answer explanations to learner clients
- Result-score RLS that withholds machine scores from learners until results are released

## Security model

Question-bank tables are not directly readable by learners. Learners receive only the minimum delivery payload through `public.get_assessment_delivery(uuid)`, which validates cohort membership, learner role, live assessment status, and delivery window.

Machine scoring runs inside PostgreSQL via a `SECURITY DEFINER` trigger. Learner clients cannot write to `machine_scores`.

## Migration history alignment

The original local migration files were renamed to match the production Supabase migration versions:

- `20260907031952_foundation_v0_1.sql`
- `20260907032029_foundation_fk_indexes.sql`

The new Stage 3 migration is:

- `20260907051000_assessment_core.sql`

This prevents `supabase db push` from treating the already-applied foundation migrations as new migrations.

## Deferred to Stage 4

- Rubric engine
- AI-assisted proposed scoring for written answers
- Human review / moderation queue
- Final score decisions
- AI-human disagreement metrics
- Result release workflow
- Python psychometrics and learning analytics
