begin;

create table public.learner_feedback_records (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null unique references public.student_responses(id) on delete cascade,
  feedback_text text,
  strengths text[] not null default '{}'::text[],
  improvement_areas text[] not null default '{}'::text[],
  next_steps text[] not null default '{}'::text[],
  status text not null default 'draft' check (status in ('draft', 'approved')),
  authored_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'draft' and approved_by is null and approved_at is null) or (status = 'approved' and approved_by is not null and approved_at is not null))
);

create table public.learner_assessment_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.assessment_attempts(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  learner_id uuid not null references auth.users(id),
  total_score numeric(10,3) not null default 0 check (total_score >= 0),
  max_score numeric(10,3) not null check (max_score > 0),
  scored_items integer not null default 0 check (scored_items >= 0),
  total_items integer not null default 0 check (total_items >= 0),
  released_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_score <= max_score),
  check (scored_items <= total_items)
);

create table public.learner_item_results (
  id uuid primary key default gen_random_uuid(),
  assessment_result_id uuid not null references public.learner_assessment_results(id) on delete cascade,
  response_id uuid references public.student_responses(id) on delete set null,
  question_version_id uuid not null references public.question_versions(id),
  position integer not null check (position > 0),
  question_code text not null,
  question_type text not null,
  stem_snapshot text not null,
  score numeric(10,3) not null check (score >= 0),
  max_score numeric(10,3) not null check (max_score > 0),
  score_source text not null check (score_source in ('machine', 'human_review', 'moderation', 'correction')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_result_id, question_version_id),
  check (score <= max_score)
);

create table public.learner_objective_results (
  assessment_result_id uuid not null references public.learner_assessment_results(id) on delete cascade,
  learning_objective_id uuid not null references public.learning_objectives(id),
  objective_code text not null,
  objective_title text not null,
  performance_percent numeric(7,3) not null check (performance_percent >= 0 and performance_percent <= 100),
  evidence_count integer not null check (evidence_count > 0),
  assessed_weight numeric(10,3) not null check (assessed_weight > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (assessment_result_id, learning_objective_id)
);

create table public.learner_remediation_plans (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  learner_id uuid not null references auth.users(id),
  learning_objective_id uuid references public.learning_objectives(id),
  title text not null,
  rationale text,
  actions text[] not null default '{}'::text[],
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  due_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index learner_feedback_records_authored_by_idx on public.learner_feedback_records (authored_by);
create index learner_feedback_records_approved_by_idx on public.learner_feedback_records (approved_by);
create index learner_assessment_results_assessment_idx on public.learner_assessment_results (assessment_id);
create index learner_assessment_results_learner_idx on public.learner_assessment_results (learner_id);
create index learner_item_results_response_idx on public.learner_item_results (response_id);
create index learner_item_results_question_version_idx on public.learner_item_results (question_version_id);
create index learner_objective_results_learning_objective_idx on public.learner_objective_results (learning_objective_id);
create index learner_remediation_plans_program_learner_idx on public.learner_remediation_plans (program_id, learner_id);
create index learner_remediation_plans_learning_objective_idx on public.learner_remediation_plans (learning_objective_id);
create index learner_remediation_plans_created_by_idx on public.learner_remediation_plans (created_by);

create trigger learner_feedback_records_set_updated_at before update on public.learner_feedback_records for each row execute function private.set_updated_at();
create trigger learner_assessment_results_set_updated_at before update on public.learner_assessment_results for each row execute function private.set_updated_at();
create trigger learner_item_results_set_updated_at before update on public.learner_item_results for each row execute function private.set_updated_at();
create trigger learner_objective_results_set_updated_at before update on public.learner_objective_results for each row execute function private.set_updated_at();
create trigger learner_remediation_plans_set_updated_at before update on public.learner_remediation_plans for each row execute function private.set_updated_at();

create or replace function private.validate_feedback_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_program uuid;
begin
  select c.program_id into target_program
  from public.student_responses sr
  join public.assessment_attempts aa on aa.id = sr.attempt_id
  join public.assessments a on a.id = aa.assessment_id
  join public.cohorts c on c.id = a.cohort_id
  where sr.id = new.response_id;

  if target_program is null then raise exception 'Feedback response not found'; end if;
  if not private.has_program_role(target_program, array['program_director', 'assessment_lead', 'reviewer']) then
    raise exception 'Not permitted to author learner feedback';
  end if;
  if tg_op = 'INSERT' and new.authored_by <> auth.uid() then
    raise exception 'Feedback author must match current user';
  end if;
  if new.status = 'approved' and not private.has_program_role(target_program, array['program_director', 'assessment_lead']) then
    raise exception 'Only assessment leadership can approve learner feedback';
  end if;
  if new.status = 'approved' and new.approved_by <> auth.uid() then
    raise exception 'Feedback approver must match current user';
  end if;
  return new;
end;
$$;

create trigger learner_feedback_records_validate before insert or update on public.learner_feedback_records for each row execute function private.validate_feedback_record();

create or replace function private.audit_feedback_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_program uuid;
begin
  select c.program_id into target_program
  from public.student_responses sr
  join public.assessment_attempts aa on aa.id = sr.attempt_id
  join public.assessments a on a.id = aa.assessment_id
  join public.cohorts c on c.id = a.cohort_id
  where sr.id = new.response_id;
  insert into public.audit_events(program_id, actor_user_id, event_type, entity_type, entity_id, old_value, new_value)
  values (target_program, auth.uid(), case when tg_op = 'INSERT' then 'learner_feedback.created' else 'learner_feedback.updated' end, 'learner_feedback_record', new.id::text, case when tg_op = 'UPDATE' then to_jsonb(old) else null end, to_jsonb(new));
  return new;
end;
$$;

create trigger learner_feedback_records_audit after insert or update on public.learner_feedback_records for each row execute function private.audit_feedback_record();

create or replace function private.current_response_score(target_response_id uuid)
returns table(score numeric, max_score numeric, score_source text)
language sql
stable
security definer
set search_path = ''
as $$
  with correction as (
    select fsc.corrected_score as score, fsc.max_score, 'correction'::text as score_source
    from public.final_score_corrections fsc
    where fsc.response_id = target_response_id
    order by fsc.created_at desc, fsc.id desc
    limit 1
  ), final_decision as (
    select fsd.final_score as score, fsd.max_score,
           case fsd.decision_source when 'moderation' then 'moderation'::text else 'human_review'::text end as score_source
    from public.final_score_decisions fsd
    where fsd.response_id = target_response_id
  ), machine as (
    select ms.score, ms.max_score, 'machine'::text as score_source
    from public.machine_scores ms
    where ms.response_id = target_response_id
  )
  select * from correction
  union all select * from final_decision where not exists (select 1 from correction)
  union all select * from machine where not exists (select 1 from correction) and not exists (select 1 from final_decision)
  limit 1;
$$;

create or replace function private.refresh_attempt_result(target_attempt_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_row record;
  result_id uuid;
  total numeric := 0;
  maximum numeric := 0;
  scored integer := 0;
  item_total integer := 0;
  item record;
begin
  select aa.id, aa.assessment_id, aa.learner_id, a.status, greatest(coalesce(a.updated_at, now()), now()) as release_time
  into attempt_row
  from public.assessment_attempts aa
  join public.assessments a on a.id = aa.assessment_id
  where aa.id = target_attempt_id;
  if attempt_row.id is null or attempt_row.status <> 'released' then return; end if;

  for item in
    select ai.question_version_id, ai.position, ai.marks, q.question_code, q.question_type, qv.stem,
           sr.id as response_id, cs.score, cs.max_score as score_max, cs.score_source
    from public.assessment_items ai
    join public.question_versions qv on qv.id = ai.question_version_id
    join public.questions q on q.id = qv.question_id
    left join public.student_responses sr on sr.attempt_id = target_attempt_id and sr.question_version_id = ai.question_version_id
    left join lateral private.current_response_score(sr.id) cs on true
    where ai.assessment_id = attempt_row.assessment_id
    order by ai.position
  loop
    item_total := item_total + 1;
    maximum := maximum + item.marks;
    if item.response_id is not null and item.score is not null then
      total := total + item.score;
      scored := scored + 1;
    end if;
  end loop;

  insert into public.learner_assessment_results(attempt_id, assessment_id, learner_id, total_score, max_score, scored_items, total_items, released_at)
  values (target_attempt_id, attempt_row.assessment_id, attempt_row.learner_id, total, maximum, scored, item_total, attempt_row.release_time)
  on conflict (attempt_id) do update set total_score = excluded.total_score, max_score = excluded.max_score, scored_items = excluded.scored_items, total_items = excluded.total_items, released_at = excluded.released_at, updated_at = now()
  returning id into result_id;

  delete from public.learner_item_results where assessment_result_id = result_id;
  for item in
    select ai.question_version_id, ai.position, ai.marks, q.question_code, q.question_type, qv.stem,
           sr.id as response_id, cs.score, cs.max_score as score_max, cs.score_source
    from public.assessment_items ai
    join public.question_versions qv on qv.id = ai.question_version_id
    join public.questions q on q.id = qv.question_id
    left join public.student_responses sr on sr.attempt_id = target_attempt_id and sr.question_version_id = ai.question_version_id
    left join lateral private.current_response_score(sr.id) cs on true
    where ai.assessment_id = attempt_row.assessment_id
    order by ai.position
  loop
    if item.response_id is not null and item.score is not null then
      insert into public.learner_item_results(assessment_result_id, response_id, question_version_id, position, question_code, question_type, stem_snapshot, score, max_score, score_source)
      values (result_id, item.response_id, item.question_version_id, item.position, item.question_code, item.question_type, item.stem, item.score, item.marks, item.score_source);
    end if;
  end loop;

  delete from public.learner_objective_results where assessment_result_id = result_id;
  insert into public.learner_objective_results(assessment_result_id, learning_objective_id, objective_code, objective_title, performance_percent, evidence_count, assessed_weight)
  select result_id, lo.id, lo.code, lo.title,
         round((sum(lir.score * coalesce(qlo.weight, 100)) / nullif(sum(lir.max_score * coalesce(qlo.weight, 100)), 0)) * 100, 3),
         count(*), sum(lir.max_score * coalesce(qlo.weight, 100))
  from public.learner_item_results lir
  join public.question_learning_objectives qlo on qlo.question_version_id = lir.question_version_id
  join public.learning_objectives lo on lo.id = qlo.learning_objective_id
  where lir.assessment_result_id = result_id
  group by lo.id, lo.code, lo.title;
end;
$$;

create or replace function private.validate_results_release()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('approved_results', 'released') and old.status not in ('approved_results', 'released') then
    if exists (
      select 1
      from public.assessment_attempts aa
      join public.student_responses sr on sr.attempt_id = aa.id
      join public.question_versions qv on qv.id = sr.question_version_id
      join public.questions q on q.id = qv.question_id
      where aa.assessment_id = new.id and aa.status in ('submitted','late')
        and q.question_type in ('short_answer','structured_written')
        and not exists (select 1 from public.final_score_decisions fsd where fsd.response_id = sr.id)
    ) then raise exception 'Written responses require human-governed final scores before release'; end if;

    if exists (
      select 1
      from public.assessment_attempts aa
      join public.student_responses sr on sr.attempt_id = aa.id
      join public.question_versions qv on qv.id = sr.question_version_id
      join public.questions q on q.id = qv.question_id
      where aa.assessment_id = new.id and aa.status in ('submitted','late')
        and q.question_type not in ('short_answer','structured_written','reflection')
        and not exists (select 1 from public.machine_scores ms where ms.response_id = sr.id)
    ) then raise exception 'Objective responses require machine scores before release'; end if;

    if exists (
      select 1 from public.moderation_cases mc
      join public.student_responses sr on sr.id = mc.response_id
      join public.assessment_attempts aa on aa.id = sr.attempt_id
      where aa.assessment_id = new.id and mc.status in ('open','in_review')
    ) then raise exception 'Open moderation cases must be resolved before release'; end if;
  end if;
  return new;
end;
$$;

create trigger assessments_validate_results_release before update of status on public.assessments for each row execute function private.validate_results_release();

create or replace function private.publish_assessment_results()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  released_attempt record;
begin
  if new.status = 'released' and old.status <> 'released' then
    for released_attempt in select id from public.assessment_attempts where assessment_id = new.id and status in ('submitted','late') loop
      perform private.refresh_attempt_result(released_attempt.id);
    end loop;
  end if;
  return new;
end;
$$;

create trigger assessments_publish_results after update of status on public.assessments for each row execute function private.publish_assessment_results();

create or replace function private.refresh_result_after_correction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_attempt uuid;
begin
  select sr.attempt_id into target_attempt from public.student_responses sr where sr.id = new.response_id;
  perform private.refresh_attempt_result(target_attempt);
  return new;
end;
$$;

create trigger final_score_corrections_refresh_released_result after insert on public.final_score_corrections for each row execute function private.refresh_result_after_correction();

create or replace function private.lock_assessment_structure_after_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_assessment uuid;
begin
  target_assessment := case when tg_op = 'DELETE' then old.assessment_id else new.assessment_id end;
  if exists (select 1 from public.assessment_attempts aa where aa.assessment_id = target_assessment) then
    raise exception 'Assessment structure is locked after delivery starts';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger assessment_items_lock_after_delivery before insert or update or delete on public.assessment_items for each row execute function private.lock_assessment_structure_after_delivery();
create trigger assessment_blueprint_lock_after_delivery before insert or update or delete on public.assessment_blueprint for each row execute function private.lock_assessment_structure_after_delivery();

-- Backfill result snapshots for assessments that were released before this migration.
do $$
declare
  released_attempt record;
begin
  for released_attempt in
    select aa.id
    from public.assessment_attempts aa
    join public.assessments a on a.id = aa.assessment_id
    where a.status = 'released' and aa.status in ('submitted','late')
  loop
    perform private.refresh_attempt_result(released_attempt.id);
  end loop;
end;
$$;

alter table public.learner_feedback_records enable row level security;
alter table public.learner_assessment_results enable row level security;
alter table public.learner_item_results enable row level security;
alter table public.learner_objective_results enable row level security;
alter table public.learner_remediation_plans enable row level security;

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
        or (aa.learner_id = auth.uid() and learner_feedback_records.status = 'approved' and a.status = 'released')
      )
  )
);
create policy learner_feedback_records_insert on public.learner_feedback_records for insert to authenticated
with check (auth.uid() = authored_by);
create policy learner_feedback_records_update on public.learner_feedback_records for update to authenticated
using (
  exists (
    select 1 from public.student_responses sr
    join public.assessment_attempts aa on aa.id = sr.attempt_id
    join public.assessments a on a.id = aa.assessment_id
    join public.cohorts c on c.id = a.cohort_id
    where sr.id = learner_feedback_records.response_id
      and private.has_program_role(c.program_id, array['program_director','assessment_lead','reviewer'])
  )
)
with check (
  exists (
    select 1 from public.student_responses sr
    join public.assessment_attempts aa on aa.id = sr.attempt_id
    join public.assessments a on a.id = aa.assessment_id
    join public.cohorts c on c.id = a.cohort_id
    where sr.id = learner_feedback_records.response_id
      and private.has_program_role(c.program_id, array['program_director','assessment_lead','reviewer'])
  )
);

create policy learner_assessment_results_select on public.learner_assessment_results for select to authenticated
using (
  learner_id = auth.uid()
  or exists (
    select 1 from public.assessments a
    join public.cohorts c on c.id = a.cohort_id
    where a.id = learner_assessment_results.assessment_id
      and private.has_program_role(c.program_id, array['program_director','assessment_lead','reviewer'])
  )
);

create policy learner_item_results_select on public.learner_item_results for select to authenticated
using (
  exists (
    select 1 from public.learner_assessment_results lar
    join public.assessments a on a.id = lar.assessment_id
    join public.cohorts c on c.id = a.cohort_id
    where lar.id = learner_item_results.assessment_result_id
      and (lar.learner_id = auth.uid() or private.has_program_role(c.program_id, array['program_director','assessment_lead','reviewer']))
  )
);

create policy learner_objective_results_select on public.learner_objective_results for select to authenticated
using (
  exists (
    select 1 from public.learner_assessment_results lar
    join public.assessments a on a.id = lar.assessment_id
    join public.cohorts c on c.id = a.cohort_id
    where lar.id = learner_objective_results.assessment_result_id
      and (lar.learner_id = auth.uid() or private.has_program_role(c.program_id, array['program_director','assessment_lead','reviewer']))
  )
);

create policy learner_remediation_plans_select on public.learner_remediation_plans for select to authenticated
using (learner_id = auth.uid() or private.has_program_role(program_id, array['program_director','assessment_lead','reviewer']));
create policy learner_remediation_plans_insert on public.learner_remediation_plans for insert to authenticated
with check (created_by = auth.uid() and private.has_program_role(program_id, array['program_director','assessment_lead']));
create policy learner_remediation_plans_update on public.learner_remediation_plans for update to authenticated
using (private.has_program_role(program_id, array['program_director','assessment_lead']))
with check (private.has_program_role(program_id, array['program_director','assessment_lead']));

revoke all on public.learner_feedback_records, public.learner_assessment_results, public.learner_item_results, public.learner_objective_results, public.learner_remediation_plans from anon;
grant select, insert, update on public.learner_feedback_records to authenticated;
grant select on public.learner_assessment_results, public.learner_item_results, public.learner_objective_results to authenticated;
grant select, insert, update on public.learner_remediation_plans to authenticated;

commit;

