create or replace function private.ten_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.phase is distinct from old.phase
     or new.stage_index is distinct from old.stage_index
     or new.completed_at is distinct from old.completed_at then
    perform realtime.send(
      jsonb_build_object('revision', new.revision, 'phase', new.phase, 'stage_index', new.stage_index),
      'state',
      'ten:' || new.id::text,
      true
    );
  end if;
  return new;
end;
$$;

create or replace function private.ten_response_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object('run_id', new.run_id, 'stage_index', new.stage_index, 'round', new.round),
    'responses',
    'ten:' || new.run_id::text,
    true
  );
  return new;
end;
$$;

revoke all on function private.ten_response_broadcast() from public, anon, authenticated;

drop trigger if exists ten_response_changed on public.ten_responses;
create trigger ten_response_changed
after insert on public.ten_responses
for each row execute function private.ten_response_broadcast();

create or replace function private.ten_response_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sid uuid;
begin
  select session_id into sid from public.ten_runs where id = new.run_id;
  if sid is null then return new; end if;

  insert into public.attendance_records(session_id, learner_id, status, method, joined_at)
  values(sid, new.user_id, 'present', 'code', now())
  on conflict(session_id, learner_id) do update
  set joined_at = coalesce(public.attendance_records.joined_at, excluded.joined_at),
      status = case when public.attendance_records.status = 'late' then 'late' else 'present' end,
      updated_at = now();
  return new;
end;
$$;

revoke all on function private.ten_response_attendance() from public, anon, authenticated;

drop trigger if exists ten_response_attendance on public.ten_responses;
create trigger ten_response_attendance
after insert on public.ten_responses
for each row execute function private.ten_response_attendance();

create or replace function private.ten_run_session_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.sessions
       set status = 'live', updated_at = now()
     where id = new.session_id and status in ('draft','scheduled');
  elsif new.phase = 'completed' and old.phase is distinct from 'completed' then
    update public.sessions
       set status = 'completed', updated_at = now()
     where id = new.session_id and status <> 'cancelled';

    update public.attendance_records ar
       set left_at = coalesce(ar.left_at, now()), updated_at = now()
     where ar.session_id = new.session_id
       and exists (
         select 1 from public.ten_participants p
         where p.run_id = new.id and p.user_id = ar.learner_id
       );
  end if;
  return new;
end;
$$;

revoke all on function private.ten_run_session_state() from public, anon, authenticated;

drop trigger if exists ten_run_session_state on public.ten_runs;
create trigger ten_run_session_state
after insert or update of phase on public.ten_runs
for each row execute function private.ten_run_session_state();

create or replace function private.ten_codex_completion_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  required_steps integer;
  completed_steps integer;
  run_phase text;
begin
  select jsonb_array_length(r.content_snapshot->'stages') + 1, r.phase
    into required_steps, run_phase
  from public.ten_runs r
  where r.id = new.run_id;

  if run_phase <> 'completed' then return null; end if;

  select count(distinct tr.stage_index)::integer
    into completed_steps
  from public.ten_responses tr
  where tr.run_id = new.run_id and tr.user_id = new.user_id;

  if coalesce(completed_steps, 0) < required_steps then
    return null;
  end if;
  return new;
end;
$$;

revoke all on function private.ten_codex_completion_guard() from public, anon, authenticated;

drop trigger if exists ten_codex_completion_guard on public.ten_codex;
create trigger ten_codex_completion_guard
before insert on public.ten_codex
for each row execute function private.ten_codex_completion_guard();

create or replace function public.ten_command(target_run_id uuid, requested_command text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  r public.ten_runs%rowtype;
  m jsonb;
  s jsonb;
  idx integer;
  total_steps integer;
  next_phase text := requested_command;
  peer_enabled boolean;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;

  select * into r from public.ten_runs where id=target_run_id for update;
  if r.id is null then raise exception 'Mission room not found'; end if;
  if not private.can_manage_session(r.session_id) then raise exception 'Facilitator access required' using errcode='42501'; end if;

  m := r.content_snapshot;
  total_steps := jsonb_array_length(m->'stages');
  s := m->'stages'->r.stage_index;
  peer_enabled := coalesce((s->>'peerInstruction')::boolean, false);
  idx := r.stage_index;

  if r.phase='waiting' and requested_command='commit_open' then
    next_phase := 'commit_open';
  elsif r.phase='commit_open' and requested_command='commit_locked' then
    next_phase := 'commit_locked';
  elsif r.phase='commit_locked' and peer_enabled and requested_command='discussion' then
    next_phase := 'discussion';
  elsif r.phase='commit_locked' and not peer_enabled and requested_command='reveal' then
    next_phase := 'reveal';
  elsif r.phase='discussion' and peer_enabled and requested_command='revote_open' then
    next_phase := 'revote_open';
  elsif r.phase='revote_open' and requested_command='reveal' then
    next_phase := 'reveal';
  elsif r.phase='reveal' and requested_command='next' then
    if idx + 1 < total_steps then
      idx := idx + 1;
      next_phase := 'commit_open';
    else
      next_phase := 'transfer';
    end if;
  elsif r.phase='transfer' and requested_command='debrief' then
    next_phase := 'debrief';
  elsif r.phase='debrief' and requested_command='completed' then
    next_phase := 'completed';
  else
    raise exception 'This transition is not available';
  end if;

  update public.ten_runs
     set phase = next_phase,
         stage_index = idx,
         revision = revision + 1,
         discussion_ends_at = case when next_phase='discussion' then now()+interval '90 seconds' else null end,
         completed_at = case when next_phase='completed' then now() else completed_at end
   where id=target_run_id;

  if next_phase='completed' then
    insert into public.ten_codex(run_id,user_id,completed_at)
      select target_run_id,p.user_id,now()
      from public.ten_participants p
      where p.run_id=target_run_id
      on conflict do nothing;
  end if;

  if next_phase='commit_open' then
    update public.sessions set status='live', updated_at=now()
    where id=r.session_id and status in ('draft','scheduled');
  end if;

  insert into public.ten_events(run_id,actor_id,event_type,detail)
  values(target_run_id,uid,'phase_changed',jsonb_build_object('from',r.phase,'to',next_phase,'stage_index',idx));

  return jsonb_build_object('ok',true,'phase',next_phase,'stage_index',idx);
end;
$$;

revoke all on function public.ten_command(uuid,text) from public, anon;
grant execute on function public.ten_command(uuid,text) to authenticated;