create index if not exists ai_grading_runs_requested_by_idx
  on public.ai_grading_runs (requested_by);

create index if not exists final_score_decisions_decided_by_idx
  on public.final_score_decisions (decided_by);

create index if not exists human_reviews_reviewer_idx
  on public.human_reviews (reviewer_id);

create index if not exists moderation_cases_opened_by_idx
  on public.moderation_cases (opened_by);

create index if not exists moderation_cases_resolved_by_idx
  on public.moderation_cases (resolved_by);

create index if not exists question_rubrics_created_by_idx
  on public.question_rubrics (created_by);

create index if not exists rubric_versions_created_by_idx
  on public.rubric_versions (created_by);

create index if not exists rubrics_created_by_idx
  on public.rubrics (created_by);
