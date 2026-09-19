create table public.session_closeouts (
 session_id uuid primary key references public.sessions(id), checklist jsonb not null,
 debrief text not null check(length(trim(debrief))>=10),error_tags text[] not null default '{}',
 deviation_note text,closed_by uuid not null references auth.users(id),closed_at timestamptz not null default now()
);
alter table public.session_closeouts enable row level security;
revoke all on public.session_closeouts from anon,authenticated;
grant select,insert on public.session_closeouts to authenticated;
create policy closeout_read on public.session_closeouts for select to authenticated using(private.can_manage_session(session_id));
create policy closeout_write on public.session_closeouts for insert to authenticated with check(private.can_manage_session(session_id) and closed_by=(select auth.uid()));
create or replace function private.validate_session_closeout() returns trigger language plpgsql security definer set search_path='' as $$
declare k text; p uuid;
begin
 foreach k in array array['progressive_disclosure','ask_commitment','examine_commitment','hypothesis_driven_pe','pertinent_negatives','problem_representation','ranked_differential','investigation_question','diagnostic_updating','transfer_case','reduced_scaffolding','reveal_timing','scope_preserved','timing','incidents_documented'] loop
 if jsonb_typeof(new.checklist->k) is distinct from 'boolean' then raise exception 'Complete every fidelity item'; end if;
 end loop;
 if exists(select 1 from jsonb_each(new.checklist) e where e.value='false'::jsonb) and nullif(trim(new.deviation_note),'') is null then raise exception 'Describe fidelity deviations'; end if;
 select c.program_id into p from public.sessions s join public.cohorts c on c.id=s.cohort_id where s.id=new.session_id;
 insert into public.audit_events(program_id,actor_user_id,event_type,entity_type,entity_id) values(p,auth.uid(),'session.closeout','session',new.session_id::text);
 return new;
end $$;
create trigger session_closeout_validate before insert on public.session_closeouts for each row execute function private.validate_session_closeout();
CREATE OR REPLACE FUNCTION public.advance_live_activity(target_activity_id uuid, command text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  activity_record public.live_activities%rowtype;
  current_round_record public.live_activity_rounds%rowtype;
begin
  select * into activity_record from public.live_activities where id = target_activity_id for update;
  if activity_record.id is null then raise exception 'Live activity not found'; end if;

  if not exists (
    select 1
    from public.live_session_runs lsr
    where lsr.id = activity_record.run_id
      and private.can_manage_session(lsr.session_id)
  ) then raise exception 'Live activity management permission required'; end if;

  if command='open_round_1' and exists(select 1 from public.live_activities a where a.run_id=activity_record.run_id and a.position<activity_record.position and a.status<>'closed') then raise exception 'Complete prior activities first'; end if;
  if command='reveal' and (activity_record.status<>'discussion' or (activity_record.activity_type='peer_instruction' and activity_record.current_round<>2)) then raise exception 'Close responses and complete required revote before reveal'; end if;
  if command='close_activity' and activity_record.status<>'revealed' then raise exception 'Reveal before closeout'; end if;
  if command = 'open_round_1' then
    if activity_record.status <> 'draft' or activity_record.current_round <> 1 then
      raise exception 'Activity is not ready for round 1';
    end if;
    update public.live_activity_rounds
      set status = 'open'
      where activity_id = target_activity_id and round_number = 1 and status = 'draft';
    if not found then raise exception 'Round 1 is not ready to open'; end if;
    update public.live_activities set status = 'open', current_round = 1 where id = target_activity_id;

  elsif command = 'close_responses' then
    if activity_record.status <> 'open' then raise exception 'Activity is not accepting responses'; end if;
    select * into current_round_record
      from public.live_activity_rounds
      where activity_id = target_activity_id and round_number = activity_record.current_round
      for update;
    if current_round_record.status <> 'open' then raise exception 'Current round is not open'; end if;
    update public.live_activity_rounds set status = 'closed'
      where id = current_round_record.id;
    update public.live_activities set status = 'discussion' where id = target_activity_id;

  elsif command = 'open_round_2' then
    if activity_record.activity_type <> 'peer_instruction'
       or activity_record.status <> 'discussion'
       or activity_record.current_round <> 1 then
      raise exception 'Peer Instruction round 2 is not ready';
    end if;
    update public.live_activity_rounds set status = 'open'
      where activity_id = target_activity_id and round_number = 2 and status = 'draft';
    if not found then raise exception 'Round 2 is not ready to open'; end if;
    update public.live_activities set status = 'open', current_round = 2 where id = target_activity_id;

  elsif command = 'reveal' then
    if activity_record.status not in ('open', 'discussion') then raise exception 'Activity cannot be revealed from this state'; end if;
    update public.live_activity_rounds
      set status = 'revealed'
      where activity_id = target_activity_id and status in ('open', 'closed');
    update public.live_activities set status = 'revealed' where id = target_activity_id;

  elsif command = 'close_activity' then
    if activity_record.status not in ('open', 'discussion', 'revealed') then raise exception 'Activity cannot be closed from this state'; end if;
    update public.live_activity_rounds set status = 'closed'
      where activity_id = target_activity_id and status = 'open';
    update public.live_activities set status = 'closed' where id = target_activity_id;

  else
    raise exception 'Unknown live activity command';
  end if;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.join_live_session(target_join_code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  target_run_id uuid;
  target_session_id uuid;
  target_cohort_id uuid;
  target_user_id uuid;
  target_role text;
begin
  target_user_id := auth.uid();
  if target_user_id is null then
    raise exception 'Authentication required';
  end if;

  select lsr.id, s.id, s.cohort_id
    into target_run_id, target_session_id, target_cohort_id
  from public.live_session_runs lsr
  join public.sessions s on s.id = lsr.session_id
  where upper(coalesce(s.join_code, '')) = upper(trim(target_join_code))
    and lsr.status in ('lobby', 'live', 'paused')
  order by lsr.created_at desc
  limit 1;

  if target_run_id is null then
    raise exception 'No active live session matches this join code';
  end if;

  if private.can_manage_session(target_session_id) then
    target_role := 'facilitator';
  elsif exists (
    select 1
    from public.cohort_memberships cm
    where cm.cohort_id = target_cohort_id
      and cm.user_id = target_user_id
      and cm.member_type = 'learner'
      and cm.status = 'active'
  ) then
    if not coalesce((public.journey_summary(target_cohort_id)->'pretest'->>'completed')::boolean,false) then raise exception 'Complete assigned pre assessment first'; end if;
    target_role := 'learner';
  else
    raise exception 'You are not an active learner in this cohort';
  end if;

  insert into public.live_session_access (run_id, user_id, access_role, status, joined_at, last_seen_at)
  values (target_run_id, target_user_id, target_role, 'active', now(), now())
  on conflict (run_id, user_id) do update
    set access_role = excluded.access_role,
        status = 'active',
        last_seen_at = now();

  if target_role = 'learner' then
    insert into public.attendance_records (session_id, learner_id, status, method, joined_at)
    values (target_session_id, target_user_id, 'present', 'code', now())
    on conflict (session_id, learner_id) do update
      set status = case when public.attendance_records.status in ('absent', 'excused') then 'present' else public.attendance_records.status end,
          method = 'code',
          joined_at = coalesce(public.attendance_records.joined_at, now()),
          updated_at = now();
  end if;

  return target_run_id;
end;
$function$
;
