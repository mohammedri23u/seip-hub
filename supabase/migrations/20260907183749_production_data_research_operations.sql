create table public.program_data_governance (
  program_id uuid primary key references public.programs(id) on delete cascade,
  policy_version text not null check (char_length(trim(policy_version)) > 0),
  require_explicit_research_consent boolean not null default true,
  require_research_export_approval boolean not null default true check (require_research_export_approval = true),
  retention_days integer check (retention_days is null or retention_days >= 30),
  aggregate_min_cell_n integer not null default 5 check (aggregate_min_cell_n between 3 and 50),
  exclude_free_text_from_exports boolean not null default true check (exclude_free_text_from_exports = true),
  data_controller_contact text,
  privacy_notice_url text,
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.research_consent_records (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  learner_id uuid not null references auth.users(id),
  status text not null check (status in ('granted', 'declined', 'withdrawn', 'not_required')),
  policy_version text not null check (char_length(trim(policy_version)) > 0),
  basis_note text,
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, learner_id, policy_version),
  check ((status = 'withdrawn' and withdrawn_at is not null) or status <> 'withdrawn')
);

create table public.data_import_batches (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  entity_type text not null check (entity_type in ('learning_objectives', 'existing_learner_memberships', 'sessions', 'question_bank_sba', 'attendance', 'research_consent')),
  source_filename text not null,
  source_checksum text not null check (char_length(source_checksum) = 64),
  status text not null default 'staged' check (status in ('staged', 'applying', 'completed', 'completed_with_errors', 'failed')),
  total_rows integer not null check (total_rows > 0 and total_rows <= 250),
  valid_rows integer not null default 0 check (valid_rows >= 0),
  applied_rows integer not null default 0 check (applied_rows >= 0),
  skipped_rows integer not null default 0 check (skipped_rows >= 0),
  error_rows integer not null default 0 check (error_rows >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (valid_rows <= total_rows),
  check (applied_rows + skipped_rows <= valid_rows),
  check (error_rows <= total_rows)
);

create table public.data_import_rows (
  id bigint generated always as identity primary key,
  batch_id uuid not null references public.data_import_batches(id) on delete cascade,
  row_number integer not null check (row_number >= 2),
  payload jsonb not null,
  status text not null check (status in ('staged', 'applied', 'skipped', 'error')),
  validation_errors text[] not null default '{}'::text[],
  apply_message text,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  unique (batch_id, row_number)
);

create table public.research_export_requests (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  purpose text not null check (char_length(trim(purpose)) >= 10),
  dataset_key text not null default 'longitudinal_core_v1' check (dataset_key = 'longitudinal_core_v1'),
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'generated')),
  scope jsonb not null default '{}'::jsonb,
  requested_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'requested' and approved_by is null and decided_at is null)
    or (status = 'approved' and approved_by is not null and decided_at is not null and expires_at is not null)
    or (status = 'rejected' and decided_at is not null)
    or (status = 'generated' and approved_by is not null and decided_at is not null)
  )
);

create table public.research_export_manifests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.research_export_requests(id) on delete cascade,
  generated_by uuid not null references auth.users(id),
  generated_at timestamptz not null default now(),
  row_count integer not null check (row_count >= 0),
  record_counts jsonb not null default '{}'::jsonb,
  file_sha256 text not null check (char_length(file_sha256) = 64),
  column_set text[] not null,
  pseudonymization_version text not null check (pseudonymization_version = 'hmac-sha256-v1'),
  warnings text[] not null default '{}'::text[]
);

create table public.program_evaluation_measures (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  framework text not null check (framework in ('cipp', 'kirkpatrick', 'custom')),
  domain text not null check (char_length(trim(domain)) > 0),
  code text not null check (char_length(trim(code)) > 0),
  title text not null check (char_length(trim(title)) > 0),
  description text,
  unit text,
  source_type text not null default 'manual' check (source_type in ('manual', 'system')),
  active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, code)
);

create table public.program_evaluation_observations (
  id uuid primary key default gen_random_uuid(),
  measure_id uuid not null references public.program_evaluation_measures(id) on delete cascade,
  period_start date,
  period_end date,
  numeric_value numeric,
  text_value text,
  sample_size integer check (sample_size is null or sample_size >= 0),
  evidence_note text,
  source_reference text,
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (numeric_value is not null or nullif(trim(coalesce(text_value, '')), '') is not null),
  check (period_start is null or period_end is null or period_end >= period_start)
);

create index program_data_governance_updated_by_idx on public.program_data_governance(updated_by);
create index research_consent_program_learner_idx on public.research_consent_records(program_id, learner_id);
create index research_consent_recorded_by_idx on public.research_consent_records(recorded_by);
create index data_import_batches_program_time_idx on public.data_import_batches(program_id, created_at desc);
create index data_import_batches_created_by_idx on public.data_import_batches(created_by);
create index data_import_rows_batch_status_idx on public.data_import_rows(batch_id, status, row_number);
create index research_export_requests_program_time_idx on public.research_export_requests(program_id, requested_at desc);
create index research_export_requests_requested_by_idx on public.research_export_requests(requested_by);
create index research_export_requests_approved_by_idx on public.research_export_requests(approved_by);
create index research_export_manifests_generated_by_idx on public.research_export_manifests(generated_by);
create index program_evaluation_measures_created_by_idx on public.program_evaluation_measures(created_by);
create index program_evaluation_observations_measure_time_idx on public.program_evaluation_observations(measure_id, recorded_at desc);
create index program_evaluation_observations_recorded_by_idx on public.program_evaluation_observations(recorded_by);

create trigger program_data_governance_set_updated_at before update on public.program_data_governance for each row execute function private.set_updated_at();
create trigger research_consent_records_set_updated_at before update on public.research_consent_records for each row execute function private.set_updated_at();
create trigger research_export_requests_set_updated_at before update on public.research_export_requests for each row execute function private.set_updated_at();
create trigger program_evaluation_measures_set_updated_at before update on public.program_evaluation_measures for each row execute function private.set_updated_at();
create trigger program_evaluation_observations_set_updated_at before update on public.program_evaluation_observations for each row execute function private.set_updated_at();

create or replace function private.lock_research_export_manifest()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    raise exception 'Research export manifests are immutable';
  end if;
  return new;
end;
$$;
revoke all on function private.lock_research_export_manifest() from public, anon, authenticated;
create trigger research_export_manifests_immutable before update or delete on public.research_export_manifests for each row execute function private.lock_research_export_manifest();

create or replace function private.validate_research_export_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.program_id <> new.program_id or old.purpose <> new.purpose or old.dataset_key <> new.dataset_key or old.requested_by <> new.requested_by or old.requested_at <> new.requested_at then
    raise exception 'Research export request provenance is immutable';
  end if;
  if old.status = 'requested' and new.status not in ('requested', 'approved', 'rejected') then
    raise exception 'Invalid research export transition';
  elsif old.status = 'approved' and new.status not in ('approved', 'generated') then
    raise exception 'Approved export can only be generated';
  elsif old.status in ('rejected', 'generated') and new.status <> old.status then
    raise exception 'Closed research export request is immutable';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_research_export_transition() from public, anon, authenticated;
create trigger research_export_requests_validate_transition before update on public.research_export_requests for each row execute function private.validate_research_export_transition();

create or replace function private.audit_operations_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_json jsonb;
  target_program_id uuid;
  event_name text;
begin
  record_json := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_program_id := nullif(record_json->>'program_id', '')::uuid;
  if tg_table_name = 'program_data_governance' then event_name := 'data_governance.changed';
  elsif tg_table_name = 'research_consent_records' then event_name := 'research_permission.changed';
  elsif tg_table_name = 'data_import_batches' then event_name := 'data_import.changed';
  elsif tg_table_name = 'research_export_requests' then event_name := 'research_export.changed';
  else return coalesce(new, old);
  end if;
  insert into public.audit_events(program_id, actor_user_id, event_type, entity_type, entity_id, old_value, new_value)
  values (target_program_id, auth.uid(), event_name, tg_table_name, record_json->>'id', case when tg_op = 'UPDATE' then to_jsonb(old) else null end, case when tg_op = 'DELETE' then null else to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;
revoke all on function private.audit_operations_event() from public, anon, authenticated;
create trigger program_data_governance_audit after insert or update on public.program_data_governance for each row execute function private.audit_operations_event();
create trigger research_consent_records_audit after insert or update on public.research_consent_records for each row execute function private.audit_operations_event();
create trigger data_import_batches_audit after insert or update on public.data_import_batches for each row execute function private.audit_operations_event();
create trigger research_export_requests_audit after insert or update on public.research_export_requests for each row execute function private.audit_operations_event();

alter table public.program_data_governance enable row level security;
alter table public.research_consent_records enable row level security;
alter table public.data_import_batches enable row level security;
alter table public.data_import_rows enable row level security;
alter table public.research_export_requests enable row level security;
alter table public.research_export_manifests enable row level security;
alter table public.program_evaluation_measures enable row level security;
alter table public.program_evaluation_observations enable row level security;

create policy program_data_governance_select on public.program_data_governance for select to authenticated using (private.has_program_role(program_id, array['program_director', 'assessment_lead', 'reviewer']::text[]));
create policy program_data_governance_insert on public.program_data_governance for insert to authenticated with check (updated_by = (select auth.uid()) and private.has_program_role(program_id, array['program_director']::text[]));
create policy program_data_governance_update on public.program_data_governance for update to authenticated using (private.has_program_role(program_id, array['program_director']::text[])) with check (updated_by = (select auth.uid()) and private.has_program_role(program_id, array['program_director']::text[]));

create policy research_consent_records_select on public.research_consent_records for select to authenticated using (learner_id = (select auth.uid()) or private.has_program_role(program_id, array['program_director', 'assessment_lead', 'reviewer']::text[]));
create policy research_consent_records_insert on public.research_consent_records for insert to authenticated with check (recorded_by = (select auth.uid()) and private.has_program_role(program_id, array['program_director']::text[]));
create policy research_consent_records_update on public.research_consent_records for update to authenticated using (private.has_program_role(program_id, array['program_director']::text[])) with check (recorded_by = (select auth.uid()) and private.has_program_role(program_id, array['program_director']::text[]));

create policy data_import_batches_select on public.data_import_batches for select to authenticated using (private.has_program_role(program_id, array['program_director']::text[]));
create policy data_import_batches_insert on public.data_import_batches for insert to authenticated with check (created_by = (select auth.uid()) and private.has_program_role(program_id, array['program_director']::text[]));
create policy data_import_batches_update on public.data_import_batches for update to authenticated using (private.has_program_role(program_id, array['program_director']::text[])) with check (private.has_program_role(program_id, array['program_director']::text[]));
create policy data_import_batches_delete on public.data_import_batches for delete to authenticated using (status = 'staged' and private.has_program_role(program_id, array['program_director']::text[]));

create policy data_import_rows_select on public.data_import_rows for select to authenticated using (exists (select 1 from public.data_import_batches dib where dib.id = data_import_rows.batch_id and private.has_program_role(dib.program_id, array['program_director']::text[])));
create policy data_import_rows_insert on public.data_import_rows for insert to authenticated with check (exists (select 1 from public.data_import_batches dib where dib.id = data_import_rows.batch_id and private.has_program_role(dib.program_id, array['program_director']::text[])));
create policy data_import_rows_update on public.data_import_rows for update to authenticated using (exists (select 1 from public.data_import_batches dib where dib.id = data_import_rows.batch_id and private.has_program_role(dib.program_id, array['program_director']::text[]))) with check (exists (select 1 from public.data_import_batches dib where dib.id = data_import_rows.batch_id and private.has_program_role(dib.program_id, array['program_director']::text[])));

create policy research_export_requests_select on public.research_export_requests for select to authenticated using (private.has_program_role(program_id, array['program_director', 'assessment_lead', 'reviewer']::text[]));
create policy research_export_requests_insert on public.research_export_requests for insert to authenticated with check (requested_by = (select auth.uid()) and private.has_program_role(program_id, array['program_director', 'assessment_lead', 'reviewer']::text[]));
create policy research_export_requests_update on public.research_export_requests for update to authenticated using (private.has_program_role(program_id, array['program_director']::text[])) with check (private.has_program_role(program_id, array['program_director']::text[]));

create policy research_export_manifests_select on public.research_export_manifests for select to authenticated using (exists (select 1 from public.research_export_requests rer where rer.id = research_export_manifests.request_id and private.has_program_role(rer.program_id, array['program_director', 'assessment_lead', 'reviewer']::text[])));
create policy research_export_manifests_insert on public.research_export_manifests for insert to authenticated with check (generated_by = (select auth.uid()) and exists (select 1 from public.research_export_requests rer where rer.id = research_export_manifests.request_id and rer.status in ('approved', 'generated') and private.has_program_role(rer.program_id, array['program_director', 'assessment_lead']::text[])));

create policy program_evaluation_measures_select on public.program_evaluation_measures for select to authenticated using (private.is_program_member(program_id));
create policy program_evaluation_measures_insert on public.program_evaluation_measures for insert to authenticated with check (created_by = (select auth.uid()) and private.has_program_role(program_id, array['program_director']::text[]));
create policy program_evaluation_measures_update on public.program_evaluation_measures for update to authenticated using (private.has_program_role(program_id, array['program_director']::text[])) with check (private.has_program_role(program_id, array['program_director']::text[]));

create policy program_evaluation_observations_select on public.program_evaluation_observations for select to authenticated using (exists (select 1 from public.program_evaluation_measures pem where pem.id = program_evaluation_observations.measure_id and private.is_program_member(pem.program_id)));
create policy program_evaluation_observations_insert on public.program_evaluation_observations for insert to authenticated with check (recorded_by = (select auth.uid()) and exists (select 1 from public.program_evaluation_measures pem where pem.id = program_evaluation_observations.measure_id and private.has_program_role(pem.program_id, array['program_director']::text[])));

grant select, insert, update on public.program_data_governance to authenticated;
grant select, insert, update on public.research_consent_records to authenticated;
grant select, insert, update, delete on public.data_import_batches to authenticated;
grant select, insert, update on public.data_import_rows to authenticated;
grant select, insert, update on public.research_export_requests to authenticated;
grant select, insert on public.research_export_manifests to authenticated;
grant select, insert, update on public.program_evaluation_measures to authenticated;
grant select, insert on public.program_evaluation_observations to authenticated;
