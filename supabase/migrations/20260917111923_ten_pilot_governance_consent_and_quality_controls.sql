create table if not exists public.program_assessment_quality_settings (
  program_id uuid primary key references public.programs(id) on delete cascade,
  blind_scoring boolean not null default true,
  rater_calibration_required boolean not null default true,
  double_rating_required boolean not null default true,
  double_rating_target_count integer null check (double_rating_target_count is null or double_rating_target_count > 0),
  double_rating_selection_rule text null,
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.program_assessment_quality_settings enable row level security;

drop policy if exists program_assessment_quality_settings_select on public.program_assessment_quality_settings;
create policy program_assessment_quality_settings_select on public.program_assessment_quality_settings
for select using (private.has_program_role(program_id, array['program_director','assessment_lead','reviewer']::text[]));

drop policy if exists program_assessment_quality_settings_insert on public.program_assessment_quality_settings;
create policy program_assessment_quality_settings_insert on public.program_assessment_quality_settings
for insert with check (updated_by=auth.uid() and private.has_program_role(program_id, array['program_director','assessment_lead']::text[]));

drop policy if exists program_assessment_quality_settings_update on public.program_assessment_quality_settings;
create policy program_assessment_quality_settings_update on public.program_assessment_quality_settings
for update using (private.has_program_role(program_id, array['program_director','assessment_lead']::text[]))
with check (updated_by=auth.uid() and private.has_program_role(program_id, array['program_director','assessment_lead']::text[]));

create table if not exists public.grading_quality_samples (
  response_id uuid primary key references public.student_responses(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  required_reviews smallint not null default 2 check (required_reviews >= 2),
  reason text not null,
  status text not null default 'assigned' check (status in ('assigned','complete','cancelled')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.grading_quality_samples enable row level security;

drop policy if exists grading_quality_samples_select on public.grading_quality_samples;
create policy grading_quality_samples_select on public.grading_quality_samples
for select using (private.has_program_role(program_id, array['program_director','assessment_lead','reviewer']::text[]));

drop policy if exists grading_quality_samples_insert on public.grading_quality_samples;
create policy grading_quality_samples_insert on public.grading_quality_samples
for insert with check (created_by=auth.uid() and private.has_program_role(program_id, array['program_director','assessment_lead']::text[]));

drop policy if exists grading_quality_samples_update on public.grading_quality_samples;
create policy grading_quality_samples_update on public.grading_quality_samples
for update using (private.has_program_role(program_id, array['program_director','assessment_lead']::text[]))
with check (private.has_program_role(program_id, array['program_director','assessment_lead']::text[]));

create or replace function private.enforce_quality_sample_before_final_score()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  required_count integer;
  submitted_reviews integer;
begin
  select gqs.required_reviews into required_count
  from public.grading_quality_samples gqs
  where gqs.response_id=new.response_id and gqs.status='assigned';

  if required_count is not null then
    select count(*)::integer into submitted_reviews
    from public.human_reviews hr
    where hr.response_id=new.response_id and hr.status='submitted';
    if submitted_reviews < required_count then
      raise exception 'This response is in the double-rating sample and requires % submitted human reviews before finalization.', required_count;
    end if;
    update public.grading_quality_samples
      set status='complete',updated_at=now()
      where response_id=new.response_id and status='assigned';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_quality_sample_before_final_score on public.final_score_decisions;
create trigger trg_quality_sample_before_final_score
before insert or update on public.final_score_decisions
for each row execute function private.enforce_quality_sample_before_final_score();

create or replace function public.research_consent_state(target_program_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  consent_version text;
  governance record;
  rec record;
  learner_ok boolean;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select exists(
    select 1 from public.cohort_memberships cm
    join public.cohorts c on c.id=cm.cohort_id
    where c.program_id=target_program_id and cm.user_id=uid and cm.member_type='learner' and cm.status='active'
  ) into learner_ok;
  if not learner_ok and not private.has_program_role(target_program_id,array['program_director','assessment_lead','reviewer']::text[]) then
    raise exception 'Not authorized for this program' using errcode='42501';
  end if;

  select pjs.consent_version into consent_version
  from public.program_journey_settings pjs
  where pjs.program_id=target_program_id and pjs.active
  limit 1;

  select * into governance from public.program_data_governance pdg where pdg.program_id=target_program_id;

  if learner_ok and consent_version is not null then
    select * into rec
    from public.research_consent_records rcr
    where rcr.program_id=target_program_id and rcr.learner_id=uid and rcr.policy_version=consent_version
    limit 1;
  end if;

  return jsonb_build_object(
    'program_id',target_program_id,
    'learner',learner_ok,
    'consent_version',consent_version,
    'explicit_consent_required',coalesce(governance.require_explicit_research_consent,true),
    'policy_version',governance.policy_version,
    'privacy_notice_url',governance.privacy_notice_url,
    'data_controller_contact',governance.data_controller_contact,
    'record',case when rec.id is null then null else jsonb_build_object(
      'id',rec.id,'status',rec.status,'recorded_at',rec.recorded_at,'withdrawn_at',rec.withdrawn_at
    ) end
  );
end;
$$;

create or replace function public.record_research_consent(target_program_id uuid, decision text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  consent_version text;
  old_status text;
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
  where pjs.program_id=target_program_id and pjs.active
  limit 1;
  if consent_version is null then raise exception 'Research consent version is not configured'; end if;

  select rcr.status into old_status from public.research_consent_records rcr
  where rcr.program_id=target_program_id and rcr.learner_id=uid and rcr.policy_version=consent_version;

  insert into public.research_consent_records(program_id,learner_id,status,policy_version,recorded_by,withdrawn_at)
  values(target_program_id,uid,decision,consent_version,uid,null)
  on conflict(program_id,learner_id,policy_version) do update
    set status=excluded.status,recorded_by=excluded.recorded_by,recorded_at=now(),withdrawn_at=null,updated_at=now()
  returning id into record_id;

  insert into public.audit_events(program_id,actor_user_id,event_type,entity_type,entity_id,old_value,new_value)
  values(target_program_id,uid,'research_consent_recorded','research_consent_record',record_id::text,
    jsonb_build_object('status',old_status),jsonb_build_object('status',decision,'policy_version',consent_version));

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
  old_status text;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select pjs.consent_version into consent_version from public.program_journey_settings pjs where pjs.program_id=target_program_id and pjs.active limit 1;
  if consent_version is null then raise exception 'Research consent version is not configured'; end if;

  select id,status into record_id,old_status from public.research_consent_records
  where program_id=target_program_id and learner_id=uid and policy_version=consent_version;
  if record_id is null then raise exception 'No current consent record to withdraw'; end if;

  update public.research_consent_records
  set status='withdrawn',withdrawn_at=now(),recorded_by=uid,updated_at=now()
  where id=record_id;

  insert into public.audit_events(program_id,actor_user_id,event_type,entity_type,entity_id,old_value,new_value)
  values(target_program_id,uid,'research_consent_withdrawn','research_consent_record',record_id::text,
    jsonb_build_object('status',old_status),jsonb_build_object('status','withdrawn','policy_version',consent_version));

  return jsonb_build_object('id',record_id,'status','withdrawn','policy_version',consent_version);
end;
$$;

revoke all on function public.research_consent_state(uuid) from public;
grant execute on function public.research_consent_state(uuid) to authenticated;
revoke all on function public.record_research_consent(uuid,text) from public;
grant execute on function public.record_research_consent(uuid,text) to authenticated;
revoke all on function public.withdraw_research_consent(uuid) from public;
grant execute on function public.withdraw_research_consent(uuid) to authenticated;

create or replace function public.ten_pilot_readiness(target_program_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  governance record;
  qsettings record;
  consent_version text;
  active_learners integer:=0;
  consent_granted integer:=0;
  consent_declined integer:=0;
  consent_withdrawn integer:=0;
  consent_unknown integer:=0;
  sequence_rows integer:=0;
  unassigned_learners integer:=0;
  form_count integer:=0;
  live_form_count integer:=0;
  form_item_count integer:=0;
  mapped_rubric_count integer:=0;
  reviewer_count integer:=0;
  assessment_lead_count integer:=0;
  mission_session_count integer:=0;
  prepared_run_count integer:=0;
  prepared_activity_count integer:=0;
  blockers jsonb:='[]'::jsonb;
  education_ready boolean:=false;
  research_ready boolean:=false;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not (private.is_platform_admin() or private.has_program_role(target_program_id,array['program_director','assessment_lead','reviewer']::text[])) then
    raise exception 'Not authorized for pilot readiness';
  end if;

  select * into governance from public.program_data_governance where program_id=target_program_id;
  select * into qsettings from public.program_assessment_quality_settings where program_id=target_program_id;
  select pjs.consent_version into consent_version from public.program_journey_settings pjs where pjs.program_id=target_program_id and pjs.active limit 1;

  select count(distinct cm.user_id)::integer into active_learners
  from public.cohort_memberships cm join public.cohorts c on c.id=cm.cohort_id
  where c.program_id=target_program_id and cm.member_type='learner' and cm.status='active'
    and not exists(select 1 from public.program_analytics_exclusions e where e.program_id=target_program_id and e.user_id=cm.user_id);

  with learners as (
    select distinct cm.user_id,cm.cohort_id from public.cohort_memberships cm join public.cohorts c on c.id=cm.cohort_id
    where c.program_id=target_program_id and cm.member_type='learner' and cm.status='active'
      and not exists(select 1 from public.program_analytics_exclusions e where e.program_id=target_program_id and e.user_id=cm.user_id)
  ), records as (
    select l.user_id,rcr.status from learners l left join public.research_consent_records rcr
      on rcr.program_id=target_program_id and rcr.learner_id=l.user_id and rcr.policy_version=consent_version
  )
  select count(*) filter(where status='granted'),count(*) filter(where status='declined'),count(*) filter(where status='withdrawn'),count(*) filter(where status is null)
  into consent_granted,consent_declined,consent_withdrawn,consent_unknown from records;

  select count(*)::integer into sequence_rows from public.program_assessment_sequences where program_id=target_program_id and active;

  with learners as (
    select distinct cm.user_id,cm.cohort_id from public.cohort_memberships cm join public.cohorts c on c.id=cm.cohort_id
    where c.program_id=target_program_id and cm.member_type='learner' and cm.status='active'
      and not exists(select 1 from public.program_analytics_exclusions e where e.program_id=target_program_id and e.user_id=cm.user_id)
  )
  select count(*)::integer into unassigned_learners
  from learners l where not exists(select 1 from private.assigned_assessment_pair(l.cohort_id,l.user_id));

  with forms as (
    select distinct pre_assessment_id as id from public.program_assessment_sequences where program_id=target_program_id and active
    union select distinct post_assessment_id from public.program_assessment_sequences where program_id=target_program_id and active
  )
  select count(*)::integer,count(*) filter(where a.status='live')::integer,
         coalesce(sum((select count(*) from public.assessment_items ai where ai.assessment_id=a.id)),0)::integer,
         coalesce(sum((select count(*) from public.assessment_items ai join public.question_rubrics qr on qr.question_version_id=ai.question_version_id where ai.assessment_id=a.id)),0)::integer
  into form_count,live_form_count,form_item_count,mapped_rubric_count
  from forms f join public.assessments a on a.id=f.id;

  select count(*)::integer into reviewer_count from public.program_memberships where program_id=target_program_id and role='reviewer' and status='active';
  select count(*)::integer into assessment_lead_count from public.program_memberships where program_id=target_program_id and role='assessment_lead' and status='active';

  select count(*)::integer into mission_session_count from public.sessions s join public.cohorts c on c.id=s.cohort_id
  where c.program_id=target_program_id and s.join_code in ('TEN-M01','TEN-M02','TEN-M03','TEN-M04') and s.status in ('scheduled','live','completed');

  select count(*)::integer into prepared_run_count from public.live_session_runs lsr join public.sessions s on s.id=lsr.session_id join public.cohorts c on c.id=s.cohort_id
  where c.program_id=target_program_id and lsr.topic like 'the-ten:prepared:TEN-M0%:v1.0.0' and lsr.status in ('lobby','live','paused','ended');

  select count(*)::integer into prepared_activity_count from public.live_activities la join public.live_session_runs lsr on lsr.id=la.run_id join public.sessions s on s.id=lsr.session_id join public.cohorts c on c.id=s.cohort_id
  where c.program_id=target_program_id and lsr.topic like 'the-ten:prepared:TEN-M0%:v1.0.0';

  if sequence_rows < 2 then blockers:=blockers||jsonb_build_array('AB/BA assessment sequence configuration is incomplete.'); end if;
  if unassigned_learners > 0 then blockers:=blockers||jsonb_build_array('At least one active learner has no assigned assessment sequence.'); end if;
  if form_count <> 2 or live_form_count <> 2 or form_item_count <> 30 then blockers:=blockers||jsonb_build_array('Form A/B launch configuration is incomplete or not live.'); end if;
  if mapped_rubric_count <> 30 then blockers:=blockers||jsonb_build_array('All 30 Form A/B tasks must have approved rubric mappings before scored pilot use.'); end if;
  if reviewer_count < 2 then blockers:=blockers||jsonb_build_array('At least two active reviewers are required for double-rating capability.'); end if;
  if assessment_lead_count < 1 then blockers:=blockers||jsonb_build_array('An active Assessment Lead is required.'); end if;
  if mission_session_count < 4 or prepared_run_count < 4 or prepared_activity_count < 40 then blockers:=blockers||jsonb_build_array('Prepared live Mission infrastructure is incomplete.'); end if;
  if qsettings.program_id is null then blockers:=blockers||jsonb_build_array('Assessment quality settings are not configured.');
  elsif qsettings.double_rating_required and (qsettings.double_rating_target_count is null or coalesce(trim(qsettings.double_rating_selection_rule),'')='') then blockers:=blockers||jsonb_build_array('Double-rating sample size and selection rule are not configured.'); end if;

  education_ready := sequence_rows>=2 and unassigned_learners=0 and form_count=2 and live_form_count=2 and form_item_count=30 and mapped_rubric_count=30 and reviewer_count>=2 and assessment_lead_count>=1 and mission_session_count>=4 and prepared_run_count>=4 and prepared_activity_count>=40 and qsettings.program_id is not null;

  if governance.program_id is null then blockers:=blockers||jsonb_build_array('Research data-governance settings are missing.');
  else
    if governance.require_explicit_research_consent is not true then blockers:=blockers||jsonb_build_array('Explicit research consent is not enabled.'); end if;
    if governance.require_research_export_approval is not true then blockers:=blockers||jsonb_build_array('Research export approval is not enforced.'); end if;
    if governance.retention_days is null then blockers:=blockers||jsonb_build_array('Research data-retention period is not configured.'); end if;
    if coalesce(trim(governance.data_controller_contact),'')='' then blockers:=blockers||jsonb_build_array('Data-controller contact is not configured.'); end if;
    if coalesce(trim(governance.privacy_notice_url),'')='' then blockers:=blockers||jsonb_build_array('Privacy notice URL is not configured.'); end if;
  end if;

  research_ready := governance.program_id is not null
    and governance.require_explicit_research_consent
    and governance.require_research_export_approval
    and governance.retention_days is not null
    and coalesce(trim(governance.data_controller_contact),'')<>''
    and coalesce(trim(governance.privacy_notice_url),'')<>''
    and consent_version is not null;

  return jsonb_build_object(
    'program_id',target_program_id,
    'education_ready',education_ready,
    'research_ready',research_ready,
    'active_learners',active_learners,
    'assessment',jsonb_build_object('sequence_rows',sequence_rows,'unassigned_learners',unassigned_learners,'forms',form_count,'live_forms',live_form_count,'form_items',form_item_count,'rubric_mappings',mapped_rubric_count),
    'staff',jsonb_build_object('reviewers',reviewer_count,'assessment_leads',assessment_lead_count),
    'missions',jsonb_build_object('sessions',mission_session_count,'prepared_runs',prepared_run_count,'prepared_activities',prepared_activity_count),
    'quality',case when qsettings.program_id is null then null else jsonb_build_object('blind_scoring',qsettings.blind_scoring,'rater_calibration_required',qsettings.rater_calibration_required,'double_rating_required',qsettings.double_rating_required,'double_rating_target_count',qsettings.double_rating_target_count,'double_rating_selection_rule',qsettings.double_rating_selection_rule) end,
    'governance',case when governance.program_id is null then null else jsonb_build_object('policy_version',governance.policy_version,'explicit_consent',governance.require_explicit_research_consent,'export_approval',governance.require_research_export_approval,'retention_days',governance.retention_days,'aggregate_min_cell_n',governance.aggregate_min_cell_n,'exclude_free_text_from_exports',governance.exclude_free_text_from_exports,'data_controller_contact',governance.data_controller_contact,'privacy_notice_url',governance.privacy_notice_url,'consent_version',consent_version) end,
    'consent',jsonb_build_object('granted',consent_granted,'declined',consent_declined,'withdrawn',consent_withdrawn,'unknown',consent_unknown),
    'blockers',blockers
  );
end;
$$;

revoke all on function public.ten_pilot_readiness(uuid) from public;
grant execute on function public.ten_pilot_readiness(uuid) to authenticated;

