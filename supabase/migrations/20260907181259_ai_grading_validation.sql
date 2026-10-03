-- SEIP Hub Stage 8 — AI grading validation and human governance.
-- Stores only aggregate/criterion agreement statistics plus provenance.
-- No learner-level AI-human pairing matrix is persisted.

begin;

create table public.ai_validation_runs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  provider text not null check (char_length(trim(provider)) > 0),
  model text not null check (char_length(trim(model)) > 0),
  prompt_version text not null check (char_length(trim(prompt_version)) > 0),
  rubric_version_id uuid references public.rubric_versions(id),
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  engine_version text not null,
  input_hash text not null,
  config jsonb not null default '{}'::jsonb,
  paired_count integer check (paired_count is null or paired_count >= 0),
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
);

create table public.ai_validation_summary_statistics (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.ai_validation_runs(id) on delete cascade,
  paired_count integer not null check (paired_count >= 0),
  mean_ai_percent numeric(12,6),
  mean_human_percent numeric(12,6),
  mean_bias_pp numeric(12,6),
  sd_difference_pp numeric(12,6),
  mae_pp numeric(12,6),
  rmse_pp numeric(12,6),
  exact_agreement_fraction numeric(12,8) check (exact_agreement_fraction is null or (exact_agreement_fraction >= 0 and exact_agreement_fraction <= 1)),
  within_tolerance_fraction numeric(12,8) check (within_tolerance_fraction is null or (within_tolerance_fraction >= 0 and within_tolerance_fraction <= 1)),
  icc_absolute_agreement numeric(12,8) check (icc_absolute_agreement is null or (icc_absolute_agreement >= -1 and icc_absolute_agreement <= 1)),
  bland_altman_lower_pp numeric(12,6),
  bland_altman_upper_pp numeric(12,6),
  summary_suppressed boolean not null default false,
  icc_suppressed boolean not null default false,
  confidence_error_bands jsonb not null default '{}'::jsonb,
  flags text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

create table public.ai_validation_criterion_statistics (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_validation_runs(id) on delete cascade,
  criterion_id uuid not null references public.rubric_criteria(id),
  criterion_code text not null,
  criterion_title text not null,
  paired_count integer not null check (paired_count >= 0),
  mean_ai_percent numeric(12,6),
  mean_human_percent numeric(12,6),
  mean_bias_pp numeric(12,6),
  mae_pp numeric(12,6),
  rmse_pp numeric(12,6),
  exact_agreement_fraction numeric(12,8) check (exact_agreement_fraction is null or (exact_agreement_fraction >= 0 and exact_agreement_fraction <= 1)),
  within_tolerance_fraction numeric(12,8) check (within_tolerance_fraction is null or (within_tolerance_fraction >= 0 and within_tolerance_fraction <= 1)),
  suppressed boolean not null default false,
  flags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  unique (run_id, criterion_id)
);

create table public.ai_validation_reviews (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.ai_validation_runs(id) on delete cascade,
  decision text not null check (decision in ('continue_advisory', 'revise_configuration', 'pause_ai_assist')),
  rationale text,
  reviewed_by uuid not null references auth.users(id),
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (decision = 'continue_advisory' or nullif(trim(coalesce(rationale, '')), '') is not null)
);

create index ai_validation_runs_program_time_idx on public.ai_validation_runs (program_id, started_at desc);
create index ai_validation_runs_started_by_idx on public.ai_validation_runs (started_by);
create index ai_validation_runs_rubric_version_idx on public.ai_validation_runs (rubric_version_id);
create index ai_validation_criterion_criterion_idx on public.ai_validation_criterion_statistics (criterion_id, run_id);
create index ai_validation_reviews_reviewer_idx on public.ai_validation_reviews (reviewed_by, reviewed_at desc);

create trigger ai_validation_reviews_set_updated_at
before update on public.ai_validation_reviews
for each row execute function private.set_updated_at();

create or replace function private.ai_validation_run_manageable(target_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ai_validation_runs avr
    where avr.id = target_run_id
      and private.has_program_role(avr.program_id, array['program_director', 'assessment_lead']::text[])
  );
$$;

revoke all on function private.ai_validation_run_manageable(uuid) from public, anon, authenticated;

create or replace function private.lock_ai_validation_run()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'AI validation runs are append-only';
  end if;
  if old.status in ('completed', 'failed') then
    raise exception 'Completed or failed AI validation runs are immutable';
  end if;
  if new.id <> old.id
     or new.program_id <> old.program_id
     or new.provider <> old.provider
     or new.model <> old.model
     or new.prompt_version <> old.prompt_version
     or new.engine_version <> old.engine_version
     or new.input_hash <> old.input_hash
     or new.started_by <> old.started_by
     or new.started_at <> old.started_at then
    raise exception 'AI validation run identity/provenance is immutable';
  end if;
  if old.status = 'running' and new.status not in ('running', 'completed', 'failed') then
    raise exception 'Invalid AI validation status transition';
  end if;
  return new;
end;
$$;

revoke all on function private.lock_ai_validation_run() from public, anon, authenticated;

create trigger ai_validation_runs_lock
before update or delete on public.ai_validation_runs
for each row execute function private.lock_ai_validation_run();

create or replace function private.lock_ai_validation_output()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_run_id uuid;
  run_status text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    raise exception 'AI validation statistical outputs are append-only';
  end if;
  target_run_id := new.run_id;
  select status into run_status from public.ai_validation_runs where id = target_run_id;
  if run_status <> 'running' then
    raise exception 'AI validation outputs can only be inserted while a run is active';
  end if;
  return new;
end;
$$;

revoke all on function private.lock_ai_validation_output() from public, anon, authenticated;

create trigger ai_validation_summary_immutable
before insert or update or delete on public.ai_validation_summary_statistics
for each row execute function private.lock_ai_validation_output();

create trigger ai_validation_criterion_immutable
before insert or update or delete on public.ai_validation_criterion_statistics
for each row execute function private.lock_ai_validation_output();

create or replace function private.audit_ai_validation_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_program_id uuid;
begin
  select program_id into target_program_id from public.ai_validation_runs where id = new.run_id;
  insert into public.audit_events(program_id, actor_user_id, event_type, entity_type, entity_id, old_value, new_value)
  values (
    target_program_id,
    auth.uid(),
    'ai_validation.reviewed',
    'ai_validation_run',
    new.run_id::text,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );
  return new;
end;
$$;

revoke all on function private.audit_ai_validation_review() from public, anon, authenticated;

create trigger ai_validation_reviews_audit
after insert or update on public.ai_validation_reviews
for each row execute function private.audit_ai_validation_review();

alter table public.ai_validation_runs enable row level security;
alter table public.ai_validation_summary_statistics enable row level security;
alter table public.ai_validation_criterion_statistics enable row level security;
alter table public.ai_validation_reviews enable row level security;

create policy ai_validation_runs_select on public.ai_validation_runs
for select to authenticated
using (private.has_program_role(program_id, array['program_director', 'assessment_lead', 'reviewer']::text[]));

create policy ai_validation_runs_insert on public.ai_validation_runs
for insert to authenticated
with check (
  started_by = (select auth.uid())
  and private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[])
);

create policy ai_validation_runs_update on public.ai_validation_runs
for update to authenticated
using (private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[]))
with check (private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[]));

create policy ai_validation_summary_select on public.ai_validation_summary_statistics
for select to authenticated
using (
  exists (
    select 1 from public.ai_validation_runs avr
    where avr.id = ai_validation_summary_statistics.run_id
      and private.has_program_role(avr.program_id, array['program_director', 'assessment_lead', 'reviewer']::text[])
  )
);

create policy ai_validation_summary_insert on public.ai_validation_summary_statistics
for insert to authenticated
with check (private.ai_validation_run_manageable(run_id));

create policy ai_validation_criterion_select on public.ai_validation_criterion_statistics
for select to authenticated
using (
  exists (
    select 1 from public.ai_validation_runs avr
    where avr.id = ai_validation_criterion_statistics.run_id
      and private.has_program_role(avr.program_id, array['program_director', 'assessment_lead', 'reviewer']::text[])
  )
);

create policy ai_validation_criterion_insert on public.ai_validation_criterion_statistics
for insert to authenticated
with check (private.ai_validation_run_manageable(run_id));

create policy ai_validation_reviews_select on public.ai_validation_reviews
for select to authenticated
using (
  exists (
    select 1 from public.ai_validation_runs avr
    where avr.id = ai_validation_reviews.run_id
      and private.has_program_role(avr.program_id, array['program_director', 'assessment_lead', 'reviewer']::text[])
  )
);

create policy ai_validation_reviews_insert on public.ai_validation_reviews
for insert to authenticated
with check (
  reviewed_by = (select auth.uid())
  and private.ai_validation_run_manageable(run_id)
  and exists (select 1 from public.ai_validation_runs avr where avr.id = run_id and avr.status = 'completed')
);

create policy ai_validation_reviews_update on public.ai_validation_reviews
for update to authenticated
using (private.ai_validation_run_manageable(run_id))
with check (
  reviewed_by = (select auth.uid())
  and private.ai_validation_run_manageable(run_id)
  and exists (select 1 from public.ai_validation_runs avr where avr.id = run_id and avr.status = 'completed')
);

grant select, insert, update on public.ai_validation_runs to authenticated;
grant select, insert on public.ai_validation_summary_statistics to authenticated;
grant select, insert on public.ai_validation_criterion_statistics to authenticated;
grant select, insert, update on public.ai_validation_reviews to authenticated;

commit;
