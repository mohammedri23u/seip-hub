create or replace function private.audit_operations_event()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  record_json jsonb;
  target_program_id uuid;
  event_name text;
begin
  record_json := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_program_id := nullif(record_json->>'program_id','')::uuid;
  if tg_table_name='program_data_governance' then event_name:='data_governance.changed';
  elsif tg_table_name='research_consent_records' then event_name:='research_permission.changed';
  elsif tg_table_name='data_import_batches' then event_name:='data_import.changed';
  elsif tg_table_name='research_export_requests' then event_name:='research_export.changed';
  elsif tg_table_name='program_assessment_quality_settings' then event_name:='assessment_quality.changed';
  elsif tg_table_name='grading_quality_samples' then event_name:='grading_quality_sample.changed';
  else return coalesce(new,old); end if;

  insert into public.audit_events(program_id,actor_user_id,event_type,entity_type,entity_id,old_value,new_value)
  values(target_program_id,auth.uid(),event_name,tg_table_name,record_json->>'id',
    case when tg_op='UPDATE' then to_jsonb(old) else null end,
    case when tg_op='DELETE' then null else to_jsonb(new) end);
  return coalesce(new,old);
end;
$$;

drop trigger if exists program_assessment_quality_settings_audit on public.program_assessment_quality_settings;
create trigger program_assessment_quality_settings_audit
after insert or update on public.program_assessment_quality_settings
for each row execute function private.audit_operations_event();

drop trigger if exists program_assessment_quality_settings_set_updated_at on public.program_assessment_quality_settings;
create trigger program_assessment_quality_settings_set_updated_at
before update on public.program_assessment_quality_settings
for each row execute function private.set_updated_at();

drop trigger if exists grading_quality_samples_audit on public.grading_quality_samples;
create trigger grading_quality_samples_audit
after insert or update on public.grading_quality_samples
for each row execute function private.audit_operations_event();

drop trigger if exists grading_quality_samples_set_updated_at on public.grading_quality_samples;
create trigger grading_quality_samples_set_updated_at
before update on public.grading_quality_samples
for each row execute function private.set_updated_at();

create or replace function public.record_research_consent(target_program_id uuid, decision text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  consent_version text;
  record_id uuid;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if decision not in ('granted','declined') then raise exception 'Decision must be granted or declined'; end if;
  if not exists(
    select 1 from public.cohort_memberships cm join public.cohorts c on c.id=cm.cohort_id
    where c.program_id=target_program_id and cm.user_id=uid and cm.member_type='learner' and cm.status='active'
  ) then raise exception 'Active learner membership required' using errcode='42501'; end if;

  select pjs.consent_version into consent_version
  from public.program_journey_settings pjs
  where pjs.program_id=target_program_id and pjs.active limit 1;
  if consent_version is null then raise exception 'Research consent version is not configured'; end if;

  insert into public.research_consent_records(program_id,learner_id,status,policy_version,recorded_by,withdrawn_at)
  values(target_program_id,uid,decision,consent_version,uid,null)
  on conflict(program_id,learner_id,policy_version) do update
    set status=excluded.status,recorded_by=excluded.recorded_by,recorded_at=now(),withdrawn_at=null
  returning id into record_id;

  return jsonb_build_object('id',record_id,'status',decision,'policy_version',consent_version);
end;
$$;

create or replace function public.withdraw_research_consent(target_program_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  consent_version text;
  record_id uuid;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select pjs.consent_version into consent_version
  from public.program_journey_settings pjs where pjs.program_id=target_program_id and pjs.active limit 1;
  if consent_version is null then raise exception 'Research consent version is not configured'; end if;

  select id into record_id from public.research_consent_records
  where program_id=target_program_id and learner_id=uid and policy_version=consent_version;
  if record_id is null then raise exception 'No current consent record to withdraw'; end if;

  update public.research_consent_records
  set status='withdrawn',withdrawn_at=now(),recorded_by=uid
  where id=record_id;

  return jsonb_build_object('id',record_id,'status','withdrawn','policy_version',consent_version);
end;
$$;
