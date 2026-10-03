-- Additive launch controls; no ethics approval is inferred or seeded.
alter table public.program_data_governance
 add column ethics_status text not null default 'pending' check (ethics_status in ('pending','approved','suspended','rejected')),
 add column ethics_reference text,
 add column ethics_evidence_url text,
 add column ethics_approved_at date,
 add constraint ethics_evidence_required check (ethics_status <> 'approved' or (coalesce(length(trim(ethics_reference)),0) > 0 and coalesce(ethics_evidence_url,'') like 'https://%' and ethics_approved_at is not null));
create table public.research_information_versions (
 program_id uuid not null references public.programs(id), version text not null,
 participant_information text not null check(length(trim(participant_information)) >= 100),
 withdrawal_information text not null check(length(trim(withdrawal_information)) >= 20),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 primary key(program_id,version)
);
alter table public.research_information_versions enable row level security;
revoke all on public.research_information_versions from anon, authenticated;
grant select,insert on public.research_information_versions to authenticated;
create policy research_information_read on public.research_information_versions for select to authenticated using (
 private.has_program_role(program_id,array['program_director','assessment_lead','reviewer']) or exists (
 select 1 from public.cohort_memberships cm join public.cohorts c on c.id=cm.cohort_id where c.program_id=research_information_versions.program_id and cm.user_id=(select auth.uid()) and cm.status in ('active','completed')));
create policy research_information_publish on public.research_information_versions for insert to authenticated with check(private.has_program_role(program_id,array['program_director']) and created_by=(select auth.uid()));
create or replace function private.guard_research_consent() returns trigger language plpgsql security definer set search_path='' as $$
declare g public.program_data_governance; v text;
begin
 select * into g from public.program_data_governance where program_id=new.program_id;
 select consent_version into v from public.program_journey_settings where program_id=new.program_id and active;
 if new.status='granted' then
  if g.ethics_status is distinct from 'approved' or g.retention_days is null or nullif(trim(g.data_controller_contact),'') is null or g.privacy_notice_url not like 'https://%' then raise exception 'Research consent is pending approved information and ethics governance'; end if;
  if new.policy_version is distinct from v or not exists(select 1 from public.research_information_versions where program_id=new.program_id and version=v) then raise exception 'Published current participant information required'; end if;
  if new.learner_id is distinct from auth.uid() or new.recorded_by is distinct from auth.uid() then raise exception 'Research consent must be the participant own explicit choice'; end if;
 end if;
 return new;
end $$;
create trigger research_consent_launch_guard before insert or update on public.research_consent_records for each row execute function private.guard_research_consent();
create or replace function public.withdraw_research_consent(target_program_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 update public.research_consent_records set status='withdrawn',withdrawn_at=now(),recorded_by=auth.uid(),updated_at=now() where program_id=target_program_id and learner_id=auth.uid() and status='granted';
 insert into public.audit_events(program_id,actor_user_id,event_type,entity_type,entity_id,new_value) values(target_program_id,auth.uid(),'research.withdrawn','research_consent',auth.uid()::text,'{"scope":"all_versions"}');
 return public.research_consent_state(target_program_id);
end $$;
-- Remove the obsolete policy-version alias, preserving its public contract.
create or replace function public.set_research_consent(target_program_id uuid, requested_status text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if requested_status='withdrawn' then return public.withdraw_research_consent(target_program_id); end if;
 return public.record_research_consent(target_program_id,requested_status);
end $$;
create or replace function private.guard_export_approval() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' and new.status<>'requested' then raise exception 'Exports start as requests'; end if;
 if new.status in ('approved','generated') then
  if not exists(select 1 from public.program_data_governance g where g.program_id=new.program_id and g.ethics_status='approved' and g.retention_days is not null and nullif(trim(g.data_controller_contact),'') is not null and g.privacy_notice_url like 'https://%') then raise exception 'Research approval and governance required'; end if;
  if new.approved_by is null or new.approved_by=new.requested_by then raise exception 'Independent approval required'; end if;
 end if;
 if tg_op='UPDATE' and new.status='approved' and old.status='requested' and (new.approved_by is distinct from auth.uid() or not private.has_program_role(new.program_id,array['program_director'])) then raise exception 'Program Director approval required'; end if;
 return new;
end $$;
create trigger research_export_launch_guard before insert or update on public.research_export_requests for each row execute function private.guard_export_approval();
create table private.research_pseudonym_keys(program_id uuid primary key references public.programs(id), key bytea not null default extensions.gen_random_bytes(32));
revoke all on private.research_pseudonym_keys from public,anon,authenticated;
create or replace function public.generate_research_export(target_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.research_export_requests; v text; k bytea; payload jsonb; rows_json jsonb;
begin
 select * into r from public.research_export_requests where id=target_request_id for update;
 if r.id is null or auth.uid() is null or not private.has_program_role(r.program_id,array['program_director','assessment_lead','reviewer']) or r.requested_by<>auth.uid() then raise exception 'Export requester access required' using errcode='42501'; end if;
 if r.status<>'approved' or r.expires_at<=now() or r.approved_by=r.requested_by then raise exception 'Unexpired independent approval required'; end if;
 if not exists(select 1 from public.program_data_governance where program_id=r.program_id and ethics_status='approved') then raise exception 'Ethics approval required'; end if;
 select consent_version into v from public.program_journey_settings where program_id=r.program_id and active;
 if not exists(select 1 from public.research_information_versions where program_id=r.program_id and version=v) then raise exception 'Current participant information required'; end if;
 insert into private.research_pseudonym_keys(program_id) values(r.program_id) on conflict do nothing;
 select key into k from private.research_pseudonym_keys where program_id=r.program_id;
 -- Explicit whitelist: no names, emails, UUIDs, free text, answers or answer keys.
 select coalesce(jsonb_agg(jsonb_build_object(
 'participant_code',encode(extensions.hmac(convert_to(aa.learner_id::text,'UTF8'),k,'sha256'),'hex'),
 'assessment_code',a.title,'attempt_status',aa.status,
 'question_code',q.question_code,'rater_code',encode(extensions.hmac(convert_to(hr.reviewer_id::text,'UTF8'),k,'sha256'),'hex'),
 'criterion_code',rc.criterion_code,'score',hcs.score,'max_score',rc.max_score,
 'rubric_version',rv.version_number,'consent_version',v
 )),'[]'::jsonb) into rows_json
 from public.human_reviews hr join public.human_criterion_scores hcs on hcs.human_review_id=hr.id
 join public.rubric_criteria rc on rc.id=hcs.criterion_id join public.rubric_versions rv on rv.id=hr.rubric_version_id
 join public.student_responses sr on sr.id=hr.response_id join public.assessment_attempts aa on aa.id=sr.attempt_id
 join public.assessments a on a.id=aa.assessment_id join public.cohorts c on c.id=a.cohort_id
 join public.question_versions qv on qv.id=sr.question_version_id join public.questions q on q.id=qv.question_id
 where c.program_id=r.program_id and hr.status='submitted' and aa.status in ('submitted','late')
 and exists(select 1 from public.research_consent_records cr where cr.program_id=r.program_id and cr.learner_id=aa.learner_id and cr.policy_version=v and cr.status='granted')
 and not exists(select 1 from public.program_analytics_exclusions ex where ex.program_id=r.program_id and ex.user_id=aa.learner_id);
 payload:=jsonb_build_object('dataset','longitudinal_core_v1','scope','submitted_human_criterion_ratings','rows',rows_json,'free_text_excluded',true);
 insert into public.research_export_manifests(request_id,generated_by,row_count,record_counts,file_sha256,column_set,pseudonymization_version,warnings)
 values(r.id,auth.uid(),jsonb_array_length(rows_json),jsonb_build_object('human_criterion_ratings',jsonb_array_length(rows_json)),encode(extensions.digest(convert_to(payload::text,'UTF8'),'sha256'),'hex'),array['participant_code','assessment_code','attempt_status','question_code','rater_code','criterion_code','score','max_score','rubric_version','consent_version'],'hmac-sha256-v1',array['Free text always excluded. Dataset contains submitted human criterion ratings only.']);
 update public.research_export_requests set status='generated',updated_at=now() where id=r.id;
 insert into public.audit_events(program_id,actor_user_id,event_type,entity_type,entity_id,new_value) values(r.program_id,auth.uid(),'research.export_generated','research_export_request',r.id::text,jsonb_build_object('rows',jsonb_array_length(rows_json)));
 return payload;
end $$;
revoke all on function public.generate_research_export(uuid) from public,anon;
grant execute on function public.generate_research_export(uuid) to authenticated;
CREATE OR REPLACE FUNCTION public.research_consent_state(target_program_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid:=auth.uid();
  gov record;
  consent_version text;
  rec record;
  eligible boolean;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select exists(
    select 1 from public.cohort_memberships cm join public.cohorts c on c.id=cm.cohort_id
    where cm.user_id=uid and cm.member_type='learner' and cm.status in ('active','completed') and c.program_id=target_program_id
  ) into eligible;
  if not eligible then raise exception 'Learner membership required' using errcode='42501'; end if;

  select * into gov from public.program_data_governance where program_id=target_program_id;
  select pjs.consent_version into consent_version from public.program_journey_settings pjs where pjs.program_id=target_program_id and pjs.active limit 1;

  if consent_version is not null then
    select * into rec from public.research_consent_records
    where program_id=target_program_id and learner_id=uid and policy_version=consent_version
    order by recorded_at desc limit 1;
  end if;

  return jsonb_build_object(
    'program_id',target_program_id,
    'learner',true,
    'consent_version',consent_version,
    'explicit_consent_required',coalesce(gov.require_explicit_research_consent,false),
    'policy_version',gov.policy_version,
    'ethics_status',gov.ethics_status,
    'ethics_reference',gov.ethics_reference,
    'information',(select jsonb_build_object('participant_information',i.participant_information,'withdrawal_information',i.withdrawal_information) from public.research_information_versions i where i.program_id=target_program_id and i.version=consent_version),
    'has_active_consent',exists(select 1 from public.research_consent_records cr where cr.program_id=target_program_id and cr.learner_id=uid and cr.status='granted'),
    'privacy_notice_url',gov.privacy_notice_url,
    'data_controller_contact',gov.data_controller_contact,
    'retention_days',gov.retention_days,
    'exclude_free_text_from_exports',gov.exclude_free_text_from_exports,
    'aggregate_min_cell_n',gov.aggregate_min_cell_n,
    'record',case when rec.id is null then null else jsonb_build_object(
      'id',rec.id,'status',rec.status,'recorded_at',rec.recorded_at,'withdrawn_at',rec.withdrawn_at
    ) end
  );
end;
$function$
;
revoke insert,update,delete on public.research_export_manifests from authenticated;
