create or replace function public.ten_facilitator_metrics(target_run_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  r public.ten_runs%rowtype;
  stage_total integer;
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

  stage_total := jsonb_array_length(r.content_snapshot->'stages');

  select count(*)::integer into participant_count
  from public.ten_participants p where p.run_id=target_run_id;

  select count(*)::integer into completion_ready
  from (
    select p.user_id
    from public.ten_participants p
    left join public.ten_responses tr on tr.run_id=p.run_id and tr.user_id=p.user_id
    where p.run_id=target_run_id
    group by p.user_id
    having count(distinct tr.stage_index) >= stage_total + 1
  ) ready;

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
