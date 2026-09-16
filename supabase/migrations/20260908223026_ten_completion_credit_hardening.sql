create or replace function private.ten_completion_ready(target_run_id uuid, target_user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists(select 1 from public.ten_runs r where r.id = target_run_id)
    and not exists (
      select 1
      from public.ten_runs r
      cross join lateral jsonb_array_elements(r.content_snapshot->'stages') with ordinality s(value, ordinality)
      where r.id = target_run_id
        and (
          not exists (
            select 1 from public.ten_responses tr
            where tr.run_id = r.id
              and tr.user_id = target_user_id
              and tr.stage_index = (s.ordinality - 1)::integer
              and tr.round = 1
          )
          or (
            coalesce((s.value->>'peerInstruction')::boolean, false)
            and not exists (
              select 1 from public.ten_responses tr
              where tr.run_id = r.id
                and tr.user_id = target_user_id
                and tr.stage_index = (s.ordinality - 1)::integer
                and tr.round = 2
            )
          )
        )
    )
    and exists (
      select 1
      from public.ten_runs r
      join public.ten_responses tr
        on tr.run_id = r.id
       and tr.user_id = target_user_id
       and tr.stage_index = jsonb_array_length(r.content_snapshot->'stages')
       and tr.round = 1
      where r.id = target_run_id
    );
$$;

revoke all on function private.ten_completion_ready(uuid, uuid) from public, anon, authenticated;

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
  credited_count integer := 0;
  incomplete_count integer := 0;
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
        and private.ten_completion_ready(target_run_id,p.user_id)
      on conflict do nothing;

    get diagnostics credited_count = row_count;
    select count(*)::integer into incomplete_count
    from public.ten_participants p
    where p.run_id=target_run_id
      and not private.ten_completion_ready(target_run_id,p.user_id);

    insert into public.ten_events(run_id,actor_id,event_type,detail)
    values(target_run_id,uid,'completion_credit_summary',jsonb_build_object(
      'credited', credited_count,
      'incomplete', incomplete_count,
      'rule', 'all_initial_commits_plus_peer_revotes_plus_transfer'
    ));
  end if;

  if next_phase='commit_open' then
    update public.sessions set status='live', updated_at=now()
    where id=r.session_id and status in ('draft','scheduled');
  end if;

  insert into public.ten_events(run_id,actor_id,event_type,detail)
  values(target_run_id,uid,'phase_changed',jsonb_build_object('from',r.phase,'to',next_phase,'stage_index',idx));

  return jsonb_build_object('ok',true,'phase',next_phase,'stage_index',idx,'credited',credited_count,'incomplete',incomplete_count);
end;
$$;

revoke all on function public.ten_command(uuid,text) from public, anon;
grant execute on function public.ten_command(uuid,text) to authenticated;

create or replace function public.ten_facilitator_metrics(target_run_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  r public.ten_runs%rowtype;
  initial_distribution jsonb := '{}'::jsonb;
  revote_distribution jsonb := '{}'::jsonb;
  initial_confidence_distribution jsonb := '{}'::jsonb;
  revote_confidence_distribution jsonb := '{}'::jsonb;
  participant_count integer := 0;
  completion_ready integer := 0;
  changed_count integer := 0;
  revote_count integer := 0;
  changed_percent numeric := 0;
  initial_confidence numeric;
  revote_confidence numeric;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select * into r from public.ten_runs where id=target_run_id;
  if r.id is null then raise exception 'Mission room not found'; end if;
  if not private.can_manage_session(r.session_id) then raise exception 'Facilitator access required' using errcode='42501'; end if;

  select count(*)::integer into participant_count
  from public.ten_participants p where p.run_id=target_run_id;

  select count(*)::integer into completion_ready
  from public.ten_participants p
  where p.run_id=target_run_id
    and private.ten_completion_ready(target_run_id,p.user_id);

  select coalesce(jsonb_object_agg(x.choice,x.n),'{}'::jsonb) into initial_distribution
  from (
    select tr.payload->>'choice' as choice, count(*)::integer as n
    from public.ten_responses tr
    where tr.run_id=target_run_id and tr.stage_index=r.stage_index and tr.round=1 and tr.payload ? 'choice'
    group by tr.payload->>'choice'
  ) x;

  select coalesce(jsonb_object_agg(x.choice,x.n),'{}'::jsonb) into revote_distribution
  from (
    select tr.payload->>'choice' as choice, count(*)::integer as n
    from public.ten_responses tr
    where tr.run_id=target_run_id and tr.stage_index=r.stage_index and tr.round=2 and tr.payload ? 'choice'
    group by tr.payload->>'choice'
  ) x;

  select coalesce(jsonb_object_agg(x.confidence_key,x.n),'{}'::jsonb) into initial_confidence_distribution
  from (
    select tr.confidence::text as confidence_key, count(*)::integer as n
    from public.ten_responses tr
    where tr.run_id=target_run_id and tr.stage_index=r.stage_index and tr.round=1 and tr.confidence is not null
    group by tr.confidence
  ) x;

  select coalesce(jsonb_object_agg(x.confidence_key,x.n),'{}'::jsonb) into revote_confidence_distribution
  from (
    select tr.confidence::text as confidence_key, count(*)::integer as n
    from public.ten_responses tr
    where tr.run_id=target_run_id and tr.stage_index=r.stage_index and tr.round=2 and tr.confidence is not null
    group by tr.confidence
  ) x;

  select count(*)::integer into changed_count
  from public.ten_responses a
  join public.ten_responses b
    on b.run_id=a.run_id and b.user_id=a.user_id and b.stage_index=a.stage_index and b.round=2
  where a.run_id=target_run_id and a.stage_index=r.stage_index and a.round=1 and a.payload<>b.payload;

  select count(*)::integer into revote_count
  from public.ten_responses
  where run_id=target_run_id and stage_index=r.stage_index and round=2;

  changed_percent := case when revote_count > 0 then round((changed_count::numeric/revote_count::numeric)*100,1) else 0 end;

  select round(avg(confidence),1) into initial_confidence
  from public.ten_responses
  where run_id=target_run_id and stage_index=r.stage_index and round=1 and confidence is not null;

  select round(avg(confidence),1) into revote_confidence
  from public.ten_responses
  where run_id=target_run_id and stage_index=r.stage_index and round=2 and confidence is not null;

  return jsonb_build_object(
    'participants', participant_count,
    'completion_ready', completion_ready,
    'completion_incomplete', greatest(participant_count-completion_ready,0),
    'initial_distribution', initial_distribution,
    'revote_distribution', revote_distribution,
    'initial_confidence_distribution', initial_confidence_distribution,
    'revote_confidence_distribution', revote_confidence_distribution,
    'changed_count', changed_count,
    'revote_count', revote_count,
    'changed_percent', changed_percent,
    'initial_confidence', initial_confidence,
    'revote_confidence', revote_confidence
  );
end;
$$;

revoke all on function public.ten_facilitator_metrics(uuid) from public, anon;
grant execute on function public.ten_facilitator_metrics(uuid) to authenticated;
