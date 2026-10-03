-- THE TEN — First Activation. Additive; existing SEIP workflows are preserved.
create table public.ten_content (
  id text primary key check (id in ('M01','M02','M03','M04')),
  content jsonb not null, published boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.ten_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions(id),
  mission_id text not null references public.ten_content(id),
  content_snapshot jsonb not null,
  stage_index integer not null default 0,
  phase text not null default 'waiting' check (phase in ('waiting','commit_open','commit_locked','discussion','revote_open','reveal','transfer','debrief','completed')),
  revision integer not null default 0,
  discussion_ends_at timestamptz,
  completed_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.ten_participants (
  run_id uuid not null references public.ten_runs(id),
  user_id uuid not null references public.profiles(id),
  joined_at timestamptz not null default now(), primary key (run_id,user_id)
);
create table public.ten_responses (
  run_id uuid not null references public.ten_runs(id), user_id uuid not null references public.profiles(id),
  stage_index integer not null, round integer not null check(round in (1,2)),
  payload jsonb not null, confidence integer check(confidence in (20,40,60,80,100)),
  justification text not null default '', created_at timestamptz not null default now(),
  primary key(run_id,user_id,stage_index,round)
);
create table public.ten_codex (
  run_id uuid not null references public.ten_runs(id), user_id uuid not null references public.profiles(id),
  reflection text not null default '', completed_at timestamptz not null,
  primary key(run_id,user_id)
);
create table public.ten_echo_responses (
  run_id uuid not null references public.ten_runs(id), user_id uuid not null references public.profiles(id),
  item_index integer not null, response text not null, created_at timestamptz not null default now(),
  primary key(run_id,user_id,item_index)
);
create table public.ten_events (
  id bigint generated always as identity primary key, run_id uuid references public.ten_runs(id),
  actor_id uuid not null references public.profiles(id), event_type text not null,
  detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create index ten_participants_user on public.ten_participants(user_id);
create index ten_responses_user on public.ten_responses(user_id);
create index ten_codex_user on public.ten_codex(user_id);
create index ten_echo_user on public.ten_echo_responses(user_id);
create index ten_events_run on public.ten_events(run_id);
create index ten_runs_mission on public.ten_runs(mission_id);
alter table public.ten_content enable row level security;
alter table public.ten_runs enable row level security;
alter table public.ten_participants enable row level security;
alter table public.ten_responses enable row level security;
alter table public.ten_codex enable row level security;
alter table public.ten_echo_responses enable row level security;
alter table public.ten_events enable row level security;
-- No direct client grants. All reads use allowlisted, role-checked RPC projections.
revoke all on public.ten_content, public.ten_runs, public.ten_participants, public.ten_responses,
  public.ten_codex, public.ten_echo_responses, public.ten_events from anon, authenticated;

create or replace function private.ten_can_view(rid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
select auth.uid() is not null and exists (
 select 1 from public.ten_runs r join public.sessions s on s.id=r.session_id
 where r.id=rid and (private.can_manage_session(s.id) or private.is_cohort_member(s.cohort_id))
);
$$;
create or replace function private.ten_is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
select auth.uid() is not null and (private.is_platform_admin() or exists (
 select 1 from public.program_memberships where user_id=auth.uid() and status='active' and role='program_director'
) or exists(select 1 from public.session_facilitators where user_id=auth.uid()));
$$;

create or replace function private.ten_api(operation text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
 uid uuid := auth.uid(); r public.ten_runs%rowtype; m jsonb; s jsonb; result jsonb; choices jsonb;
 rid uuid; sid uuid; manager boolean; idx integer; rnd integer; conf integer; typ text;
 next_phase text; answer_payload jsonb; justification text; item jsonb; v jsonb;
 total_steps integer; signal_count integer; stability_value integer; changed integer;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if jsonb_typeof(payload) <> 'object' then raise exception 'Invalid request'; end if;

 if operation='catalog' then
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'title',c.content->>'title','mentor',c.content->>'mentor',
    'mentor_title',c.content->>'mentor_title','lens',c.content->>'lens','focus',c.content->>'focus',
    'duration',c.content->'duration','premise',c.content->>'premise','signalIndex',c.content->'signalIndex','published',c.published) order by c.id),'[]')
    into result from public.ten_content c where c.published or private.ten_is_staff();
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'session_id',q.session_id,'mission_id',q.mission_id,
   'title',q.content_snapshot->>'title','phase',q.phase,'join_code',ss.join_code,'manager',private.can_manage_session(ss.id)) order by q.created_at desc),'[]')
   into choices from public.ten_runs q join public.sessions ss on ss.id=q.session_id where private.ten_can_view(q.id);
  select count(distinct q.mission_id) into signal_count from public.ten_codex c join public.ten_runs q on q.id=c.run_id where c.user_id=uid;
  return jsonb_build_object('missions',result,'runs',choices,'signals',signal_count,'staff',private.ten_is_staff(),'admin',private.is_platform_admin());
 end if;

 if operation='studio' then
  if not private.ten_is_staff() then raise exception 'Staff access required' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'content',c.content,'published',c.published) order by c.id),'[]') into result from public.ten_content c;
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'title',q.title,'join_code',q.join_code,'cohort',q.cohort_name)),'[]') into choices
   from (select ss.id,ss.title,ss.join_code,cc.name as cohort_name from public.sessions ss join public.cohorts cc on cc.id=ss.cohort_id
     where private.can_manage_session(ss.id) order by ss.scheduled_at desc nulls last limit 200) q;
  return jsonb_build_object('missions',result,'sessions',choices,'admin',private.is_platform_admin());
 end if;

 if operation='rehearse' then
  if payload ? 'run_id' then
   select * into r from public.ten_runs where id=(payload->>'run_id')::uuid;
   if r.id is null or not private.can_manage_session(r.session_id) then raise exception 'Facilitator access required' using errcode='42501'; end if;
   return r.content_snapshot;
  end if;
  if not private.ten_is_staff() then raise exception 'Staff access required' using errcode='42501'; end if;
  select content into m from public.ten_content where id=payload->>'mission_id';
  return m;
 end if;

 if operation='publish' then
  if not private.is_platform_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  update public.ten_content set published=(payload->>'published')::boolean,updated_at=now() where id=payload->>'mission_id';
  if not found then raise exception 'Mission not found'; end if;
  insert into public.ten_events(actor_id,event_type,detail) values(uid,'content_publication',payload);
  return jsonb_build_object('ok',true);
 end if;

 if operation='edit_stage' then
  if not private.is_platform_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  select content into m from public.ten_content where id=payload->>'mission_id' for update;
  idx:=(payload->>'stage_index')::integer;
  if m is null or idx is null or idx<0 or idx>=jsonb_array_length(m->'stages') then raise exception 'Invalid stage'; end if;
  s:=m->'stages'->idx;
  if length(trim(payload->>'pptText')) not between 5 and 6000 or length(trim(payload->>'studentTask')) not between 5 and 2000 then raise exception 'Stage text is required'; end if;
  s:=s||jsonb_build_object('pptText',payload->>'pptText','studentTask',payload->>'studentTask',
    'feedback',left(coalesce(payload->>'feedback',''),6000),'mentorLens',nullif(left(coalesce(payload->>'mentorLens',''),1000),''));
  update public.ten_content set content=jsonb_set(m,array['stages',idx::text],s),published=false,updated_at=now() where id=payload->>'mission_id';
  insert into public.ten_events(actor_id,event_type,detail) values(uid,'content_edited',jsonb_build_object('mission_id',payload->>'mission_id','stage_index',idx));
  return jsonb_build_object('ok',true);
 end if;

 if operation='create' then
  sid:=(payload->>'session_id')::uuid;
  if not private.can_manage_session(sid) then raise exception 'Facilitator access required' using errcode='42501'; end if;
  select content into m from public.ten_content where id=payload->>'mission_id' and published;
  if m is null then raise exception 'Review and publish the mission first'; end if;
  insert into public.ten_runs(session_id,mission_id,content_snapshot,created_by) values(sid,m->>'id',m,uid)
   on conflict(session_id) do nothing returning id into rid;
  if rid is null then select id into rid from public.ten_runs where session_id=sid; end if;
  insert into public.ten_events(run_id,actor_id,event_type) values(rid,uid,'room_opened');
  return jsonb_build_object('id',rid);
 end if;

 if operation='join' then
  select q.id into rid from public.ten_runs q join public.sessions ss on ss.id=q.session_id
    where lower(ss.join_code)=lower(trim(payload->>'code')) and private.ten_can_view(q.id) order by q.created_at desc limit 1;
  if rid is null then raise exception 'No accessible mission for this code. Check your cohort membership.'; end if;
  return jsonb_build_object('id',rid);
 end if;

 if operation='codex' then
  select coalesce(jsonb_agg(jsonb_build_object('run_id',c.run_id,'mission_id',q.mission_id,'title',q.content_snapshot->>'title',
   'principle',q.content_snapshot->>'lens','reflection',c.reflection,'completed_at',c.completed_at,
   'framework',q.content_snapshot->'case'->>'problemRepresentation','references',q.content_snapshot->'clinicalReferences',
   'echo',(select coalesce(jsonb_agg(jsonb_build_object('index',e.ordinality-1,'prompt',case when now()>=q.completed_at+make_interval(hours=>(e.value->>'unlockDelayHours')::integer) then e.value->>'prompt' else null end,
      'unlock_at',q.completed_at+make_interval(hours=>(e.value->>'unlockDelayHours')::integer),
      'unlocked',now()>=q.completed_at+make_interval(hours=>(e.value->>'unlockDelayHours')::integer),
      'response',er.response,'answer',case when er.response is not null then e.value->>'answer' else null end) order by e.ordinality),'[]')
    from jsonb_array_elements(q.content_snapshot->'nexusEcho') with ordinality e
    left join public.ten_echo_responses er on er.run_id=q.id and er.user_id=uid and er.item_index=e.ordinality-1)) order by c.completed_at desc),'[]')
  into result from public.ten_codex c join public.ten_runs q on q.id=c.run_id where c.user_id=uid;
  return result;
 end if;

 rid:=(payload->>'run_id')::uuid;
 if not private.ten_can_view(rid) then raise exception 'Mission access required' using errcode='42501'; end if;
 -- One room lock serializes advance and response submission, preventing late writes.
 select * into r from public.ten_runs where id=rid for update;
 manager:=private.can_manage_session(r.session_id); m:=r.content_snapshot;
 total_steps:=jsonb_array_length(m->'stages'); s:=m->'stages'->r.stage_index;

 if operation='command' then
  if not manager then raise exception 'Facilitator required' using errcode='42501'; end if;
  if (payload->>'revision')::integer is distinct from r.revision then raise exception 'Room changed. Refresh before advancing.'; end if;
  next_phase:=payload->>'command';
  if not ((r.phase='waiting' and next_phase='commit_open') or
   (r.phase='commit_open' and next_phase='commit_locked') or
   (r.phase='commit_locked' and next_phase='discussion') or
   (r.phase='discussion' and ((coalesce((s->>'peerInstruction')::boolean,false) and next_phase='revote_open') or
      (not coalesce((s->>'peerInstruction')::boolean,false) and next_phase='reveal'))) or
   (r.phase='revote_open' and next_phase='reveal') or
   (r.phase='reveal' and next_phase='next') or
   (r.phase='transfer' and next_phase='debrief') or
   (r.phase='debrief' and next_phase='completed')) then raise exception 'This transition is not available'; end if;
  idx:=r.stage_index;
  if next_phase='next' then
   if idx+1<total_steps then idx:=idx+1;next_phase:='commit_open'; else next_phase:='transfer'; end if;
  end if;
  update public.ten_runs set phase=next_phase,stage_index=idx,revision=revision+1,
    discussion_ends_at=case when next_phase='discussion' then now()+interval '90 seconds' else null end,
    completed_at=case when next_phase='completed' then now() else completed_at end where id=rid;
  if next_phase='completed' then
   insert into public.ten_codex(run_id,user_id,completed_at) select rid,p.user_id,now() from public.ten_participants p where p.run_id=rid on conflict do nothing;
  end if;
  insert into public.ten_events(run_id,actor_id,event_type,detail) values(rid,uid,'phase_changed',jsonb_build_object('from',r.phase,'to',next_phase,'stage_index',idx));
  return jsonb_build_object('ok',true);
 end if;

 if operation='closeout' then
  if not manager or r.phase<>'completed' then raise exception 'Complete the mission before facilitator closeout'; end if;
  if jsonb_typeof(payload->'fidelity') is distinct from 'object' or length(coalesce(payload->>'notes',''))>3000 then raise exception 'Invalid closeout'; end if;
  insert into public.ten_events(run_id,actor_id,event_type,detail) values(rid,uid,'facilitator_closeout',
   jsonb_build_object('fidelity',jsonb_build_object('individual_before_discussion',coalesce((payload->'fidelity'->>'individual_before_discussion')::boolean,false),
    'answer_withheld',coalesce((payload->'fidelity'->>'answer_withheld')::boolean,false),'rationale_elicited',coalesce((payload->'fidelity'->>'rationale_elicited')::boolean,false),
    'debrief_completed',coalesce((payload->'fidelity'->>'debrief_completed')::boolean,false)),
    'notes',coalesce(payload->>'notes',''),'candidate_error_tags',s->'errorTags'));
  update public.ten_runs set revision=revision+1 where id=rid;
  return jsonb_build_object('ok',true);
 end if;

 if operation='respond' then
  if manager then raise exception 'Facilitators cannot submit learner responses'; end if;
  if r.phase not in ('commit_open','revote_open','transfer') then raise exception 'Responses are locked'; end if;
  idx:=(payload->>'stage_index')::integer; rnd:=case when r.phase='revote_open' then 2 else 1 end;
  if idx is distinct from (case when r.phase='transfer' then total_steps else r.stage_index end) or (payload->>'round')::integer is distinct from rnd then raise exception 'The room has moved to a different prompt'; end if;
  if rnd=2 and not exists(select 1 from public.ten_responses where run_id=rid and user_id=uid and stage_index=idx and round=1) then raise exception 'An initial response is required before a revote'; end if;
  answer_payload:=payload->'answer'; justification:=trim(coalesce(payload->>'justification',''));
  conf:=nullif(payload->>'confidence','')::integer;
  if conf is not null and conf not in (20,40,60,80,100) then raise exception 'Invalid confidence'; end if;
  if answer_payload is null or jsonb_typeof(answer_payload)<>'object' or length(answer_payload::text)>12000 or length(justification)>3000 then raise exception 'Invalid response'; end if;
  typ:=case when r.phase='transfer' then 'free_text' else s->>'responseType' end;
  if typ='single_choice' then
   if jsonb_typeof(answer_payload->'choice') is distinct from 'number' or (answer_payload->>'choice')::numeric<>trunc((answer_payload->>'choice')::numeric) or (answer_payload->>'choice')::integer<0 or (answer_payload->>'choice')::integer>=jsonb_array_length(s->'options') then raise exception 'Choose one option'; end if;
  elsif typ='true_false' then
   if jsonb_typeof(answer_payload->'choice') is distinct from 'boolean' then raise exception 'Choose true or false'; end if;
  elsif typ='multiselect' then
   if jsonb_typeof(answer_payload->'choices') is distinct from 'array' then raise exception 'Choose options'; end if;
   if jsonb_array_length(answer_payload->'choices')<1 then raise exception 'Choose at least one option'; end if;
   for v in select value from jsonb_array_elements(answer_payload->'choices') loop
    if jsonb_typeof(v)<>'number' or v::text::numeric<>trunc(v::text::numeric) or v::text::integer<0 or v::text::integer>=jsonb_array_length(s->'options') then raise exception 'Invalid option'; end if;
   end loop;
  else
   if length(trim(coalesce(answer_payload->>'text','')))<3 then raise exception 'Write your reasoning'; end if;
   if typ='problem_representation+differential_builder' then
    if length(trim(coalesce(answer_payload->>'most_likely','')))<2 or length(trim(coalesce(answer_payload->>'must_not_miss','')))<2 or length(trim(coalesce(answer_payload->>'less_likely','')))<2 then raise exception 'Complete the three differential categories'; end if;
   elsif typ='evidence_map' then
    if length(trim(coalesce(answer_payload->>'supports','')))<2 or length(trim(coalesce(answer_payload->>'opposes','')))<2 or length(trim(coalesce(answer_payload->>'missing','')))<2 then raise exception 'Complete the evidence map; write None if no opposing finding'; end if;
   elsif typ='differential+probability' then
    if coalesce(answer_payload->>'probability','') not in ('low','intermediate','high') then raise exception 'Choose a probability'; end if;
   end if;
  end if;
  if length(justification)<3 then raise exception 'Add a brief justification'; end if;
  insert into public.ten_participants(run_id,user_id) values(rid,uid) on conflict do nothing;
  insert into public.ten_responses(run_id,user_id,stage_index,round,payload,confidence,justification)
    values(rid,uid,idx,rnd,answer_payload,conf,justification);
  update public.ten_runs set revision=revision+1 where id=rid;
  insert into public.ten_events(run_id,actor_id,event_type,detail) values(rid,uid,case when rnd=2 then 'revote' else 'initial_commit' end,jsonb_build_object('stage_index',idx,'round',rnd));
  return jsonb_build_object('ok',true);
 end if;

 if operation in ('reflect','echo') then
  if r.phase<>'completed' or not exists(select 1 from public.ten_codex where run_id=rid and user_id=uid) then raise exception 'Complete this mission first'; end if;
  justification:=trim(coalesce(payload->>'text',''));
  if length(justification) not between 3 and 3000 then raise exception 'Write a response between 3 and 3000 characters'; end if;
  if operation='reflect' then
   update public.ten_codex set reflection=justification where run_id=rid and user_id=uid;
  else
   idx:=(payload->>'item_index')::integer; item:=m->'nexusEcho'->idx;
   if idx is null or idx<0 or item is null or now()<r.completed_at+make_interval(hours=>(item->>'unlockDelayHours')::integer) then raise exception 'This Nexus Echo is not unlocked yet'; end if;
   insert into public.ten_echo_responses(run_id,user_id,item_index,response) values(rid,uid,idx,justification);
  end if;
  return jsonb_build_object('ok',true);
 end if;

 if operation='snapshot' then
  if not manager and r.phase<>'completed' then insert into public.ten_participants(run_id,user_id) values(rid,uid) on conflict do nothing; end if;
  select coalesce(jsonb_agg(jsonb_build_object('stage_index',a.stage_index,'round',a.round,'payload',a.payload,'confidence',a.confidence,'justification',a.justification,'created_at',a.created_at) order by a.stage_index,a.round),'[]')
    into choices from public.ten_responses a where a.run_id=rid and a.user_id=uid;
  -- Explicit projection: future clues, facilitator-only notes and case keys never enter learner payloads.
  result:=jsonb_build_object('id',rid,'revision',r.revision,'phase',r.phase,'stage_index',r.stage_index,'stage_count',total_steps,
   'title',m->>'title','mission_id',r.mission_id,'mentor',m->>'mentor','lens',m->>'lens','focus',m->>'focus',
   'session_id',r.session_id,'join_code',(select join_code from public.sessions where id=r.session_id),'manager',manager,
   'completed_at',r.completed_at,'discussion_ends_at',r.discussion_ends_at,'responses',choices,
   'participants',(select count(*) from public.ten_participants where run_id=rid),
   'count',(select count(*) from public.ten_responses where run_id=rid and stage_index=(case when r.phase='transfer' then total_steps else r.stage_index end) and round=(case when r.phase='revote_open' then 2 else 1 end)),
   'initial_count',(select count(*) from public.ten_responses where run_id=rid and stage_index=r.stage_index and round=1));
  if r.phase not in ('waiting','transfer','debrief','completed') then
   result:=result||jsonb_build_object('stage',jsonb_build_object('id',s->>'id','sequence',s->'sequence','label',s->>'label',
    'pptText',s->>'pptText','studentTask',s->>'studentTask','responseType',s->>'responseType','peerInstruction',s->'peerInstruction',
    'collectConfidence',s->'collectConfidence','mentorLens',s->'mentorLens','options',s->'options','stabilityDelta',s->'stabilityDelta'));
   if r.phase='reveal' then result:=jsonb_set(result,'{stage}',(result->'stage')||jsonb_build_object('answer',s->'answer','feedback',s->'feedback','expectedReasoning',s->'expectedReasoning')); end if;
  end if;
  if manager then result:=result||jsonb_build_object('notes',s); end if;
  if r.phase in ('commit_locked','discussion','revote_open','reveal','debrief','completed') or manager then
   select coalesce(jsonb_object_agg(z.choice,z.n),'{}') into choices from (
    select a.payload->>'choice' as choice,count(*) n from public.ten_responses a where a.run_id=rid and a.stage_index=r.stage_index and a.round=1 and a.payload ? 'choice' group by a.payload->>'choice') z;
   result:=result||jsonb_build_object('distribution',choices);
  end if;
  if manager then
   select count(*) into changed from public.ten_responses a join public.ten_responses b on a.run_id=b.run_id and a.user_id=b.user_id and a.stage_index=b.stage_index and b.round=2
   where a.run_id=rid and a.round=1 and a.payload<>b.payload;
   result:=result||jsonb_build_object('changed_count',changed,
    'closeout_saved',exists(select 1 from public.ten_events where run_id=rid and event_type='facilitator_closeout'),
    'analytics',(select coalesce(jsonb_agg(jsonb_build_object('stage',x.stage_index+1,'round',x.round,'responses',x.n,'mean_confidence',x.mean_confidence) order by x.stage_index,x.round),'[]') from
     (select stage_index,round,count(*) n,round(avg(confidence),1) mean_confidence from public.ten_responses where run_id=rid group by stage_index,round) x));
  end if;
  if r.phase in ('transfer','debrief','completed') then
   result:=result||jsonb_build_object('transfer',case when r.phase='transfer' then (m->'transferCase')-'answer' else m->'transferCase' end);
  end if;
  if r.phase in ('debrief','completed') then
   result:=result||jsonb_build_object('completion',jsonb_build_object('principle',m->>'lens','representation',m->'case'->>'problemRepresentation','references',m->'clinicalReferences'));
  end if;
  -- Normalize source stage weights (some totals are 78/80) into process progress, never score correctness or speed.
  select coalesce(round(100.0*sum(case when x.ordinality-1<r.stage_index or (x.ordinality-1=r.stage_index and r.phase='reveal') or r.phase in ('transfer','debrief','completed') then (x.value->>'stabilityDelta')::numeric else 0 end)/nullif(sum((x.value->>'stabilityDelta')::numeric),0)),0)::integer
    into stability_value from jsonb_array_elements(m->'stages') with ordinality x;
  return result||jsonb_build_object('stability',stability_value);
 end if;
 raise exception 'Unknown mission action';
end;
$$;
revoke all on function private.ten_can_view(uuid),private.ten_is_staff(),private.ten_api(text,jsonb) from public,anon;
grant execute on function private.ten_can_view(uuid),private.ten_is_staff(),private.ten_api(text,jsonb) to authenticated;
create or replace function public.ten_api(operation text,payload jsonb default '{}') returns jsonb
language sql security invoker set search_path = '' as $$select private.ten_api(operation,payload);$$;
revoke all on function public.ten_api(text,jsonb) from public,anon;
grant execute on function public.ten_api(text,jsonb) to authenticated;

-- Broadcast only room identity/revision, never the content snapshot or answers.
create or replace function private.ten_broadcast() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform realtime.send(jsonb_build_object('revision',new.revision),'state','ten:'||new.id::text,true);
 return new;
end;$$;
revoke all on function private.ten_broadcast() from public,anon,authenticated;
create trigger ten_room_changed after update on public.ten_runs for each row execute function private.ten_broadcast();
create or replace function private.ten_topic_access(topic text) returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if topic !~ '^ten:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
 return private.ten_can_view(substring(topic from 5)::uuid);
end;$$;
revoke all on function private.ten_topic_access(text) from public,anon;
grant execute on function private.ten_topic_access(text) to authenticated;
create policy ten_room_broadcast_read on realtime.messages for select to authenticated
 using (private.ten_topic_access((select realtime.topic())));

-- Canonical First Activation v1.0 supplied by the project owner. Fictional educational cases.
insert into public.ten_content(id,content,published) values ('M01','{"id": "M01", "slug": "see-the-pattern", "title": "SEE THE PATTERN", "mentor": "Ibn Sina", "mentor_title": "The Integrator", "lens": "Connect the findings before naming the disease.", "focus": "Problem Representation + Differential Diagnosis + Red-Flag Recognition", "duration": 90, "premise": "A patient with a familiar symptom presents with one feature that should completely change the frame. The mission is to build a concise problem representation, prioritize a differential, and identify the clue that changes urgency.", "learning_outcomes": ["Construct a one-sentence Problem Representation using age/context, tempo, key positives, and key negatives.", "Build and rank a Differential Diagnosis using Most Likely / Must Not Miss / Less Likely categories.", "Identify red flags that should change urgency even when the neurological examination is normal.", "Explain why a previous benign diagnosis must not anchor interpretation of a new presentation."], "prereqs": ["Basic approach to headache history and neurological examination", "Primary versus secondary headache concepts", "Basic interpretation of urgency/red flags"], "signalIndex": 1, "stabilityTarget": 100, "case": {"patient": "32-year-old man", "setting": "Emergency Department", "finalDiagnosis": "Aneurysmal subarachnoid haemorrhage (educational fictional case)", "problemRepresentation": "32-year-old man with abrupt exertional thunderclap headache, maximal within 1 minute, vomiting, neck pain/stiffness and photophobia, normal focal neurological examination, requiring urgent evaluation for secondary intracranial haemorrhage.", "differential": [{"category": "Must Not Miss", "content": "Subarachnoid haemorrhage; cervical artery dissection; reversible cerebral vasoconstriction syndrome; cerebral venous thrombosis; meningitis depending on context"}, {"category": "Possible", "content": "Primary thunderclap headache; migraine with atypical features"}, {"category": "Lower after data", "content": "Tension-type headache; uncomplicated recurrent migraine"}]}, "stages": [{"id": "M01-S1", "sequence": 1, "label": "Initial Presentation", "pptText": "A 32-year-old man presents 40 minutes after the sudden onset of a severe headache with nausea and one episode of vomiting. He has had occasional migraines in the past but says: “This is different.”", "studentTask": "Write a one-sentence Problem Representation. Then rank 3 diagnoses: Most Likely / Must Not Miss / Less Likely.", "responseType": "problem_representation+differential_builder", "peerInstruction": false, "collectConfidence": false, "mentorLens": "IBN SINA LENS: Which detail changes the pattern from “headache” to “dangerous headache”?", "stabilityDelta": 10, "errorTags": ["anchoring", "unranked_differential", "red_flag_underweighting", "false_reassurance_normal_exam"], "expectedReasoning": "Young adult with abrupt severe new headache and vomiting, different from prior migraine; secondary thunderclap cause must be prioritized. SAH should be in Must Not Miss.", "commonErrors": ["Anchoring on prior migraine", "Listing diagnoses without ranking", "Ignoring tempo because the neurological examination is not yet known"]}, {"id": "M01-S2", "sequence": 2, "label": "Tempo and Trigger", "pptText": "The pain reached maximum intensity in less than 1 minute while he was lifting a heavy weight. He felt brief posterior neck pain at onset. No trauma, fever, or recent infection.", "studentTask": "Which feature has the highest diagnostic weight?", "responseType": "single_choice", "peerInstruction": true, "collectConfidence": true, "mentorLens": null, "stabilityDelta": 12, "errorTags": ["anchoring", "unranked_differential", "red_flag_underweighting", "false_reassurance_normal_exam"], "options": ["Vomiting", "History of migraine", "Maximum intensity in <1 minute", "Age 32 years"], "answer": 2, "feedback": "Sudden-onset headache reaching maximum intensity within minutes is a major red flag and should dominate the representation. Exertional onset adds concern."}, {"id": "M01-S3", "sequence": 3, "label": "Examination", "pptText": "BP 158/92 mmHg, HR 88/min, Temp 36.8°C, GCS 15. Photophobia and mild neck stiffness are present. Cranial nerves, power, sensation, coordination and speech are normal.", "studentTask": "A normal focal neurological examination makes an urgent secondary cause unlikely.", "responseType": "true_false", "peerInstruction": true, "collectConfidence": true, "mentorLens": null, "stabilityDelta": 12, "errorTags": ["anchoring", "unranked_differential", "red_flag_underweighting", "false_reassurance_normal_exam"], "answer": false, "feedback": "A normal focal neurological examination does not make thunderclap headache safe. The tempo and meningeal features remain high-risk."}, {"id": "M01-S4", "sequence": 4, "label": "Decision Point", "pptText": "You now need to decide the safest next step.", "studentTask": "What is the most appropriate next action?", "responseType": "single_choice", "peerInstruction": true, "collectConfidence": true, "mentorLens": null, "stabilityDelta": 16, "errorTags": ["anchoring", "unranked_differential", "red_flag_underweighting", "false_reassurance_normal_exam"], "options": ["Treat as migraine and observe response", "Arrange routine outpatient MRI", "Urgent senior assessment and non-contrast CT head", "Reassure because GCS is 15"], "answer": 2, "feedback": "For suspected SAH with unexplained thunderclap headache, urgent secondary-care review and non-contrast CT head are recommended. Diagnostic accuracy is highest within 6 hours of onset."}, {"id": "M01-S5", "sequence": 5, "label": "Investigation Result", "pptText": "Non-contrast CT head performed 2 hours after onset shows blood in the subarachnoid space.", "studentTask": "Which statement best describes the reasoning lesson from this case?", "responseType": "single_choice", "peerInstruction": false, "collectConfidence": false, "mentorLens": null, "stabilityDelta": 18, "errorTags": ["anchoring", "unranked_differential", "red_flag_underweighting", "false_reassurance_normal_exam"], "options": ["Migraine history should be ignored in all future headaches", "A single normal examination finding can rule out dangerous disease", "Tempo and context can outweigh familiarity of the symptom", "Imaging should be ordered for every headache"], "answer": 2, "feedback": "Clinical reasoning depends on discriminating features. A familiar symptom becomes a different problem when its tempo, context and red flags change."}, {"id": "M01-S6", "sequence": 6, "label": "Closing Safety Step", "pptText": "The patient is now confirmed to have SAH.", "studentTask": "What is the appropriate next diagnostic pathway concept?", "responseType": "single_choice", "peerInstruction": false, "collectConfidence": false, "mentorLens": null, "stabilityDelta": 12, "errorTags": ["anchoring", "unranked_differential", "red_flag_underweighting", "false_reassurance_normal_exam"], "options": ["No further investigation is needed", "CTA of the head to identify the bleeding source, with specialist discussion", "Routine EEG", "Discharge if pain improves"], "answer": 1, "feedback": "NICE recommends CT angiography without delay after confirmed SAH to identify the cause and guide specialist management."}], "activities": [{"name": "60-second solo representation", "description": "Learners write one sentence before any group discussion."}, {"name": "Differential Builder", "description": "Drag diagnoses into Most Likely / Must Not Miss / Less Likely."}, {"name": "Peer Instruction Cycle", "description": "Vote → show distribution → 90-second peer discussion → revote → reveal rationale."}, {"name": "Evidence Weighting", "description": "Learners mark the clue with the greatest diagnostic weight."}, {"name": "Transfer Micro-case", "description": "A new headache case with different red flags tests transfer rather than recall."}], "transferCase": {"stem": "A 28-year-old woman taking immunosuppressive therapy develops a new progressive headache over 3 days with fever and repeated vomiting. Neurological examination is normal.", "question": "Which principle transfers from the main case?", "answer": "A normal focal neurological examination does not neutralize red flags. New headache with immunocompromise, fever or unexplained vomiting requires further evaluation/referral."}, "nexusEcho": [{"unlockDelayHours": 60, "prompt": "Which single feature in the main case most changed urgency?", "answer": "Time to peak: maximum intensity in less than 1 minute."}, {"unlockDelayHours": 60, "prompt": "Why was “history of migraine” dangerous as an early anchor?", "answer": "Because a substantially different pattern must be re-represented as a new problem, not assumed to be recurrence."}, {"unlockDelayHours": 60, "prompt": "What is the key purpose of a Problem Representation?", "answer": "To compress discriminating features into a concise statement that guides a ranked differential."}, {"unlockDelayHours": 60, "prompt": "What did the normal neurological examination fail to do?", "answer": "It failed to rule out a dangerous secondary headache cause."}], "clinicalReferences": ["NICE. Headaches in over 12s: diagnosis and management (CG150). Last updated 3 June 2025.", "NICE. Subarachnoid haemorrhage caused by a ruptured aneurysm: diagnosis and management (NG228). Recommendations on suspected SAH, urgent non-contrast CT, and investigation after negative CT."]}'::jsonb,true);
insert into public.ten_content(id,content,published) values ('M02','{"id": "M02", "slug": "question-the-evidence", "title": "QUESTION THE EVIDENCE", "mentor": "Al-Razi", "mentor_title": "The Empiricist", "lens": "What does the evidence actually show—and what does it not show?", "focus": "Evidence Interpretation + Diagnostic Updating + Cognitive Bias", "duration": 90, "premise": "The patient’s own label and an initially reassuring test tempt premature closure. The mission is to distinguish what a test truly changes from what it cannot exclude.", "learning_outcomes": ["Interpret an initially nondiagnostic ECG and troponin without treating them as definitive rule-out tests.", "Update diagnostic probability when serial evidence changes.", "Identify framing, anchoring and premature closure in an acute chest-pain pathway.", "Use explicit Supports / Opposes / Missing evidence to justify a final diagnosis."], "prereqs": ["Basic ACS symptom recognition", "ECG basics", "Concept of serial biomarkers and pretest probability"], "signalIndex": 2, "stabilityTarget": 100, "case": {"patient": "58-year-old woman", "setting": "Emergency Department", "finalDiagnosis": "Non-ST-elevation myocardial infarction (NSTEMI; fictional educational case)", "problemRepresentation": "58-year-old woman with diabetes and hypertension presenting with exertional pressure-like central/upper abdominal discomfort, nausea and diaphoresis, initially nondiagnostic ECG and early hs-cTn, followed by dynamic troponin rise and ischemic ECG changes consistent with NSTE-ACS.", "differential": [{"category": "Most Likely after update", "content": "NSTEMI / NSTE-ACS"}, {"category": "Must Not Miss early", "content": "ACS, aortic syndrome, pulmonary embolism depending on features"}, {"category": "Alternative", "content": "Gastroesophageal, musculoskeletal, biliary or anxiety-related causes only after dangerous causes are reasonably addressed"}]}, "stages": [{"id": "M02-S1", "sequence": 1, "label": "The Patient’s Label", "pptText": "A 58-year-old woman with type 2 diabetes and hypertension says she has “indigestion.” For 45 minutes she has had central pressure-like discomfort with nausea and sweating after climbing two flights of stairs. It improved but did not fully resolve with rest.", "studentTask": "Before tests, select the safest working frame.", "responseType": "single_choice", "peerInstruction": false, "collectConfidence": true, "mentorLens": null, "stabilityDelta": 10, "errorTags": ["framing", "premature_closure", "binary_test_interpretation", "overconfidence", "failure_to_use_serial_evidence"], "options": ["Likely reflux; cardiac testing only if symptoms recur", "Possible ACS until reasonably excluded", "Musculoskeletal pain because the discomfort is not severe", "Anxiety because symptoms are vague"], "answer": 1, "feedback": "The symptom label “indigestion” should not override exertional pressure, autonomic symptoms and cardiovascular risk. Use cardiac/possibly cardiac/noncardiac framing rather than “typical/atypical.”"}, {"id": "M02-S2", "sequence": 2, "label": "Initial ECG", "pptText": "A 12-lead ECG obtained promptly shows sinus rhythm with no ST elevation and no clear ischemic ST-T changes.", "studentTask": "What does this result justify?", "responseType": "single_choice", "peerInstruction": true, "collectConfidence": true, "mentorLens": null, "stabilityDelta": 12, "errorTags": ["framing", "premature_closure", "binary_test_interpretation", "overconfidence", "failure_to_use_serial_evidence"], "options": ["ACS is excluded", "STEMI is not demonstrated, but ACS remains possible", "No further ECGs are useful", "Troponin is unnecessary"], "answer": 1, "feedback": "An initial nondiagnostic ECG does not exclude ACS. Serial ECGs are recommended when suspicion remains high, symptoms persist or the condition changes."}, {"id": "M02-S3", "sequence": 3, "label": "First Biomarker", "pptText": "High-sensitivity cardiac troponin is within the laboratory reference range on the first sample, taken about 50 minutes after symptom onset.", "studentTask": "What is the best interpretation?", "responseType": "single_choice", "peerInstruction": true, "collectConfidence": true, "mentorLens": null, "stabilityDelta": 12, "errorTags": ["framing", "premature_closure", "binary_test_interpretation", "overconfidence", "failure_to_use_serial_evidence"], "options": ["MI is ruled out", "The result is nondiagnostic this early; serial hs-cTn is needed", "The result proves unstable angina", "The result proves noncardiac pain"], "answer": 1, "feedback": "In suspected ACS with an initially nondiagnostic hs-cTn, repeat measurement at the appropriate validated interval is required; the 2025 guideline cites 1–2 hours for hs-cTn pathways."}, {"id": "M02-S4", "sequence": 4, "label": "Bias Check", "pptText": "A colleague says: “The ECG and first troponin are normal. She probably just has reflux.”", "studentTask": "Tag the dominant reasoning error.", "responseType": "single_choice", "peerInstruction": false, "collectConfidence": false, "mentorLens": null, "stabilityDelta": 10, "errorTags": ["framing", "premature_closure", "binary_test_interpretation", "overconfidence", "failure_to_use_serial_evidence"], "options": ["Base-rate neglect", "Premature closure after partial reassurance", "Search satisfaction from imaging", "Availability bias only"], "answer": 1, "feedback": "The diagnosis is being closed before serial evidence and the clinical context have been integrated."}, {"id": "M02-S5", "sequence": 5, "label": "Serial Evidence", "pptText": "Two hours later, hs-cTn is clearly above the assay’s 99th percentile with a significant rise from baseline. Repeat ECG now shows new T-wave inversion in lateral leads.", "studentTask": "Update your diagnosis and confidence.", "responseType": "diagnosis+confidence", "peerInstruction": false, "collectConfidence": false, "mentorLens": null, "stabilityDelta": 18, "errorTags": ["framing", "premature_closure", "binary_test_interpretation", "overconfidence", "failure_to_use_serial_evidence"], "expectedReasoning": "NSTE-ACS/NSTEMI becomes the leading diagnosis. Confidence should increase because serial biomarker change and dynamic ECG evidence align with the clinical presentation."}, {"id": "M02-S6", "sequence": 6, "label": "Deliberate Reflection", "pptText": "Complete the evidence table before the final reveal.", "studentTask": "For ACS, list: Supporting findings / Opposing findings / Expected-but-missing findings / Final judgment.", "responseType": "evidence_map", "peerInstruction": false, "collectConfidence": false, "mentorLens": null, "stabilityDelta": 16, "errorTags": ["framing", "premature_closure", "binary_test_interpretation", "overconfidence", "failure_to_use_serial_evidence"], "expectedReasoning": "Supports: exertional pressure, diaphoresis/nausea, diabetes/HTN, dynamic hs-cTn rise, new T-wave inversion. Opposes: initial nondiagnostic ECG and first troponin—but these are weak opposing findings due timing. Missing: ST elevation is not required for NSTEMI. Final: NSTEMI."}], "activities": [{"name": "Framing Challenge", "description": "Learners rewrite “indigestion” into a neutral symptom representation."}, {"name": "Peer Instruction Cycle", "description": "Initial ECG interpretation → peer discussion → revote."}, {"name": "Confidence Tracking", "description": "Record confidence after each data stage; changing confidence is treated as learning, not failure."}, {"name": "Evidence Board", "description": "Supports / Opposes / Missing / Final judgment."}, {"name": "Bias Tagging", "description": "Learners identify the cognitive error in a realistic colleague statement."}], "transferCase": {"stem": "A 64-year-old woman with diabetes presents with new dyspnea, nausea and unusual fatigue without describing “chest pain.”", "question": "Should ACS remain in the differential? What two initial tests are central?", "answer": "Yes. ACS can present with accompanying or alternative symptoms. Prompt 12-lead ECG and cardiac troponin are central to initial assessment."}, "nexusEcho": [{"unlockDelayHours": 60, "prompt": "What does a nondiagnostic initial ECG do to ACS probability?", "answer": "It may reduce evidence for STEMI but does not exclude ACS; repeat ECGs may be needed."}, {"unlockDelayHours": 60, "prompt": "Why can an early normal hs-cTn be misleading?", "answer": "Timing matters; serial change is central when the first sample is nondiagnostic."}, {"unlockDelayHours": 60, "prompt": "What cognitive error occurred when reflux was accepted after two reassuring early tests?", "answer": "Premature closure reinforced by framing/anchoring."}, {"unlockDelayHours": 60, "prompt": "Which evidence most strongly changed the case?", "answer": "Dynamic hs-cTn rise plus evolving ischemic ECG changes in the clinical context."}], "clinicalReferences": ["ACC/AHA/ACEP/NAEMSP/SCAI. 2025 Guideline for the Management of Patients With Acute Coronary Syndromes. JACC/Circulation. 2025.", "ACC/AHA Multisociety. 2021 Guideline for the Evaluation and Diagnosis of Chest Pain."]}'::jsonb,true);
insert into public.ten_content(id,content,published) values ('M03','{"id": "M03", "slug": "test-the-hypothesis", "title": "TEST THE HYPOTHESIS", "mentor": "Jabir ibn Hayyan", "mentor_title": "The Experimentalist", "lens": "A test is useful only when it answers the right question at the right probability.", "focus": "Investigation Selection + Pretest Probability + Diagnostic Updating + Decision Quality", "duration": 90, "premise": "The challenge is not “Which test diagnoses PE?” but “Which test is appropriate now?” The mission teaches a sequence from clinical probability to targeted investigation.", "learning_outcomes": ["Use clinical probability to choose an appropriate PE testing pathway rather than jumping directly to imaging.", "Explain when PERC, a two-level PE Wells score, D-dimer and CTPA belong in the sequence.", "Interpret a positive D-dimer as a trigger for further testing rather than proof of PE.", "Update diagnosis after definitive imaging and identify a safe management principle without overstepping local protocols."], "prereqs": ["Basic PE symptoms and risk factors", "Basic concept of clinical prediction rules", "D-dimer and CTPA fundamentals"], "signalIndex": 3, "stabilityTarget": 100, "case": {"patient": "42-year-old woman", "setting": "Acute assessment unit", "finalDiagnosis": "Segmental pulmonary embolism (fictional educational case)", "problemRepresentation": "42-year-old woman with acute pleuritic chest pain and dyspnea, normal oxygenation and hemodynamics, estrogen exposure but few other VTE features, requiring structured PE probability assessment and staged testing rather than reflex imaging.", "differential": [{"category": "Possible", "content": "Pulmonary embolism; pleurisy; musculoskeletal pain; pneumothorax; pericarditis depending on examination"}, {"category": "Must Not Miss", "content": "PE and pneumothorax; ACS depending on features"}, {"category": "After CTPA", "content": "Confirmed segmental PE"}]}, "stages": [{"id": "M03-S1", "sequence": 1, "label": "Initial Presentation", "pptText": "A 42-year-old woman presents with 6 hours of sudden pleuritic right-sided chest pain and shortness of breath. HR 96/min, SpO2 97% on room air, BP 124/78 mmHg. She is afebrile and has no cough. Examination shows no unilateral leg swelling.", "studentTask": "Rank your differential and estimate whether PE suspicion is low, intermediate, or high based on the whole picture.", "responseType": "differential+probability", "peerInstruction": false, "collectConfidence": false, "mentorLens": null, "stabilityDelta": 10, "errorTags": ["test_before_probability", "ctpa_overuse", "d_dimer_as_rule_in", "prediction_rule_misuse"], "expectedReasoning": "PE remains possible but not yet proven; alternative causes remain feasible. The next step depends on structured probability assessment rather than immediate CTPA."}, {"id": "M03-S2", "sequence": 2, "label": "PERC Check", "pptText": "She has no previous DVT/PE, no hemoptysis, no recent surgery/trauma and no malignancy. She does take a combined estrogen-containing oral contraceptive.", "studentTask": "Can PERC be used to stop testing if overall clinical suspicion is low?", "responseType": "single_choice", "peerInstruction": true, "collectConfidence": true, "mentorLens": null, "stabilityDelta": 12, "errorTags": ["test_before_probability", "ctpa_overuse", "d_dimer_as_rule_in", "prediction_rule_misuse"], "options": ["Yes, because age is <50 and HR <100", "No, because estrogen use makes PERC positive", "Yes, because oxygen saturation is normal", "No, because PERC is never used in adults"], "answer": 1, "feedback": "If suspicion is low, PERC can help decide whether further testing is needed, but all criteria must be negative. Estrogen use prevents a PERC-negative result."}, {"id": "M03-S3", "sequence": 3, "label": "Wells Pathway", "pptText": "On the two-level PE Wells score, she has no DVT signs, HR is under 100, no recent immobilisation/surgery, no previous VTE, no hemoptysis and no malignancy. The clinician does not judge PE more likely than all alternatives.", "studentTask": "Which test is most appropriate next?", "responseType": "single_choice", "peerInstruction": true, "collectConfidence": true, "mentorLens": null, "stabilityDelta": 14, "errorTags": ["test_before_probability", "ctpa_overuse", "d_dimer_as_rule_in", "prediction_rule_misuse"], "options": ["CTPA immediately", "D-dimer", "No testing and discharge", "Troponin only"], "answer": 1, "feedback": "With PE suspected but Wells score 4 or less (PE unlikely), NICE recommends D-dimer testing rather than immediate CTPA."}, {"id": "M03-S4", "sequence": 4, "label": "D-dimer Result", "pptText": "D-dimer is elevated above the laboratory threshold.", "studentTask": "What does this result mean?", "responseType": "single_choice", "peerInstruction": false, "collectConfidence": false, "mentorLens": null, "stabilityDelta": 12, "errorTags": ["test_before_probability", "ctpa_overuse", "d_dimer_as_rule_in", "prediction_rule_misuse"], "options": ["PE is confirmed", "The result is nonspecific but now supports proceeding to definitive imaging", "Anticoagulation must be given without considering bleeding risk or imaging", "The diagnosis is pneumonia"], "answer": 1, "feedback": "A positive D-dimer is not diagnostic of PE. In the PE-unlikely pathway, it indicates the need for imaging such as CTPA when appropriate."}, {"id": "M03-S5", "sequence": 5, "label": "Definitive Test", "pptText": "CT pulmonary angiography shows an acute segmental pulmonary embolus. She remains hemodynamically stable and has no obvious active bleeding.", "studentTask": "Which management principle is safest to state at this stage?", "responseType": "single_choice", "peerInstruction": false, "collectConfidence": false, "mentorLens": null, "stabilityDelta": 18, "errorTags": ["test_before_probability", "ctpa_overuse", "d_dimer_as_rule_in", "prediction_rule_misuse"], "options": ["Confirmed PE generally requires anticoagulation unless contraindicated, using local/specialist protocol", "All stable PE requires thrombolysis", "No treatment is needed for segmental PE", "D-dimer should be repeated before treatment"], "answer": 0, "feedback": "The educational principle is to move from confirmed diagnosis to appropriate anticoagulation assessment while checking contraindications and following local protocol. Thrombolysis is not routine for stable PE."}, {"id": "M03-S6", "sequence": 6, "label": "Experiment Debrief", "pptText": "Review the sequence: suspicion → probability rule → D-dimer → imaging → management.", "studentTask": "Which common error did this pathway prevent?", "responseType": "single_choice", "peerInstruction": false, "collectConfidence": false, "mentorLens": null, "stabilityDelta": 14, "errorTags": ["test_before_probability", "ctpa_overuse", "d_dimer_as_rule_in", "prediction_rule_misuse"], "options": ["Overtesting by jumping straight to CTPA", "Underrecognition of fever", "Using serial troponin", "Checking medication history"], "answer": 0, "feedback": "Clinical prediction and staged testing reduce unnecessary imaging while preserving diagnostic safety when used appropriately."}], "activities": [{"name": "Probability Before Test", "description": "Learners must select clinical probability before any investigation options appear."}, {"name": "Rule Builder", "description": "Interactive PERC and two-level Wells walkthrough."}, {"name": "Choose-the-Next-Test", "description": "Students select only one next investigation and justify why it is appropriate now."}, {"name": "Test Meaning Card", "description": "After D-dimer, learners label the result as Rule-in / Rule-out / Nonspecific trigger."}, {"name": "Sequence Reconstruction", "description": "Teams drag the diagnostic pathway into the correct order at debrief."}], "transferCase": {"stem": "A 68-year-old man with low overall clinical suspicion of PE has no DVT signs, HR 88, normal oxygen saturation and no hemoptysis.", "question": "Why can PERC not provide a completely negative result in this patient, and what principle follows?", "answer": "Age ≥50 makes PERC positive. If PE is still suspected, proceed to an appropriate probability-based pathway such as Wells and D-dimer rather than using PERC to stop testing."}, "nexusEcho": [{"unlockDelayHours": 60, "prompt": "What question should come before “Which test?” in suspected PE?", "answer": "What is the patient’s pretest/clinical probability?"}, {"unlockDelayHours": 60, "prompt": "What does a positive D-dimer prove?", "answer": "It does not prove PE; it indicates need for further evaluation/imaging in the appropriate pathway."}, {"unlockDelayHours": 60, "prompt": "When is immediate CTPA more appropriate in the NICE pathway?", "answer": "When PE is likely by the two-level Wells score, if CTPA is suitable."}, {"unlockDelayHours": 60, "prompt": "What was the main test-selection error this mission tried to prevent?", "answer": "Jumping directly to imaging without probability assessment."}], "clinicalReferences": ["NICE. Venous thromboembolic diseases: diagnosis, management and thrombophilia testing (NG158). Recommendations on PERC, two-level PE Wells score, D-dimer and CTPA."]}'::jsonb,true);
insert into public.ten_content(id,content,published) values ('M04','{"id": "M04", "slug": "treat-the-patient", "title": "TREAT THE PATIENT", "mentor": "Hippocrates", "mentor_title": "The Observer", "lens": "The safest decision is the one that fits the patient—not just the disease label.", "focus": "Integration + Patient Safety + Prioritization + Reassessment + Patient-Centered Reasoning", "duration": 90, "premise": "The final mission requires learners to integrate diagnosis, urgency, treatment, reassessment and human factors. The patient’s comorbidities and medication history change what “standard” management means.", "learning_outcomes": ["Recognize a high-risk sepsis presentation using structured deterioration assessment and clinical concern.", "Prioritize immediate actions while still considering alternative diagnoses.", "Apply reassessment after interventions rather than treating the plan as a one-time checklist.", "Identify patient-safety risks involving medication allergy, renal/cardiac comorbidity, communication and escalation.", "Demonstrate independent transfer using all four reasoning lenses with minimal scaffolding."], "prereqs": ["Basic approach to sepsis and acute deterioration", "NEWS2 familiarity or equivalent structured observations", "Basic fluid resuscitation and medication safety concepts"], "signalIndex": 4, "stabilityTarget": 100, "case": {"patient": "74-year-old woman", "setting": "Emergency Department", "finalDiagnosis": "High-risk suspected sepsis, likely urinary source, with hypoperfusion/AKI (fictional educational case)", "problemRepresentation": "74-year-old woman with acute delirium and suspected urinary infection, hypotension, tachycardia, tachypnea, hypoxemia, fever, elevated lactate and AKI, complicated by CKD/heart failure and an uncertain penicillin-allergy label, requiring urgent high-risk sepsis care with iterative reassessment and medication-safety checks.", "differential": [{"category": "Leading", "content": "Sepsis from urinary source"}, {"category": "Must Also Consider", "content": "Other infection source, hypoglycemia, medication toxicity, stroke, dehydration/other shock states depending on findings"}, {"category": "Safety Context", "content": "Fluid overload risk, renal dosing, allergy verification, communication and escalation"}]}, "stages": [{"id": "M04-S1", "sequence": 1, "label": "Presentation", "pptText": "A 74-year-old woman is brought by her daughter for new confusion, weakness and poor oral intake. She has had dysuria for 2 days and felt feverish overnight. Baseline cognition is normal.", "studentTask": "Name the two priorities that must run in parallel.", "responseType": "free_text", "peerInstruction": false, "collectConfidence": false, "mentorLens": null, "stabilityDelta": 10, "errorTags": ["checklist_without_reassessment", "safety_omission", "allergy_label_acceptance", "fluid_automaticity", "failure_to_escalate"], "expectedReasoning": "Recognize and stabilize acute deterioration/suspected sepsis while simultaneously considering alternative causes of delirium and gathering source/medication information."}, {"id": "M04-S2", "sequence": 2, "label": "Physiology", "pptText": "RR 24/min, SpO2 93% on room air, HR 112/min, BP 92/58 mmHg, Temp 39.2°C, new confusion.", "studentTask": "How should this change urgency?", "responseType": "single_choice", "peerInstruction": true, "collectConfidence": true, "mentorLens": null, "stabilityDelta": 14, "errorTags": ["checklist_without_reassessment", "safety_omission", "allergy_label_acceptance", "fluid_automaticity", "failure_to_escalate"], "options": ["Low risk because infection source is obvious", "High risk of severe illness/death; urgent senior assessment and treatment pathway", "Observe for 6 hours before escalation", "Treat only the fever first"], "answer": 1, "feedback": "The combination of suspected infection and markedly abnormal physiology/new confusion gives a high NEWS2 and requires urgent high-risk sepsis management and senior review."}, {"id": "M04-S3", "sequence": 3, "label": "Comorbidity and Human Factors", "pptText": "History: CKD stage 3 and heart failure with preserved EF. Medication list is incomplete. The electronic record says “penicillin allergy,” but the daughter recalls only severe nausea years ago and no rash, swelling, wheeze or collapse.", "studentTask": "Select the safest actions.", "responseType": "multiselect", "peerInstruction": false, "collectConfidence": false, "mentorLens": null, "stabilityDelta": 14, "errorTags": ["checklist_without_reassessment", "safety_omission", "allergy_label_acceptance", "fluid_automaticity", "failure_to_escalate"], "options": ["Clarify the allergy history rather than accepting an unexamined label", "Reconcile current medicines and renal function", "Delay all antibiotics until a full allergy clinic review", "Use local antimicrobial guidance and senior/pharmacy input without unnecessary delay", "Ignore comorbidities because sepsis protocols are standard"], "answer": [0, 1, 3], "feedback": "Medication safety requires clarification of allergy phenotype, medication reconciliation and renal/cardiac context. High-risk sepsis still requires timely treatment using local policy and appropriate escalation."}, {"id": "M04-S4", "sequence": 4, "label": "Investigations and Hypoperfusion", "pptText": "Venous lactate 3.1 mmol/L. Creatinine is 1.8 mg/dL, baseline 1.1. Urinalysis supports infection; blood cultures and other source investigations are obtained without delaying urgent care.", "studentTask": "What does this add to the reasoning?", "responseType": "single_choice", "peerInstruction": false, "collectConfidence": false, "mentorLens": null, "stabilityDelta": 14, "errorTags": ["checklist_without_reassessment", "safety_omission", "allergy_label_acceptance", "fluid_automaticity", "failure_to_escalate"], "options": ["It lowers urgency because a source is identified", "It supports hypoperfusion/organ dysfunction and reinforces high-risk management", "Lactate alone proves septic shock", "AKI is irrelevant to treatment choices"], "answer": 1, "feedback": "Lactate elevation and acute kidney injury are evidence of hypoperfusion/organ dysfunction and increase concern. Lactate should not be interpreted in isolation, but here it strengthens the high-risk picture."}, {"id": "M04-S5", "sequence": 5, "label": "Treatment and Reassessment", "pptText": "The team starts local-guideline broad-spectrum IV antibiotics promptly, and gives an isotonic crystalloid 250 mL bolus because there is no absolute contraindication.", "studentTask": "What is the next best reasoning action?", "responseType": "single_choice", "peerInstruction": true, "collectConfidence": true, "mentorLens": null, "stabilityDelta": 16, "errorTags": ["checklist_without_reassessment", "safety_omission", "allergy_label_acceptance", "fluid_automaticity", "failure_to_escalate"], "options": ["Give several liters immediately without reassessment", "Reassess blood pressure, perfusion, mental state and respiratory status before deciding on further boluses", "Stop monitoring once antibiotics are given", "Wait until the next day to recalculate deterioration score"], "answer": 1, "feedback": "NICE 2025 recommends 250 mL boluses with reassessment after each bolus, with escalation if response is inadequate. This is especially important when fluid overload risk exists."}, {"id": "M04-S6", "sequence": 6, "label": "Response", "pptText": "After 250 mL, BP is 100/62 mmHg, HR 104/min, confusion persists and breathing is slightly more laboured.", "studentTask": "What is the safest interpretation?", "responseType": "single_choice", "peerInstruction": false, "collectConfidence": false, "mentorLens": null, "stabilityDelta": 16, "errorTags": ["checklist_without_reassessment", "safety_omission", "allergy_label_acceptance", "fluid_automaticity", "failure_to_escalate"], "options": ["The patient is fixed; continue the same plan without review", "Some hemodynamic improvement, but persistent concern requires reassessment, senior decision-making and careful next steps", "The fluid response proves the diagnosis", "Stop all further treatment because breathing worsened slightly"], "answer": 1, "feedback": "Management is iterative. Partial response plus new respiratory concern in a patient with heart/renal disease requires reassessment and senior input rather than automatic continuation or premature stopping."}, {"id": "M04-S7", "sequence": 7, "label": "Final Integration", "pptText": "You must now explain the case to the patient and daughter and hand over to the senior team.", "studentTask": "Give a 30-second synthesis: Problem Representation + priorities + safety risks + what must be reassessed.", "responseType": "team_commit", "peerInstruction": false, "collectConfidence": false, "mentorLens": null, "stabilityDelta": 16, "errorTags": ["checklist_without_reassessment", "safety_omission", "allergy_label_acceptance", "fluid_automaticity", "failure_to_escalate"], "expectedReasoning": "Older adult with suspected urinary-source infection, marked physiological derangement/new confusion, lactate elevation and AKI, high risk of deterioration; urgent sepsis treatment and senior escalation, careful fluids with reassessment, verified allergy/medication context, ongoing monitoring and patient/family communication."}], "activities": [{"name": "Parallel Priorities", "description": "Teams identify “stabilize now” and “diagnose safely” actions simultaneously."}, {"name": "Safety Multiselect", "description": "Allergy, renal function, medication reconciliation and local antimicrobial policy."}, {"name": "Reassessment Loop", "description": "Students must choose what to reassess after each intervention before further action unlocks."}, {"name": "Handover Synthesis", "description": "30-second team commit integrating diagnosis, risk, management and safety."}, {"name": "Final Transfer Case", "description": "Minimal scaffolding; all four lenses are available only as optional prompts."}], "transferCase": {"stem": "A 70-year-old man with suspected infection has NEWS2 5 and lactate 2.5 mmol/L with evidence of acute kidney injury.", "question": "What principle should guide risk classification?", "answer": "Evidence of hypoperfusion such as lactate >2 mmol/L or AKI in a moderate-risk patient should trigger management as high risk in the NICE pathway."}, "nexusEcho": [{"unlockDelayHours": 60, "prompt": "Why is reassessment a reasoning skill rather than a nursing checklist?", "answer": "Because treatment changes physiology and new data should update the next decision."}, {"unlockDelayHours": 60, "prompt": "What medication-safety action was required before using the allergy label?", "answer": "Clarify the reaction phenotype and reconcile medications/renal context."}, {"unlockDelayHours": 60, "prompt": "Why were 250 mL fluid boluses used in the case?", "answer": "To allow stepwise resuscitation with reassessment, particularly when overload risk exists; local protocols still govern practice."}, {"unlockDelayHours": 60, "prompt": "What is the final mission’s core principle?", "answer": "Treat the patient as an evolving system: diagnosis, urgency, therapy, safety and reassessment must be integrated."}], "clinicalReferences": ["NICE. Suspected sepsis in people aged 16 or over: recognition, assessment and early management (NG253). 2025 recommendations with 2026 update notes.", "World Health Organization. Patient Safety Curriculum Guide: Multi-professional Edition. WHO; 2011.", "World Health Organization. Medication Without Harm resources, including medication safety in high-risk situations."]}'::jsonb,true);

