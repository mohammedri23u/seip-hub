create index if not exists grading_quality_samples_program_idx on public.grading_quality_samples(program_id);
create index if not exists grading_quality_samples_created_by_idx on public.grading_quality_samples(created_by);
create index if not exists program_assessment_quality_updated_by_idx on public.program_assessment_quality_settings(updated_by);
create index if not exists program_assessment_sequences_pre_assessment_idx on public.program_assessment_sequences(pre_assessment_id);
create index if not exists program_assessment_sequences_post_assessment_idx on public.program_assessment_sequences(post_assessment_id);

alter policy program_assessment_quality_settings_insert on public.program_assessment_quality_settings
with check (
  updated_by=(select auth.uid())
  and private.has_program_role(program_id,array['program_director','assessment_lead']::text[])
);

alter policy program_assessment_quality_settings_update on public.program_assessment_quality_settings
using (private.has_program_role(program_id,array['program_director','assessment_lead']::text[]))
with check (
  updated_by=(select auth.uid())
  and private.has_program_role(program_id,array['program_director','assessment_lead']::text[])
);

alter policy grading_quality_samples_insert on public.grading_quality_samples
with check (
  created_by=(select auth.uid())
  and private.has_program_role(program_id,array['program_director','assessment_lead']::text[])
);

alter policy responses_update on public.student_responses
using (
  exists (
    select 1
    from public.assessment_attempts aa
    join public.assessments a on a.id=aa.assessment_id
    where aa.id=student_responses.attempt_id
      and aa.learner_id=(select auth.uid())
      and aa.status='in_progress'
      and a.assessment_type<>'progress'
      and private.can_take_assessment(aa.assessment_id)
  )
)
with check (
  exists (
    select 1
    from public.assessment_attempts aa
    join public.assessments a on a.id=aa.assessment_id
    where aa.id=student_responses.attempt_id
      and aa.learner_id=(select auth.uid())
      and aa.status='in_progress'
      and a.assessment_type<>'progress'
      and private.can_take_assessment(aa.assessment_id)
  )
);
