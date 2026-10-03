create or replace function public.research_consent_state(target_program_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  uid uuid := auth.uid();
  gov record;
  rec record;
  eligible boolean;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;

  select exists(
    select 1 from public.cohort_memberships cm
    join public.cohorts c on c.id=cm.cohort_id
    where cm.user_id=uid and cm.member_type='learner' and cm.status in ('active','completed') and c.program_id=target_program_id
  ) into eligible;
  if not eligible then raise exception 'Learner membership required' using errcode='42501'; end if;

  select * into gov from public.program_data_governance where program_id=target_program_id;
  if gov.program_id is null then raise exception 'Data governance is not configured'; end if;

  select * into rec from public.research_consent_records
  where program_id=target_program_id and learner_id=uid and policy_version=gov.policy_version
  order by recorded_at desc limit 1;

  return jsonb_build_object(
    'program_id',target_program_id,
    'policy_version',gov.policy_version,
    'required',gov.require_explicit_research_consent,
    'status',rec.status,
    'recorded_at',rec.recorded_at,
    'withdrawn_at',rec.withdrawn_at,
    'privacy_notice_url',gov.privacy_notice_url,
    'data_controller_contact',gov.data_controller_contact,
    'retention_days',gov.retention_days,
    'exclude_free_text_from_exports',gov.exclude_free_text_from_exports,
    'aggregate_min_cell_n',gov.aggregate_min_cell_n
  );
end;
$$;

create or replace function public.set_research_consent(target_program_id uuid, requested_status text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := auth.uid();
  gov record;
  eligible boolean;
  rec_id uuid;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if requested_status not in ('granted','declined','withdrawn') then raise exception 'Invalid consent status'; end if;

  select exists(
    select 1 from public.cohort_memberships cm join public.cohorts c on c.id=cm.cohort_id
    where cm.user_id=uid and cm.member_type='learner' and cm.status in ('active','completed') and c.program_id=target_program_id
  ) into eligible;
  if not eligible then raise exception 'Learner membership required' using errcode='42501'; end if;

  select * into gov from public.program_data_governance where program_id=target_program_id;
  if gov.program_id is null then raise exception 'Data governance is not configured'; end if;

  if requested_status='withdrawn' then
    update public.research_consent_records
      set status='withdrawn', withdrawn_at=now(), recorded_by=uid, updated_at=now(), basis_note='Learner self-withdrawal'
    where program_id=target_program_id and learner_id=uid and policy_version=gov.policy_version
    returning id into rec_id;
    if rec_id is null then raise exception 'No current consent record to withdraw'; end if;
  else
    insert into public.research_consent_records(program_id,learner_id,status,policy_version,basis_note,recorded_by,recorded_at,withdrawn_at)
    values(target_program_id,uid,requested_status,gov.policy_version,'Learner self-recorded decision',uid,now(),null)
    on conflict(program_id,learner_id,policy_version) do update
      set status=excluded.status,basis_note=excluded.basis_note,recorded_by=uid,recorded_at=now(),withdrawn_at=null,updated_at=now()
    returning id into rec_id;
  end if;

  insert into public.audit_events(program_id,actor_user_id,event_type,entity_type,entity_id,new_value)
  values(target_program_id,uid,'research_consent_changed','research_consent_record',rec_id::text,jsonb_build_object('status',requested_status,'policy_version',gov.policy_version));

  return public.research_consent_state(target_program_id);
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
  uid uuid:=auth.uid();
  gov record;
  blockers text[]:=array[]::text[];
  learners integer:=0;
  consented integer:=0;
  declined integer:=0;
  withdrawn integer:=0;
  pending integer:=0;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not (private.has_program_role(target_program_id,array['program_director','assessment_lead','reviewer']) or private.is_platform_admin(uid)) then
    raise exception 'Staff access required' using errcode='42501';
  end if;
  select * into gov from public.program_data_governance where program_id=target_program_id;
  if gov.program_id is null then blockers:=array_append(blockers,'Data governance row missing');
  else
    if gov.require_explicit_research_consent and gov.policy_version is null then blockers:=array_append(blockers,'Consent policy version missing'); end if;
    if gov.retention_days is null then blockers:=array_append(blockers,'Retention period not approved'); end if;
    if gov.data_controller_contact is null or btrim(gov.data_controller_contact)='' then blockers:=array_append(blockers,'Data controller contact missing'); end if;
    if gov.privacy_notice_url is null or btrim(gov.privacy_notice_url)='' then blockers:=array_append(blockers,'Privacy notice URL missing'); end if;
  end if;

  select count(distinct cm.user_id)::integer into learners
  from public.cohort_memberships cm join public.cohorts c on c.id=cm.cohort_id
  where c.program_id=target_program_id and cm.member_type='learner' and cm.status='active';

  if gov.program_id is not null then
    select
      count(*) filter(where r.status='granted')::integer,
      count(*) filter(where r.status='declined')::integer,
      count(*) filter(where r.status='withdrawn')::integer
    into consented,declined,withdrawn
    from public.research_consent_records r
    where r.program_id=target_program_id and r.policy_version=gov.policy_version;
  end if;
  pending:=greatest(learners-consented-declined-withdrawn,0);

  return jsonb_build_object(
    'program_id',target_program_id,
    'policy_version',gov.policy_version,
    'require_explicit_research_consent',gov.require_explicit_research_consent,
    'require_research_export_approval',gov.require_research_export_approval,
    'retention_days',gov.retention_days,
    'aggregate_min_cell_n',gov.aggregate_min_cell_n,
    'exclude_free_text_from_exports',gov.exclude_free_text_from_exports,
    'data_controller_contact',gov.data_controller_contact,
    'privacy_notice_url',gov.privacy_notice_url,
    'active_learners',learners,
    'granted',consented,
    'declined',declined,
    'withdrawn',withdrawn,
    'pending',pending,
    'launch_blockers',to_jsonb(blockers),
    'research_ready',cardinality(blockers)=0
  );
end;
$$;

create or replace function public.ten_review_queue(target_program_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare uid uuid:=auth.uid(); payload jsonb;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not (private.has_program_role(target_program_id,array['program_director','assessment_lead','reviewer']) or private.is_platform_admin(uid)) then raise exception 'Reviewer access required' using errcode='42501'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'response_id',x.response_id,
    'assessment_id',x.assessment_id,
    'assessment_title',x.assessment_title,
    'learner_id',x.learner_id,
    'question_code',x.question_code,
    'question_version_id',x.question_version_id,
    'text_response',x.text_response,
    'rubric_version_id',x.rubric_version_id,
    'existing_review_id',x.existing_review_id,
    'existing_review_status',x.existing_review_status
  ) order by x.submitted_at,x.question_code),'[]'::jsonb) into payload
  from (
    select sr.id response_id,aa.assessment_id,a.title assessment_title,aa.learner_id,q.question_code,sr.question_version_id,sr.text_response,qr.rubric_version_id,hr.id existing_review_id,hr.status existing_review_status,sr.submitted_at
    from public.student_responses sr
    join public.assessment_attempts aa on aa.id=sr.attempt_id
    join public.assessments a on a.id=aa.assessment_id
    join public.cohorts c on c.id=a.cohort_id
    join public.question_versions qv on qv.id=sr.question_version_id
    join public.questions q on q.id=qv.question_id
    left join public.question_rubrics qr on qr.question_version_id=sr.question_version_id
    left join public.human_reviews hr on hr.response_id=sr.id and hr.reviewer_id=uid
    where c.program_id=target_program_id and aa.status in ('submitted','late') and sr.text_response is not null and btrim(sr.text_response)<>''
      and (hr.id is null or hr.status='draft')
  ) x;
  return payload;
end;
$$;

revoke all on function public.research_consent_state(uuid) from public;
grant execute on function public.research_consent_state(uuid) to authenticated;
revoke all on function public.set_research_consent(uuid,text) from public;
grant execute on function public.set_research_consent(uuid,text) to authenticated;
revoke all on function public.ten_governance_status(uuid) from public;
grant execute on function public.ten_governance_status(uuid) to authenticated;
revoke all on function public.ten_review_queue(uuid) from public;
grant execute on function public.ten_review_queue(uuid) to authenticated;
