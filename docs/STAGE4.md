# Stage 4 — Human-Governed AI-Assisted Written Grading

Stage 4 adds criterion-based rubrics, AI proposed scoring, human review, moderation, final score approval, and auditable grading decisions.

## Governance invariant

The platform enforces this sequence:

**Learner response → rubric → optional AI proposed score → mandatory human review → moderation when required → final human-approved score**

AI output can never be the source of a `final_score_decisions` row. The database only accepts `human_review` or `moderation` as final-score sources.

## Evidence-informed design choices

This implementation deliberately uses explicit rubric criteria and mandatory human oversight because recent medical-education evidence is promising but not sufficient to justify autonomous high-stakes scoring.

- A 2025 BMC Medical Education study of automated SAQ scoring reported strong AI–human correlation/ICC when the model was supplied with rubrics and model responses, supporting criterion-grounded scoring as a useful assistant rather than an unstructured grader.
  - https://link.springer.com/article/10.1186/s12909-025-07718-2
- A 2026 JMIR Medical Education scoping review found AI scoring agreement with humans was variable across studies and highlighted score inflation, prompt sensitivity, and uneven validity evidence. This supports mandatory human review and explicit uncertainty handling.
  - https://mededu.jmir.org/2026/1/e92826
- A 2026 Postgraduate Medical Journal review describes AI assessment in competency-based medical education as promising but still early, reinforcing the need for validation, transparency, and human governance.
  - https://academic.oup.com/pmj/article/102/1211/806/8686351
- WHO guidance on generative AI in health emphasizes governance, transparency, accountability, and human oversight.
  - https://www.who.int/news/item/18-01-2024-who-releases-ai-ethics-and-governance-guidance-for-large-multi-modal-models

## AI implementation

The default provider adapter uses the OpenAI Responses API with Structured Outputs.

Server-only environment variables:

```env
OPENAI_API_KEY=
SEIP_AI_GRADING_MODEL=gpt-5.6-luna
SEIP_AI_PROMPT_VERSION=written_rubric_v1
```

The provider request sets `store: false`. No learner identity is sent to the AI provider; the request includes the question stem, learner response, rubric instructions, optional reference answer, and criterion definitions.

The model is configurable so the platform is not architecturally tied to a single model. Human grading remains fully functional if no AI key is configured.

## Rubric model

Each immutable rubric version contains:

- optional reference answer
- optional global scoring instructions
- criterion code/title/description
- criterion-level scoring guidance
- criterion maximum score
- optional absolute-point AI–human disagreement threshold for automatic moderation

No arbitrary moderation percentage is hard-coded. Programs can leave the threshold blank and use manual moderation until they define a defensible local rule.

## Review UX

Human score fields are intentionally **not prefilled from AI output**. The reviewer grades independently first. The AI proposal is placed in a disclosure panel for comparison, reducing unnecessary anchoring/automation bias.

AI confidence is displayed explicitly as a **self-reported, uncalibrated signal**, not as a probability of correctness.

## Auditability

The database records:

- provider/model/prompt version
- provider response ID
- token usage
- overall and criterion-level AI proposals
- model rationales, missing concepts, errors, uncertainty
- human criterion scores and feedback
- moderation reason and resolution
- final human decision

AI runs, human reviews, moderation cases, and final-score changes also emit entries into the existing `audit_events` table.

## Creating the migration

Stage 4 intentionally does not invent a migration timestamp. Run:

```bash
./scripts/create-stage4-migration.sh
```

The script calls `npx supabase migration new grading_core` and copies the reviewed SQL template into the CLI-generated migration file.

Then validate and push:

```bash
python3 scripts/check-foundation.py
npm run typecheck
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

## End-to-end Stage 4 validation

1. Create and approve a written rubric.
2. Attach its version to a `short_answer` or `structured_written` question version.
3. Deliver an assessment containing that question.
4. Submit a learner written response.
5. Open the Grading Queue.
6. Optionally run an AI proposal.
7. Complete an independent human rubric review.
8. If moderation opens, resolve it as Assessment Lead / Program Director.
9. Approve the final score.
10. Confirm the final score source is human review or moderation, never AI.
