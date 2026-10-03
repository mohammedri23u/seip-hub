begin;

create index if not exists learner_remediation_plans_learner_idx
  on public.learner_remediation_plans (learner_id);

drop policy if exists learner_feedback_records_select on public.learner_feedback_records;
create policy learner_feedback_records_select on public.learner_feedback_records for select to authenticated
using (
  exists (
    select 1
    from public.student_responses sr
    join public.assessment_attempts aa on aa.id = sr.attempt_id
    join public.assessments a on a.id = aa.assessment_id
    join public.cohorts c on c.id = a.cohort_id
    where sr.id = learner_feedback_records.response_id
      and (
        private.has_program_role(c.program_id, array['program_director','assessment_lead','reviewer'])
        or (aa.learner_id = (select auth.uid()) and learner_feedback_records.status = 'approved' and a.status = 'released')
      )
  )
);

drop policy if exists learner_feedback_records_insert on public.learner_feedback_records;
create policy learner_feedback_records_insert on public.learner_feedback_records for insert to authenticated
with check ((select auth.uid()) = authored_by);

drop policy if exists learner_assessment_results_select on public.learner_assessment_results;
create policy learner_assessment_results_select on public.learner_assessment_results for select to authenticated
using (
  learner_id = (select auth.uid())
  or exists (
    select 1 from public.assessments a
    join public.cohorts c on c.id = a.cohort_id
    where a.id = learner_assessment_results.assessment_id
      and private.has_program_role(c.program_id, array['program_director','assessment_lead','reviewer'])
  )
);

drop policy if exists learner_item_results_select on public.learner_item_results;
create policy learner_item_results_select on public.learner_item_results for select to authenticated
using (
  exists (
    select 1 from public.learner_assessment_results lar
    join public.assessments a on a.id = lar.assessment_id
    join public.cohorts c on c.id = a.cohort_id
    where lar.id = learner_item_results.assessment_result_id
      and (lar.learner_id = (select auth.uid()) or private.has_program_role(c.program_id, array['program_director','assessment_lead','reviewer']))
  )
);

drop policy if exists learner_objective_results_select on public.learner_objective_results;
create policy learner_objective_results_select on public.learner_objective_results for select to authenticated
using (
  exists (
    select 1 from public.learner_assessment_results lar
    join public.assessments a on a.id = lar.assessment_id
    join public.cohorts c on c.id = a.cohort_id
    where lar.id = learner_objective_results.assessment_result_id
      and (lar.learner_id = (select auth.uid()) or private.has_program_role(c.program_id, array['program_director','assessment_lead','reviewer']))
  )
);

drop policy if exists learner_remediation_plans_select on public.learner_remediation_plans;
create policy learner_remediation_plans_select on public.learner_remediation_plans for select to authenticated
using (learner_id = (select auth.uid()) or private.has_program_role(program_id, array['program_director','assessment_lead','reviewer']));

drop policy if exists learner_remediation_plans_insert on public.learner_remediation_plans;
create policy learner_remediation_plans_insert on public.learner_remediation_plans for insert to authenticated
with check (created_by = (select auth.uid()) and private.has_program_role(program_id, array['program_director','assessment_lead']));

commit;

