-- SEIP Hub Stage 7 — Program Analytics + Psychometrics
-- CTT-first, versioned psychometric runs over released assessment snapshots.
-- No learner-level analysis matrix is persisted; only reproducible run metadata
-- and aggregate/item statistics are stored.

begin
create table public.psychometric_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  engine text not null default 'seip_python_ctt',
  engine_version text not null,
  input_hash text not null,
  config jsonb not null default '{}'::jsonb,
  sample_size integer check (sample_size is null or sample_size >= 0),
  objective_item_count integer check (objective_item_count is null or objective_item_count >= 0),
  started_by uuid not null references auth.users(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  check (
    (status = 'running' and completed_at is null and error_message is null)
    or (status = 'completed' and completed_at is not null and error_message is null)
    or (status = 'failed' and completed_at is not null and error_message is not null)
  )
)
create table public.psychometric_test_statistics (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.psychometric_analysis_runs(id) on delete cascade,
  examinee_count integer not null check (examinee_count >= 0),
  objective_item_count integer not null check (objective_item_count >= 0),
  mean_score numeric(12,6),
  sd_score numeric(12,6),
  median_score numeric(12,6),
  min_score numeric(12,6),
  max_score numeric(12,6),
  kr20 numeric(12,8),
  sem numeric(12,8),
  created_at timestamptz not null default now()
)
create table public.psychometric_item_statistics (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.psychometric_analysis_runs(id) on delete cascade,
  question_version_id uuid not null references public.question_versions(id),
  position integer not null check (position > 0),
  question_code text not null,
  stem_snapshot text not null,
  examinee_count integer not null check (examinee_count >= 0),
  keyed_option_position integer check (keyed_option_position is null or keyed_option_position > 0),
  p_value numeric(12,8) check (p_value is null or (p_value >= 0 and p_value <= 1)),
  point_biserial numeric(12,8) check (point_biserial is null or (point_biserial >= -1 and point_biserial <= 1)),
  omitted_count integer not null default 0 check (omitted_count >= 0),
  distractor_counts jsonb not null default '{}'::jsonb,
  flags text[] not null default '{}'::text[],
  difficulty_suppressed boolean not null default false,
  discrimination_suppressed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (run_id, question_version_id),
  unique (run_id, position)
)
create table public.psychometric_item_reviews (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.psychometric_analysis_runs(id) on delete cascade,
  question_version_id uuid not null references public.question_versions(id),
  decision text not null check (decision in ('retain', 'revise', 'retire_candidate')),
  rationale text,
  reviewed_by uuid not null references auth.users(id),
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, question_version_id),
  check (decision = 'retain' or nullif(trim(coalesce(rationale, '')), '') is not null)
)
create index psychometric_runs_program_time_idx on public.psychometric_analysis_runs (program_id, started_at desc)
create index psychometric_runs_assessment_time_idx on public.psychometric_analysis_runs (assessment_id, started_at desc)
create index psychometric_runs_cohort_idx on public.psychometric_analysis_runs (cohort_id, started_at desc)
create index psychometric_runs_started_by_idx on public.psychometric_analysis_runs (started_by)
create index psychometric_item_statistics_question_idx on public.psychometric_item_statistics (question_version_id, run_id)
create index psychometric_item_reviews_question_idx on public.psychometric_item_reviews (question_version_id, reviewed_at desc)
create index psychometric_item_reviews_reviewer_idx on public.psychometric_item_reviews (reviewed_by, reviewed_at desc)
create trigger psychometric_item_reviews_set_updated_at
before update on public.psychometric_item_reviews
for each row execute function private.set_updated_at()
create or replace function private.validate_psychometric_run()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_program_id uuid;
  expected_cohort_id uuid;
  assessment_status text;
begin
  select c.program_id, a.cohort_id, a.status
    into expected_program_id, expected_cohort_id, assessment_status
  from public.assessments a
  join public.cohorts c on c.id = a.cohort_id
  where a.id = new.assessment_id;

  if expected_program_id is null then
    raise exception 'Assessment not found for psychometric analysis';
  end if;
  if expected_program_id <> new.program_id or expected_cohort_id <> new.cohort_id then
    raise exception 'Psychometric run must match assessment program and cohort';
  end if;
  if assessment_status <> 'released' then
    raise exception 'Psychometric analysis is restricted to released assessments';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'running' then raise exception 'Psychometric run must start in running state'; end if;
    if new.started_by <> auth.uid() then raise exception 'Psychometric run actor mismatch'; end if;
    return new;
  end if;

  if old.status <> 'running' then
    raise exception 'Completed or failed psychometric runs are immutable';
  end if;
  if new.id <> old.id
     or new.program_id <> old.program_id
     or new.assessment_id <> old.assessment_id
     or new.cohort_id <> old.cohort_id
     or new.engine <> old.engine
     or new.engine_version <> old.engine_version
     or new.input_hash <> old.input_hash
     or new.config <> old.config
     or new.started_by <> old.started_by
     or new.started_at <> old.started_at then
    raise exception 'Psychometric run identity and input provenance are immutable';
  end if;
  if new.status not in ('completed', 'failed') then
    raise exception 'Running psychometric run can only complete or fail';
  end if;
  if new.status = 'completed' then
    if new.sample_size is null or new.objective_item_count is null then
      raise exception 'Completed psychometric run requires sample and objective-item counts';
    end if;
    if not exists (
      select 1 from public.psychometric_test_statistics pts
      where pts.run_id = new.id
        and pts.examinee_count = new.sample_size
        and pts.objective_item_count = new.objective_item_count
    ) then
      raise exception 'Completed psychometric run requires matching test statistics';
    end if;
    if (select count(*) from public.psychometric_item_statistics pis where pis.run_id = new.id) <> new.objective_item_count then
      raise exception 'Completed psychometric run requires one item-statistic row per objective item';
    end if;
  end if;
  if new.completed_at is null then new.completed_at := now(); end if;
  return new;
end;
$$
create trigger psychometric_analysis_runs_validate
before insert or update on public.psychometric_analysis_runs
for each row execute function private.validate_psychometric_run()
create or replace function private.lock_psychometric_output()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and exists (
    select 1 from public.psychometric_analysis_runs par
    where par.id = old.run_id and par.status = 'running'
  ) then
    return old;
  end if;
  raise exception 'Psychometric analysis outputs are immutable after a run finishes; create a new analysis run instead';
end;
$$
create trigger psychometric_test_statistics_immutable
before update or delete on public.psychometric_test_statistics
for each row execute function private.lock_psychometric_output()
create trigger psychometric_item_statistics_immutable
before update or delete on public.psychometric_item_statistics
for each row execute function private.lock_psychometric_output()
create or replace function private.psychometric_output_run_is_running(target_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.psychometric_analysis_runs par
    where par.id = target_run_id
      and par.status = 'running'
      and private.has_program_role(par.program_id, array['program_director', 'assessment_lead']::text[])
  );
$$
create or replace function private.validate_psychometric_item_statistic()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_position integer;
  expected_type text;
begin
  select ai.position, q.question_type
    into expected_position, expected_type
  from public.psychometric_analysis_runs par
  join public.assessment_items ai on ai.assessment_id = par.assessment_id
  join public.question_versions qv on qv.id = ai.question_version_id
  join public.questions q on q.id = qv.question_id
  where par.id = new.run_id
    and ai.question_version_id = new.question_version_id;

  if expected_position is null or expected_type <> 'single_best_answer' then
    raise exception 'Psychometric item statistics must belong to a Single Best Answer item in the analyzed assessment';
  end if;
  if expected_position <> new.position then
    raise exception 'Psychometric item position must match the released assessment structure';
  end if;
  return new;
end;
$$
create trigger psychometric_item_statistics_validate
before insert on public.psychometric_item_statistics
for each row execute function private.validate_psychometric_item_statistic()
create or replace function private.validate_psychometric_item_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.psychometric_analysis_runs par
    join public.psychometric_item_statistics pis on pis.run_id = par.id
    where par.id = new.run_id
      and par.status = 'completed'
      and pis.question_version_id = new.question_version_id
  ) then
    raise exception 'Item review requires a completed run and matching item statistic';
  end if;

  if tg_op = 'UPDATE' and (new.id <> old.id or new.run_id <> old.run_id or new.question_version_id <> old.question_version_id) then
    raise exception 'Psychometric item review identity is immutable';
  end if;
  if new.reviewed_by <> auth.uid() then
    raise exception 'Psychometric item review actor mismatch';
  end if;
  new.reviewed_at := now();
  return new;
end;
$$
create trigger psychometric_item_reviews_validate
before insert or update on public.psychometric_item_reviews
for each row execute function private.validate_psychometric_item_review()
create or replace function private.audit_psychometric_run()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_events(program_id, actor_user_id, event_type, entity_type, entity_id, old_value, new_value)
  values (
    new.program_id,
    auth.uid(),
    case when tg_op = 'INSERT' then 'psychometrics.run_started' else 'psychometrics.run_finished' end,
    'psychometric_analysis_run',
    new.id::text,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );
  return new;
end;
$$
create trigger psychometric_analysis_runs_audit
  after insert or update of status on public.psychometric_analysis_runs
  for each row execute function private.audit_psychometric_run()
create or replace function private.audit_psychometric_item_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_program_id uuid;
begin
  select par.program_id into target_program_id
  from public.psychometric_analysis_runs par
  where par.id = new.run_id;

  insert into public.audit_events(program_id, actor_user_id, event_type, entity_type, entity_id, old_value, new_value)
  values (
    target_program_id,
    auth.uid(),
    case when tg_op = 'INSERT' then 'psychometrics.item_reviewed' else 'psychometrics.item_review_updated' end,
    'psychometric_item_review',
    new.id::text,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );
  return new;
end;
$$
create trigger psychometric_item_reviews_audit
  after insert or update on public.psychometric_item_reviews
  for each row execute function private.audit_psychometric_item_review()
alter table public.psychometric_analysis_runs enable row level security
alter table public.psychometric_test_statistics enable row level security
alter table public.psychometric_item_statistics enable row level security
alter table public.psychometric_item_reviews enable row level security
create policy psychometric_analysis_runs_select
on public.psychometric_analysis_runs
for select
to authenticated
using (private.has_program_role(program_id, array['program_director', 'assessment_lead', 'reviewer']::text[]))
create policy psychometric_analysis_runs_insert
on public.psychometric_analysis_runs
for insert
to authenticated
with check (
  started_by = (select auth.uid())
  and private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[])
)
create policy psychometric_analysis_runs_update
on public.psychometric_analysis_runs
for update
to authenticated
using (status = 'running' and private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[]))
with check (private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[]))
create policy psychometric_test_statistics_select
on public.psychometric_test_statistics
for select
to authenticated
using (
  exists (
    select 1 from public.psychometric_analysis_runs par
    where par.id = psychometric_test_statistics.run_id
      and private.has_program_role(par.program_id, array['program_director', 'assessment_lead', 'reviewer']::text[])
  )
)
create policy psychometric_test_statistics_insert
on public.psychometric_test_statistics
for insert
to authenticated
with check (private.psychometric_output_run_is_running(run_id))
create policy psychometric_test_statistics_delete_running
on public.psychometric_test_statistics
for delete
to authenticated
using (private.psychometric_output_run_is_running(run_id))
create policy psychometric_item_statistics_select
on public.psychometric_item_statistics
for select
to authenticated
using (
  exists (
    select 1 from public.psychometric_analysis_runs par
    where par.id = psychometric_item_statistics.run_id
      and private.has_program_role(par.program_id, array['program_director', 'assessment_lead', 'reviewer']::text[])
  )
)
create policy psychometric_item_statistics_insert
on public.psychometric_item_statistics
for insert
to authenticated
with check (private.psychometric_output_run_is_running(run_id))
create policy psychometric_item_statistics_delete_running
on public.psychometric_item_statistics
for delete
to authenticated
using (private.psychometric_output_run_is_running(run_id))
create policy psychometric_item_reviews_select
on public.psychometric_item_reviews
for select
to authenticated
using (
  exists (
    select 1 from public.psychometric_analysis_runs par
    where par.id = psychometric_item_reviews.run_id
      and private.has_program_role(par.program_id, array['program_director', 'assessment_lead', 'reviewer']::text[])
  )
)
create policy psychometric_item_reviews_insert
on public.psychometric_item_reviews
for insert
to authenticated
with check (
  reviewed_by = (select auth.uid())
  and exists (
    select 1 from public.psychometric_analysis_runs par
    where par.id = psychometric_item_reviews.run_id
      and private.has_program_role(par.program_id, array['program_director', 'assessment_lead', 'reviewer']::text[])
  )
)
create policy psychometric_item_reviews_update
on public.psychometric_item_reviews
for update
to authenticated
using (
  exists (
    select 1 from public.psychometric_analysis_runs par
    where par.id = psychometric_item_reviews.run_id
      and private.has_program_role(par.program_id, array['program_director', 'assessment_lead', 'reviewer']::text[])
  )
)
with check (
  reviewed_by = (select auth.uid())
  and exists (
    select 1 from public.psychometric_analysis_runs par
    where par.id = psychometric_item_reviews.run_id
      and private.has_program_role(par.program_id, array['program_director', 'assessment_lead', 'reviewer']::text[])
  )
)
grant select, insert, update on public.psychometric_analysis_runs to authenticated
grant select, insert, delete on public.psychometric_test_statistics to authenticated
grant select, insert, delete on public.psychometric_item_statistics to authenticated
grant select, insert, update on public.psychometric_item_reviews to authenticated
revoke delete on public.psychometric_analysis_runs from authenticated
revoke update, delete on public.psychometric_test_statistics from authenticated
revoke update, delete on public.psychometric_item_statistics from authenticated
revoke delete on public.psychometric_item_reviews from authenticated
-- Re-grant DELETE only through RLS for temporary cleanup while a run is still running.
-- PostgreSQL table privileges are checked before RLS, so DELETE is granted narrowly here;
-- the immutable triggers still reject output deletion after a run completes.
grant delete on public.psychometric_test_statistics, public.psychometric_item_statistics to authenticated
revoke all on function private.validate_psychometric_run() from public
revoke all on function private.lock_psychometric_output() from public
revoke all on function private.validate_psychometric_item_statistic() from public
revoke all on function private.validate_psychometric_item_review() from public
revoke all on function private.psychometric_output_run_is_running(uuid) from public
revoke all on function private.audit_psychometric_run() from public
revoke all on function private.audit_psychometric_item_review() from public
grant execute on function private.psychometric_output_run_is_running(uuid) to authenticated
commit
