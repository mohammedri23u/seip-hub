-- Stage 3 assessment core hardening

create index if not exists assessment_blueprint_learning_objective_idx
  on public.assessment_blueprint (learning_objective_id);

create index if not exists assessment_items_question_version_idx
  on public.assessment_items (question_version_id);

create index if not exists assessments_created_by_idx
  on public.assessments (created_by);

create index if not exists question_versions_created_by_idx
  on public.question_versions (created_by);

create index if not exists questions_author_idx
  on public.questions (author_id);

create index if not exists student_responses_question_version_idx
  on public.student_responses (question_version_id);

create index if not exists student_responses_selected_option_idx
  on public.student_responses (selected_option_id);

-- Combine duplicate permissive UPDATE policies on assessment_attempts.

drop policy if exists attempts_update_own
  on public.assessment_attempts;

drop policy if exists attempts_update_manage
  on public.assessment_attempts;

create policy attempts_update
on public.assessment_attempts
for update
to authenticated
using (
  (
    learner_id = (select auth.uid())
    and status = 'in_progress'
  )
  or private.can_manage_assessment(assessment_id)
)
with check (
  (
    learner_id = (select auth.uid())
    and status in ('in_progress', 'submitted', 'late')
  )
  or private.can_manage_assessment(assessment_id)
);
