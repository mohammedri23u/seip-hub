create table if not exists private.micro_assessment_versions (
 assessment_id uuid primary key references public.assessments(id),
 source_assessment_id uuid not null references public.assessments(id),
 instrument_version text not null,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table private.micro_assessment_versions enable row level security;
revoke all on private.micro_assessment_versions from public,anon,authenticated;
create table if not exists private.micro_assessment_expirations (
 attempt_id uuid primary key references public.assessment_attempts(id),
 deadline_at timestamptz not null,
 finalized_at timestamptz not null default clock_timestamp()
);
alter table private.micro_assessment_expirations enable row level security;
revoke all on private.micro_assessment_expirations from public,anon,authenticated;

create or replace function private.micro_attempt_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from private.micro_assessment_versions where assessment_id=new.assessment_id)
 or (tg_op='UPDATE' and exists(select 1 from private.micro_assessment_versions where assessment_id=old.assessment_id)) then
  if tg_op='INSERT' and auth.uid() is not null then new.started_at:=clock_timestamp(); end if;
  if tg_op='UPDATE' and (new.started_at is distinct from old.started_at or new.learner_id is distinct from old.learner_id or new.assessment_id is distinct from old.assessment_id) then
   raise exception 'Timed attempt identity and start time are immutable' using errcode='42501';
  end if;
 end if;
 return new;
end $$;
revoke all on function private.micro_attempt_guard() from public,anon,authenticated;
create trigger micro_attempt_guard before insert or update on public.assessment_attempts for each row execute function private.micro_attempt_guard();

create or replace function private.expire_micro_attempt(target_attempt_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare att public.assessment_attempts; deadline timestamptz;
begin
 if auth.uid() is null or not private.managed_account_access_allowed() then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into att from public.assessment_attempts where id=target_attempt_id and learner_id=auth.uid() for update;
 if not found then raise exception 'Attempt unavailable' using errcode='42501'; end if;
 select att.started_at+make_interval(mins=>a.duration_minutes) into deadline from public.assessments a join private.micro_assessment_versions m on m.assessment_id=a.id where a.id=att.assessment_id;
 if deadline is null then return false; end if;
 if att.status in ('submitted','late') then return true; end if;
 if att.status<>'in_progress' or clock_timestamp()<deadline then return false; end if;
 insert into private.micro_assessment_expirations(attempt_id,deadline_at) values(att.id,deadline) on conflict(attempt_id) do nothing;
 update public.assessment_attempts set status='submitted',submitted_at=deadline where id=att.id and status='in_progress';
 return true;
end $$;
revoke all on function private.expire_micro_attempt(uuid) from public,anon,authenticated;

create or replace function private.scientific_attempt_submission_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status in ('submitted','late') and old.status='in_progress'
 and exists(select 1 from private.scientific_assessments where assessment_id=new.assessment_id) then
  if exists(select 1 from public.assessment_items ai left join public.student_responses sr on sr.attempt_id=new.id and sr.question_version_id=ai.question_version_id where ai.assessment_id=new.assessment_id and sr.id is null)
  and not exists(select 1 from private.micro_assessment_expirations e join private.micro_assessment_versions m on m.assessment_id=new.assessment_id where e.attempt_id=new.id and e.deadline_at<=clock_timestamp()) then
   raise exception 'All intended scientific assessment items must be committed before submission';
  end if;
 end if;
 return new;
end $$;

create or replace function private.micro_response_deadline_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare deadline timestamptz; attempt_status text;
begin
 select aa.started_at+make_interval(mins=>a.duration_minutes),aa.status into deadline,attempt_status
 from public.assessment_attempts aa join public.assessments a on a.id=aa.assessment_id join private.micro_assessment_versions m on m.assessment_id=a.id
 where aa.id=new.attempt_id for update of aa;
 if found and (attempt_status<>'in_progress' or clock_timestamp()>=deadline) then
  raise exception 'Assessment time has ended; committed answers are retained' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function private.micro_response_deadline_guard() from public,anon,authenticated;
create trigger micro_response_deadline_guard before insert or update on public.student_responses for each row execute function private.micro_response_deadline_guard();

do $$ declare definition text; begin
 if to_regprocedure('private.micro_legacy_step(uuid)') is null then
  select pg_get_functiondef('public.get_progressive_assessment_step(uuid)'::regprocedure) into definition;
  execute replace(definition,'FUNCTION public.get_progressive_assessment_step(','FUNCTION private.micro_legacy_step(');
 end if;
 if to_regprocedure('private.micro_legacy_submit(uuid,uuid,uuid,text,uuid,uuid[])') is null then
  select pg_get_functiondef('public.submit_progressive_assessment_step(uuid,uuid,uuid,text,uuid,uuid[])'::regprocedure) into definition;
  execute replace(definition,'FUNCTION public.submit_progressive_assessment_step(','FUNCTION private.micro_legacy_submit(');
 end if;
end $$;
revoke all on function private.micro_legacy_step(uuid) from public,anon,authenticated;
revoke all on function private.micro_legacy_submit(uuid,uuid,uuid,text,uuid,uuid[]) from public,anon,authenticated;

create or replace function public.get_progressive_assessment_step(target_assessment_id uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare payload jsonb; att public.assessment_attempts; deadline timestamptz;
begin
 if not exists(select 1 from private.micro_assessment_versions where assessment_id=target_assessment_id) then return private.micro_legacy_step(target_assessment_id); end if;
 if auth.uid() is null or not private.can_take_assessment(target_assessment_id) then raise exception 'Assessment unavailable' using errcode='42501'; end if;
 select * into att from public.assessment_attempts where assessment_id=target_assessment_id and learner_id=auth.uid() for update;
 if not found then raise exception 'No active attempt'; end if;
 if private.expire_micro_attempt(att.id) then return jsonb_build_object('completed',true,'assessment_id',target_assessment_id,'attempt_id',att.id,'timed_out',exists(select 1 from private.micro_assessment_expirations where attempt_id=att.id)); end if;
 payload:=private.micro_legacy_step(target_assessment_id);
 select att.started_at+make_interval(mins=>duration_minutes) into deadline from public.assessments where id=target_assessment_id;
 return payload||jsonb_build_object('micro_assessment',true,'instrument_version','micro-1.0.0','started_at',att.started_at,'deadline_at',deadline,'server_now',clock_timestamp(),'time_limit_seconds',300);
end $$;
revoke all on function public.get_progressive_assessment_step(uuid) from public,anon;
grant execute on function public.get_progressive_assessment_step(uuid) to authenticated;

create or replace function public.submit_progressive_assessment_step(target_assessment_id uuid,target_attempt_id uuid,target_question_version_id uuid,response_text text default null,response_option_id uuid default null,response_option_ids uuid[] default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from private.micro_assessment_versions where assessment_id=target_assessment_id) then
  if auth.uid() is null or not private.can_take_assessment(target_assessment_id) then raise exception 'Assessment unavailable' using errcode='42501'; end if;
  perform 1 from public.assessment_attempts where id=target_attempt_id and assessment_id=target_assessment_id and learner_id=auth.uid() for update;
  if not found then raise exception 'Attempt unavailable' using errcode='42501'; end if;
  if private.expire_micro_attempt(target_attempt_id) then return jsonb_build_object('completed',true,'timed_out',exists(select 1 from private.micro_assessment_expirations where attempt_id=target_attempt_id),'total',4); end if;
 end if;
 return private.micro_legacy_submit(target_assessment_id,target_attempt_id,target_question_version_id,response_text,response_option_id,response_option_ids);
end $$;
revoke all on function public.submit_progressive_assessment_step(uuid,uuid,uuid,text,uuid,uuid[]) from public,anon;
grant execute on function public.submit_progressive_assessment_step(uuid,uuid,uuid,text,uuid,uuid[]) to authenticated;

create or replace function public.finalize_timed_assessment(target_attempt_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 return jsonb_build_object('completed',private.expire_micro_attempt(target_attempt_id),'server_now',clock_timestamp());
end $$;
revoke all on function public.finalize_timed_assessment(uuid) from public,anon;
grant execute on function public.finalize_timed_assessment(uuid) to authenticated;
