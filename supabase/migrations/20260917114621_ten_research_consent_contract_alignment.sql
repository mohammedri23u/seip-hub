create or replace function public.research_consent_state(target_program_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
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
$$;

create or replace function public.ten_governance_status(target_program_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid(); gov record; consent_version text; blockers text[]:=array[]::text[];
  learners integer:=0; consented integer:=0; declined integer:=0; withdrawn integer:=0; pending integer:=0;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not (private.has_program_role(target_program_id,array['program_director','assessment_lead','reviewer']) or private.is_platform_admin(uid)) then raise exception 'Staff access required' using errcode='42501'; end if;

  select * into gov from public.program_data_governance where program_id=target_program_id;
  select pjs.consent_version into consent_version from public.program_journey_settings pjs where pjs.program_id=target_program_id and pjs.active limit 1;

  if gov.program_id is null then blockers:=array_append(blockers,'Data governance row missing');
  else
    if gov.require_explicit_research_consent and consent_version is null then blockers:=array_append(blockers,'Consent version missing'); end if;
    if gov.retention_days is null then blockers:=array_append(blockers,'Retention period not approved'); end if;
    if gov.data_controller_contact is null or btrim(gov.data_controller_contact)='' then blockers:=array_append(blockers,'Data controller contact missing'); end if;
    if gov.privacy_notice_url is null or btrim(gov.privacy_notice_url)='' then blockers:=array_append(blockers,'Privacy notice URL missing'); end if;
  end if;

  select count(distinct cm.user_id)::integer into learners
  from public.cohort_memberships cm join public.cohorts c on c.id=cm.cohort_id
  where c.program_id=target_program_id and cm.member_type='learner' and cm.status='active';

  if consent_version is not null then
    select count(*) filter(where r.status='granted')::integer,
           count(*) filter(where r.status='declined')::integer,
           count(*) filter(where r.status='withdrawn')::integer
      into consented,declined,withdrawn
    from public.research_consent_records r
    where r.program_id=target_program_id and r.policy_version=consent_version;
  end if;
  pending:=greatest(learners-consented-declined-withdrawn,0);

  return jsonb_build_object(
    'program_id',target_program_id,'policy_version',gov.policy_version,'consent_version',consent_version,
    'require_explicit_research_consent',gov.require_explicit_research_consent,
    'require_research_export_approval',gov.require_research_export_approval,
    'retention_days',gov.retention_days,'aggregate_min_cell_n',gov.aggregate_min_cell_n,
    'exclude_free_text_from_exports',gov.exclude_free_text_from_exports,
    'data_controller_contact',gov.data_controller_contact,'privacy_notice_url',gov.privacy_notice_url,
    'active_learners',learners,'granted',consented,'declined',declined,'withdrawn',withdrawn,'pending',pending,
    'launch_blockers',to_jsonb(blockers),'research_ready',cardinality(blockers)=0
  );
end;
$$;
