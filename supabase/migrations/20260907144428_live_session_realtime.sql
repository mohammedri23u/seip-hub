-- Stage 6 — Live Session / Realtime Interaction
-- Evidence-informed active learning infrastructure with private Realtime Broadcast,
-- immutable learner responses, Peer Instruction two-round flow, confidence capture,
-- safe answer-key reveal, aggregate-only learner distributions, and attendance integration.

create table public.live_session_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  topic text not null unique,
  status text not null default 'lobby' check (status in ('lobby', 'live', 'paused', 'ended')),
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or started_at is null or ended_at >= started_at)
)
create unique index live_session_runs_one_active_per_session_idx
  on public.live_session_runs (session_id)
  where status <> 'ended'
create index live_session_runs_session_time_idx on public.live_session_runs (session_id, created_at desc)
create index live_session_runs_created_by_idx on public.live_session_runs (created_by)
create table public.live_session_access (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.live_session_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  access_role text not null check (access_role in ('learner', 'facilitator')),
  status text not null default 'active' check (status in ('active', 'left', 'revoked')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (run_id, user_id)
)
create index live_session_access_user_idx on public.live_session_access (user_id, status)
create index live_session_access_run_idx on public.live_session_access (run_id, status)
create table public.live_activities (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.live_session_runs(id) on delete cascade,
  activity_type text not null check (activity_type in ('single_best_answer', 'poll', 'confidence', 'short_answer', 'peer_instruction')),
  title text,
  stem text not null,
  status text not null default 'draft' check (status in ('draft', 'open', 'discussion', 'revealed', 'closed')),
  current_round smallint not null default 1 check (current_round in (1, 2)),
  position integer not null check (position > 0),
  max_response_seconds integer check (max_response_seconds is null or max_response_seconds > 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, position)
)
create unique index live_activities_one_active_idx
  on public.live_activities (run_id)
  where status in ('open', 'discussion')
create index live_activities_run_status_idx on public.live_activities (run_id, status, position)
create index live_activities_created_by_idx on public.live_activities (created_by)
create table public.live_activity_rounds (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.live_activities(id) on delete cascade,
  round_number smallint not null check (round_number in (1, 2)),
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'revealed')),
  opened_at timestamptz,
  closed_at timestamptz,
  revealed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (activity_id, round_number),
  check (closed_at is null or opened_at is null or closed_at >= opened_at),
  check (revealed_at is null or opened_at is null or revealed_at >= opened_at)
)
create unique index live_activity_rounds_one_open_idx
  on public.live_activity_rounds (activity_id)
  where status = 'open'
create index live_activity_rounds_activity_idx on public.live_activity_rounds (activity_id, round_number)
create table public.live_activity_options (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.live_activities(id) on delete cascade,
  option_text text not null,
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique (activity_id, position)
)
create index live_activity_options_activity_idx on public.live_activity_options (activity_id, position)
create table public.live_activity_answer_keys (
  activity_id uuid primary key references public.live_activities(id) on delete cascade,
  correct_option_id uuid references public.live_activity_options(id) on delete restrict,
  model_answer text,
  explanation text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
create index live_activity_answer_keys_correct_option_idx on public.live_activity_answer_keys (correct_option_id)
create index live_activity_answer_keys_created_by_idx on public.live_activity_answer_keys (created_by)
create table public.live_activity_responses (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.live_activity_rounds(id) on delete cascade,
  learner_id uuid not null references auth.users(id) on delete cascade,
  option_id uuid references public.live_activity_options(id) on delete restrict,
  text_response text,
  numeric_value smallint check (numeric_value is null or numeric_value between 1 and 5),
  confidence_value smallint check (confidence_value is null or confidence_value between 1 and 5),
  created_at timestamptz not null default now(),
  unique (round_id, learner_id)
)
create index live_activity_responses_round_idx on public.live_activity_responses (round_id, created_at)
create index live_activity_responses_learner_idx on public.live_activity_responses (learner_id, created_at desc)
create index live_activity_responses_option_idx on public.live_activity_responses (option_id)
create table public.live_activity_learning_objectives (
  activity_id uuid not null references public.live_activities(id) on delete cascade,
  learning_objective_id uuid not null references public.learning_objectives(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (activity_id, learning_objective_id)
)
create index live_activity_learning_objectives_lo_idx
  on public.live_activity_learning_objectives (learning_objective_id, activity_id)
create table public.live_activity_aggregates (
  round_id uuid primary key references public.live_activity_rounds(id) on delete cascade,
  response_count integer not null default 0 check (response_count >= 0),
  option_counts jsonb not null default '{}'::jsonb,
  numeric_counts jsonb not null default '{}'::jsonb,
  numeric_sum numeric not null default 0,
  numeric_count integer not null default 0 check (numeric_count >= 0),
  updated_at timestamptz not null default now()
)
alter table public.live_session_runs enable row level security
alter table public.live_session_access enable row level security
alter table public.live_activities enable row level security
alter table public.live_activity_rounds enable row level security
alter table public.live_activity_options enable row level security
alter table public.live_activity_answer_keys enable row level security
alter table public.live_activity_responses enable row level security
alter table public.live_activity_learning_objectives enable row level security
alter table public.live_activity_aggregates enable row level security
create or replace function private.can_access_live_run(target_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.live_session_runs lsr
       where lsr.id = target_run_id
         and (
           private.can_manage_session(lsr.session_id)
           or exists (
             select 1
             from public.live_session_access lsa
             where lsa.run_id = lsr.id
               and lsa.user_id = auth.uid()
               and lsa.status = 'active'
           )
         )
     );
$$
create or replace function private.can_access_live_topic(target_topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.live_session_runs lsr
       where lsr.topic = target_topic
         and lsr.status <> 'ended'
         and private.can_access_live_run(lsr.id)
     );
$$
create or replace function private.live_activity_is_manageable(target_activity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.live_activities la
    join public.live_session_runs lsr on lsr.id = la.run_id
    where la.id = target_activity_id
      and private.can_manage_session(lsr.session_id)
  );
$$
create or replace function private.live_round_is_manageable(target_round_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.live_activity_rounds lar
    where lar.id = target_round_id
      and private.live_activity_is_manageable(lar.activity_id)
  );
$$
-- Managers can administer runs. Learners only see runs after explicit join-code admission.
create policy live_session_runs_select on public.live_session_runs for select to authenticated
using (private.can_access_live_run(id))
create policy live_session_runs_insert on public.live_session_runs for insert to authenticated
with check (created_by = (select auth.uid()) and private.can_manage_session(session_id))
create policy live_session_runs_update on public.live_session_runs for update to authenticated
using (private.can_manage_session(session_id))
with check (private.can_manage_session(session_id))
create policy live_session_runs_delete on public.live_session_runs for delete to authenticated
using (private.can_manage_session(session_id))
create policy live_session_access_select on public.live_session_access for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.live_session_runs lsr
    where lsr.id = run_id and private.can_manage_session(lsr.session_id)
  )
)
create policy live_session_access_insert on public.live_session_access for insert to authenticated
with check (
  exists (
    select 1 from public.live_session_runs lsr
    where lsr.id = run_id and private.can_manage_session(lsr.session_id)
  )
)
create policy live_session_access_update on public.live_session_access for update to authenticated
using (
  exists (
    select 1 from public.live_session_runs lsr
    where lsr.id = run_id and private.can_manage_session(lsr.session_id)
  )
)
with check (
  exists (
    select 1 from public.live_session_runs lsr
    where lsr.id = run_id and private.can_manage_session(lsr.session_id)
  )
)
create policy live_session_access_delete on public.live_session_access for delete to authenticated
using (
  exists (
    select 1 from public.live_session_runs lsr
    where lsr.id = run_id and private.can_manage_session(lsr.session_id)
  )
)
create policy live_activities_select on public.live_activities for select to authenticated
using (
  private.live_activity_is_manageable(id)
  or (
    status <> 'draft'
    and exists (
      select 1 from public.live_session_access lsa
      where lsa.run_id = live_activities.run_id
        and lsa.user_id = (select auth.uid())
        and lsa.status = 'active'
    )
  )
)
create policy live_activities_insert on public.live_activities for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.live_session_runs lsr
    where lsr.id = run_id and private.can_manage_session(lsr.session_id)
  )
)
create policy live_activities_update on public.live_activities for update to authenticated
using (private.live_activity_is_manageable(id))
with check (private.live_activity_is_manageable(id))
create policy live_activities_delete on public.live_activities for delete to authenticated
using (private.live_activity_is_manageable(id))
create policy live_activity_rounds_select on public.live_activity_rounds for select to authenticated
using (
  private.live_round_is_manageable(id)
  or exists (
    select 1
    from public.live_activities la
    join public.live_session_access lsa on lsa.run_id = la.run_id
    where la.id = activity_id
      and la.status <> 'draft'
      and lsa.user_id = (select auth.uid())
      and lsa.status = 'active'
  )
)
create policy live_activity_rounds_insert on public.live_activity_rounds for insert to authenticated
with check (private.live_activity_is_manageable(activity_id))
create policy live_activity_rounds_update on public.live_activity_rounds for update to authenticated
using (private.live_round_is_manageable(id))
with check (private.live_round_is_manageable(id))
create policy live_activity_rounds_delete on public.live_activity_rounds for delete to authenticated
using (private.live_round_is_manageable(id))
create policy live_activity_options_select on public.live_activity_options for select to authenticated
using (
  private.live_activity_is_manageable(activity_id)
  or exists (
    select 1
    from public.live_activities la
    join public.live_session_access lsa on lsa.run_id = la.run_id
    where la.id = activity_id
      and la.status <> 'draft'
      and lsa.user_id = (select auth.uid())
      and lsa.status = 'active'
  )
)
create policy live_activity_options_insert on public.live_activity_options for insert to authenticated
with check (private.live_activity_is_manageable(activity_id))
create policy live_activity_options_update on public.live_activity_options for update to authenticated
using (private.live_activity_is_manageable(activity_id))
with check (private.live_activity_is_manageable(activity_id))
create policy live_activity_options_delete on public.live_activity_options for delete to authenticated
using (private.live_activity_is_manageable(activity_id))
-- Correct answers/model answers remain inaccessible until facilitator Reveal.
create policy live_activity_answer_keys_select on public.live_activity_answer_keys for select to authenticated
using (
  private.live_activity_is_manageable(activity_id)
  or exists (
    select 1
    from public.live_activities la
    join public.live_session_access lsa on lsa.run_id = la.run_id
    where la.id = activity_id
      and la.status in ('revealed', 'closed')
      and lsa.user_id = (select auth.uid())
      and lsa.status = 'active'
  )
)
create policy live_activity_answer_keys_insert on public.live_activity_answer_keys for insert to authenticated
with check (created_by = (select auth.uid()) and private.live_activity_is_manageable(activity_id))
create policy live_activity_answer_keys_update on public.live_activity_answer_keys for update to authenticated
using (private.live_activity_is_manageable(activity_id))
with check (private.live_activity_is_manageable(activity_id))
create policy live_activity_answer_keys_delete on public.live_activity_answer_keys for delete to authenticated
using (private.live_activity_is_manageable(activity_id))
create policy live_activity_responses_select on public.live_activity_responses for select to authenticated
using (learner_id = (select auth.uid()) or private.live_round_is_manageable(round_id))
create policy live_activity_responses_insert on public.live_activity_responses for insert to authenticated
with check (learner_id = (select auth.uid()))
create policy live_activity_learning_objectives_select on public.live_activity_learning_objectives for select to authenticated
using (
  private.live_activity_is_manageable(activity_id)
  or exists (
    select 1
    from public.live_activities la
    join public.live_session_access lsa on lsa.run_id = la.run_id
    where la.id = activity_id
      and la.status <> 'draft'
      and lsa.user_id = (select auth.uid())
      and lsa.status = 'active'
  )
)
create policy live_activity_learning_objectives_insert on public.live_activity_learning_objectives for insert to authenticated
with check (private.live_activity_is_manageable(activity_id))
create policy live_activity_learning_objectives_delete on public.live_activity_learning_objectives for delete to authenticated
using (private.live_activity_is_manageable(activity_id))
-- Facilitators can see aggregates while an activity is running; learners only after reveal/close.
create policy live_activity_aggregates_select on public.live_activity_aggregates for select to authenticated
using (
  private.live_round_is_manageable(round_id)
  or exists (
    select 1
    from public.live_activity_rounds lar
    join public.live_activities la on la.id = lar.activity_id
    join public.live_session_access lsa on lsa.run_id = la.run_id
    where lar.id = round_id
      and la.status in ('revealed', 'closed')
      and lsa.user_id = (select auth.uid())
      and lsa.status = 'active'
  )
)
-- Explicit join-code admission. This is the only learner write path into live_session_access.
create or replace function public.join_live_session(target_join_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
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
$$
revoke all on function public.join_live_session(text) from public
grant execute on function public.join_live_session(text) to authenticated
create or replace function private.validate_live_run_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'lobby' then
      raise exception 'Only lobby runs can be deleted';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.session_id <> old.session_id or new.topic <> old.topic or new.created_by <> old.created_by then
      raise exception 'Live run identity is immutable';
    end if;

    if old.status <> new.status then
      if old.status = 'lobby' and new.status not in ('live', 'ended') then
        raise exception 'Lobby run can only become live or ended';
      elsif old.status = 'live' and new.status not in ('paused', 'ended') then
        raise exception 'Live run can only become paused or ended';
      elsif old.status = 'paused' and new.status not in ('live', 'ended') then
        raise exception 'Paused run can only resume or end';
      elsif old.status = 'ended' then
        raise exception 'Ended live run is immutable';
      end if;
    end if;

    if old.started_at is null and new.status = 'live' then new.started_at := now(); end if;
    if new.status = 'ended' and old.status <> 'ended' then new.ended_at := now(); end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$
create trigger live_session_runs_validate_transition
before update or delete on public.live_session_runs
for each row execute function private.validate_live_run_transition()
create or replace function private.close_attendance_when_live_run_ends()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status <> 'ended' and new.status = 'ended' then
    update public.attendance_records
    set left_at = coalesce(left_at, now()), updated_at = now()
    where session_id = new.session_id
      and joined_at is not null
      and left_at is null;
  end if;
  return null;
end;
$$
create trigger live_session_runs_close_attendance
after update on public.live_session_runs
for each row execute function private.close_attendance_when_live_run_ends()
create or replace function private.validate_live_activity_structure()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_status text;
  activity_kind text;
  activity_program uuid;
  objective_program uuid;
begin
  if tg_table_name = 'live_activities' then
    if tg_op = 'DELETE' then
      if old.status <> 'draft' then raise exception 'Opened live activity cannot be deleted'; end if;
      return old;
    end if;

    if tg_op = 'UPDATE' then
      if new.run_id <> old.run_id
         or new.activity_type <> old.activity_type
         or coalesce(new.title, '') <> coalesce(old.title, '')
         or new.stem <> old.stem
         or new.position <> old.position
         or coalesce(new.max_response_seconds, -1) <> coalesce(old.max_response_seconds, -1) then
        if old.status <> 'draft' or new.status <> 'draft' then
          raise exception 'Live activity content is locked once delivery starts';
        end if;
      end if;

      if new.current_round < old.current_round then raise exception 'Live activity round cannot move backwards'; end if;
      if new.current_round > old.current_round and not (
        old.activity_type = 'peer_instruction'
        and old.status = 'discussion'
        and new.status = 'open'
        and old.current_round = 1
        and new.current_round = 2
      ) then
        raise exception 'Round 2 is reserved for Peer Instruction after discussion';
      end if;

      if old.status <> new.status then
        if old.status = 'draft' and new.status <> 'open' then
          raise exception 'Draft activity must be opened first';
        elsif old.status = 'open' and new.status not in ('discussion', 'revealed', 'closed') then
          raise exception 'Open activity transition is invalid';
        elsif old.status = 'discussion' and new.status not in ('open', 'revealed', 'closed') then
          raise exception 'Discussion activity transition is invalid';
        elsif old.status = 'revealed' and new.status <> 'closed' then
          raise exception 'Revealed activity can only be closed';
        elsif old.status = 'closed' then
          raise exception 'Closed activity is immutable';
        end if;
      end if;
      new.updated_at := now();
    end if;
    return new;
  end if;

  if tg_table_name = 'live_activity_rounds' then
    select la.status, la.activity_type into parent_status, activity_kind
    from public.live_activities la where la.id = coalesce(new.activity_id, old.activity_id);

    if tg_op = 'INSERT' then
      if parent_status <> 'draft' then raise exception 'Rounds must be authored before activity opens'; end if;
      if new.round_number = 2 and activity_kind <> 'peer_instruction' then
        raise exception 'Round 2 is reserved for Peer Instruction';
      end if;
      return new;
    elsif tg_op = 'DELETE' then
      if parent_status <> 'draft' then raise exception 'Rounds are locked once activity opens'; end if;
      return old;
    else
      if new.activity_id <> old.activity_id or new.round_number <> old.round_number then
        raise exception 'Live round identity is immutable';
      end if;
      if old.status <> new.status then
        if old.status = 'draft' and new.status <> 'open' then raise exception 'Draft round must be opened first';
        elsif old.status = 'open' and new.status not in ('closed', 'revealed') then raise exception 'Open round can only close or reveal';
        elsif old.status = 'closed' and new.status <> 'revealed' then raise exception 'Closed round can only be revealed';
        elsif old.status = 'revealed' then raise exception 'Revealed round is immutable';
        end if;
      end if;
      if old.opened_at is null and new.status = 'open' then new.opened_at := now(); end if;
      if old.status = 'open' and new.status = 'closed' then new.closed_at := now(); end if;
      if new.status = 'revealed' and old.status <> 'revealed' then
        new.revealed_at := now();
        new.closed_at := coalesce(new.closed_at, now());
      end if;
      return new;
    end if;
  end if;

  if tg_table_name in ('live_activity_options', 'live_activity_answer_keys') then
    select la.status into parent_status
    from public.live_activities la
    where la.id = case when tg_table_name = 'live_activity_options' then coalesce(new.activity_id, old.activity_id) else coalesce(new.activity_id, old.activity_id) end;
    if parent_status <> 'draft' then raise exception 'Live activity structure is locked once delivery starts'; end if;

    if tg_table_name = 'live_activity_answer_keys' and tg_op <> 'DELETE' and new.correct_option_id is not null then
      if not exists (
        select 1 from public.live_activity_options lao
        where lao.id = new.correct_option_id and lao.activity_id = new.activity_id
      ) then raise exception 'Correct option must belong to the same activity'; end if;
    end if;
    if tg_op = 'DELETE' then return old; end if;
    if tg_table_name = 'live_activity_answer_keys' then new.updated_at := now(); end if;
    return new;
  end if;

  if tg_table_name = 'live_activity_learning_objectives' then
    select la.status, c.program_id into parent_status, activity_program
    from public.live_activities la
    join public.live_session_runs lsr on lsr.id = la.run_id
    join public.sessions s on s.id = lsr.session_id
    join public.cohorts c on c.id = s.cohort_id
    where la.id = coalesce(new.activity_id, old.activity_id);

    if parent_status <> 'draft' then raise exception 'Learning-objective mapping is locked once activity opens'; end if;
    if tg_op <> 'DELETE' then
      select lo.program_id into objective_program from public.learning_objectives lo where lo.id = new.learning_objective_id;
      if objective_program is null or objective_program <> activity_program then
        raise exception 'Live activity and learning objective must belong to the same program';
      end if;
      return new;
    end if;
    return old;
  end if;

  return new;
end;
$$
create trigger live_activities_lock_structure
before update or delete on public.live_activities
for each row execute function private.validate_live_activity_structure()
create trigger live_activity_rounds_lock_structure
before insert or update or delete on public.live_activity_rounds
for each row execute function private.validate_live_activity_structure()
create trigger live_activity_options_lock_structure
before insert or update or delete on public.live_activity_options
for each row execute function private.validate_live_activity_structure()
create trigger live_activity_answer_keys_lock_structure
before insert or update or delete on public.live_activity_answer_keys
for each row execute function private.validate_live_activity_structure()
create trigger live_activity_learning_objectives_lock_structure
before insert or delete on public.live_activity_learning_objectives
for each row execute function private.validate_live_activity_structure()
create or replace function public.advance_live_activity(target_activity_id uuid, command text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$
revoke all on function public.advance_live_activity(uuid, text) from public
grant execute on function public.advance_live_activity(uuid, text) to authenticated
create or replace function private.validate_live_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_activity_id uuid;
  target_run_id uuid;
  target_activity_type text;
  target_activity_status text;
  target_round_status text;
  target_run_status text;
begin
  if auth.uid() is null or new.learner_id <> auth.uid() then
    raise exception 'Learner response identity mismatch';
  end if;

  select la.id, la.run_id, la.activity_type, la.status, lar.status, lsr.status
    into target_activity_id, target_run_id, target_activity_type, target_activity_status, target_round_status, target_run_status
  from public.live_activity_rounds lar
  join public.live_activities la on la.id = lar.activity_id
  join public.live_session_runs lsr on lsr.id = la.run_id
  where lar.id = new.round_id;

  if target_activity_id is null then raise exception 'Live activity round not found'; end if;
  if target_run_status <> 'live' or target_activity_status <> 'open' or target_round_status <> 'open' then
    raise exception 'Live activity is not accepting responses';
  end if;
  if not exists (
    select 1 from public.live_session_access lsa
    where lsa.run_id = target_run_id
      and lsa.user_id = new.learner_id
      and lsa.access_role = 'learner'
      and lsa.status = 'active'
  ) then raise exception 'Learner has not joined this live session'; end if;

  if target_activity_type in ('single_best_answer', 'peer_instruction', 'poll') then
    if new.option_id is null or new.text_response is not null or new.numeric_value is not null then
      raise exception 'This live activity requires one option response';
    end if;
    if not exists (
      select 1 from public.live_activity_options lao
      where lao.id = new.option_id and lao.activity_id = target_activity_id
    ) then raise exception 'Selected option does not belong to this live activity'; end if;
  elsif target_activity_type = 'short_answer' then
    if new.text_response is null or btrim(new.text_response) = '' or new.option_id is not null or new.numeric_value is not null then
      raise exception 'Short-answer response text is required';
    end if;
  elsif target_activity_type = 'confidence' then
    if new.numeric_value is null or new.option_id is not null or new.text_response is not null then
      raise exception 'Confidence activity requires a 1–5 response';
    end if;
  end if;

  return new;
end;
$$
create trigger live_activity_responses_validate
before insert on public.live_activity_responses
for each row execute function private.validate_live_response()
create or replace function private.prevent_live_response_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Live learner responses are immutable';
end;
$$
create trigger live_activity_responses_immutable
before update or delete on public.live_activity_responses
for each row execute function private.prevent_live_response_mutation()
revoke update, delete on public.live_activity_responses from authenticated
create or replace function private.initialize_live_round_aggregate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.live_activity_aggregates (round_id) values (new.id)
  on conflict (round_id) do nothing;
  return null;
end;
$$
create trigger live_activity_rounds_create_aggregate
after insert on public.live_activity_rounds
for each row execute function private.initialize_live_round_aggregate()
create or replace function private.increment_live_round_aggregate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  option_key text;
  numeric_key text;
begin
  option_key := case when new.option_id is null then null else new.option_id::text end;
  numeric_key := case when new.numeric_value is null then null else new.numeric_value::text end;

  insert into public.live_activity_aggregates (
    round_id, response_count, option_counts, numeric_counts, numeric_sum, numeric_count, updated_at
  ) values (
    new.round_id,
    1,
    case when option_key is null then '{}'::jsonb else jsonb_build_object(option_key, 1) end,
    case when numeric_key is null then '{}'::jsonb else jsonb_build_object(numeric_key, 1) end,
    coalesce(new.numeric_value, 0),
    case when new.numeric_value is null then 0 else 1 end,
    now()
  )
  on conflict (round_id) do update set
    response_count = public.live_activity_aggregates.response_count + 1,
    option_counts = case
      when option_key is null then public.live_activity_aggregates.option_counts
      else jsonb_set(
        public.live_activity_aggregates.option_counts,
        array[option_key],
        to_jsonb(coalesce((public.live_activity_aggregates.option_counts ->> option_key)::integer, 0) + 1),
        true
      )
    end,
    numeric_counts = case
      when numeric_key is null then public.live_activity_aggregates.numeric_counts
      else jsonb_set(
        public.live_activity_aggregates.numeric_counts,
        array[numeric_key],
        to_jsonb(coalesce((public.live_activity_aggregates.numeric_counts ->> numeric_key)::integer, 0) + 1),
        true
      )
    end,
    numeric_sum = public.live_activity_aggregates.numeric_sum + coalesce(new.numeric_value, 0),
    numeric_count = public.live_activity_aggregates.numeric_count + case when new.numeric_value is null then 0 else 1 end,
    updated_at = now();
  return null;
end;
$$
create trigger live_activity_responses_update_aggregate
after insert on public.live_activity_responses
for each row execute function private.increment_live_round_aggregate()
-- Lifecycle audit records (not raw answer payloads) support operations and research traceability.
create or replace function private.audit_live_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_program uuid;
  event_name text;
  target_entity text;
  target_id text;
begin
  if tg_table_name = 'live_session_runs' then
    select c.program_id into target_program
    from public.sessions s join public.cohorts c on c.id = s.cohort_id
    where s.id = coalesce(new.session_id, old.session_id);
    target_entity := 'live_session_run';
    target_id := coalesce(new.id, old.id)::text;
    event_name := case when tg_op = 'INSERT' then 'live.run.created' else 'live.run.status_changed' end;
  elsif tg_table_name = 'live_activities' then
    select c.program_id into target_program
    from public.live_session_runs lsr
    join public.sessions s on s.id = lsr.session_id
    join public.cohorts c on c.id = s.cohort_id
    where lsr.id = coalesce(new.run_id, old.run_id);
    target_entity := 'live_activity';
    target_id := coalesce(new.id, old.id)::text;
    event_name := case when tg_op = 'INSERT' then 'live.activity.created' else 'live.activity.status_changed' end;
  else
    return null;
  end if;

  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    insert into public.audit_events (program_id, actor_user_id, event_type, entity_type, entity_id, old_value, new_value)
    values (
      target_program,
      auth.uid(),
      event_name,
      target_entity,
      target_id,
      case when tg_op = 'INSERT' then null else jsonb_build_object('status', old.status) end,
      jsonb_build_object('status', new.status)
    );
  end if;
  return null;
end;
$$
create trigger live_session_runs_audit
after insert or update on public.live_session_runs
for each row execute function private.audit_live_lifecycle()
create trigger live_activities_audit
after insert or update on public.live_activities
for each row execute function private.audit_live_lifecycle()
-- Broadcast only safe state and aggregate changes. Raw learner responses are never broadcast.
create or replace function private.broadcast_live_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_topic text;
begin
  if tg_table_name = 'live_session_runs' then
    target_topic := coalesce(new.topic, old.topic);
  elsif tg_table_name = 'live_activities' then
    select lsr.topic into target_topic
    from public.live_session_runs lsr
    where lsr.id = coalesce(new.run_id, old.run_id);
  elsif tg_table_name = 'live_activity_rounds' then
    select lsr.topic into target_topic
    from public.live_activities la
    join public.live_session_runs lsr on lsr.id = la.run_id
    where la.id = coalesce(new.activity_id, old.activity_id);
  elsif tg_table_name = 'live_activity_aggregates' then
    select lsr.topic into target_topic
    from public.live_activity_rounds lar
    join public.live_activities la on la.id = lar.activity_id
    join public.live_session_runs lsr on lsr.id = la.run_id
    where lar.id = coalesce(new.round_id, old.round_id);
  end if;

  if target_topic is not null then
    perform realtime.broadcast_changes(
      target_topic,
      tg_op,
      tg_op,
      tg_table_name,
      tg_table_schema,
      new,
      old
    );
  end if;
  return null;
end;
$$
create trigger live_session_runs_broadcast
after insert or update or delete on public.live_session_runs
for each row execute function private.broadcast_live_change()
create trigger live_activities_broadcast
after insert or update or delete on public.live_activities
for each row execute function private.broadcast_live_change()
create trigger live_activity_rounds_broadcast
after insert or update or delete on public.live_activity_rounds
for each row execute function private.broadcast_live_change()
create trigger live_activity_aggregates_broadcast
after insert or update on public.live_activity_aggregates
for each row execute function private.broadcast_live_change()
-- Private Realtime authorization. Learners must first pass join-code admission;
-- facilitators are authorized by existing session-management permissions.
drop policy if exists seip_live_realtime_select on realtime.messages
create policy seip_live_realtime_select
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and private.can_access_live_topic((select realtime.topic()))
)
drop policy if exists seip_live_realtime_presence_insert on realtime.messages
create policy seip_live_realtime_presence_insert
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'presence'
  and private.can_access_live_topic((select realtime.topic()))
)
