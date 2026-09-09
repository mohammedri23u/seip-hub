alter table public.learner_journey_onboarding
  add column if not exists story_progress jsonb not null default '{}'::jsonb,
  add column if not exists guide_uses jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.learner_journey_onboarding'::regclass
      and conname = 'learner_journey_onboarding_story_progress_object_check'
  ) then
    alter table public.learner_journey_onboarding
      add constraint learner_journey_onboarding_story_progress_object_check
      check (jsonb_typeof(story_progress) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.learner_journey_onboarding'::regclass
      and conname = 'learner_journey_onboarding_guide_uses_object_check'
  ) then
    alter table public.learner_journey_onboarding
      add constraint learner_journey_onboarding_guide_uses_object_check
      check (jsonb_typeof(guide_uses) = 'object');
  end if;
end
$$;

create or replace function public.ten_experience_state(target_cohort_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  pid uuid;
  arrival_at timestamptz;
  selected_guide text;
  guide_at timestamptz;
  version text;
  stories jsonb;
  uses jsonb;
  earned_runs jsonb;
  earned_signals jsonb;
begin
  if uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  cid := private.current_learner_cohort(uid, target_cohort_id);
  if cid is null then
    return jsonb_build_object('enrolled', false);
  end if;

  select c.program_id into pid from public.cohorts c where c.id = cid;

  select o.arrival_completed_at, o.guide_key, o.guide_selected_at, o.experience_version,
         o.story_progress, o.guide_uses
    into arrival_at, selected_guide, guide_at, version, stories, uses
  from public.learner_journey_onboarding o
  where o.program_id = pid and o.learner_id = uid;

  select coalesce(jsonb_agg(c.run_id order by c.completed_at), '[]'::jsonb) into earned_runs
  from public.ten_codex c
  join public.ten_runs r on r.id = c.run_id
  join public.sessions s on s.id = r.session_id
  where c.user_id = uid and s.cohort_id = cid;

  select coalesce(jsonb_agg(x.mission_id order by x.mission_id), '[]'::jsonb) into earned_signals
  from (
    select distinct r.mission_id
    from public.ten_codex c
    join public.ten_runs r on r.id = c.run_id
    join public.sessions s on s.id = r.session_id
    where c.user_id = uid and s.cohort_id = cid
  ) x;

  return jsonb_build_object(
    'enrolled', true,
    'arrival_complete', arrival_at is not null,
    'arrival_completed_at', arrival_at,
    'guide_key', selected_guide,
    'guide_selected_at', guide_at,
    'experience_version', coalesce(version, 'baghdad_nexus_v1'),
    'story_progress', coalesce(stories, '{}'::jsonb),
    'guide_uses', coalesce(uses, '{}'::jsonb),
    'earned_run_ids', coalesce(earned_runs, '[]'::jsonb),
    'earned_signal_ids', coalesce(earned_signals, '[]'::jsonb)
  );
end;
$$;

create or replace function public.ten_experience_command(
  operation text,
  payload jsonb default '{}'::jsonb,
  target_cohort_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  pid uuid;
  pre_id uuid;
  rid uuid;
  new_guide text;
  selected_guide text;
  arrival_at timestamptz;
  story_id text;
  scene_id text;
  story_state jsonb;
  story_entry jsonb;
  guide_state jsonb;
  is_complete boolean;
  run_phase text;
  mission_key text;
begin
  if uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if jsonb_typeof(payload) is distinct from 'object' then
    raise exception 'Invalid experience request' using errcode = '22023';
  end if;

  cid := private.current_learner_cohort(uid, target_cohort_id);
  if cid is null then
    raise exception 'No active learner cohort' using errcode = '42501';
  end if;

  select c.program_id into pid from public.cohorts c where c.id = cid;

  select o.arrival_completed_at, o.guide_key, o.story_progress, o.guide_uses
    into arrival_at, selected_guide, story_state, guide_state
  from public.learner_journey_onboarding o
  where o.program_id = pid and o.learner_id = uid
  for update;

  if not found then
    raise exception 'Complete orientation first' using errcode = '42501';
  end if;
  story_state := coalesce(story_state, '{}'::jsonb);
  guide_state := coalesce(guide_state, '{}'::jsonb);

  if operation = 'complete_arrival' then
    select a.id into pre_id
    from public.assessments a
    left join public.program_journey_settings s on s.program_id = pid and s.active
    where a.cohort_id = cid
      and (a.id = s.pre_assessment_id or (s.pre_assessment_id is null and a.assessment_type = 'diagnostic'))
    order by (a.id = s.pre_assessment_id) desc nulls last, a.created_at
    limit 1;

    if pre_id is null or not exists (
      select 1 from public.assessment_attempts aa
      where aa.assessment_id = pre_id and aa.learner_id = uid and aa.status in ('submitted','late')
    ) then
      raise exception 'Complete the Entry Baseline first' using errcode = '42501';
    end if;

    story_entry := coalesce(story_state->'arrival', '{}'::jsonb) || jsonb_build_object(
      'last_scene_id', 'invitation',
      'first_viewed_at', coalesce(story_state->'arrival'->'first_viewed_at', to_jsonb(now())),
      'updated_at', now(),
      'completed_at', coalesce(story_state->'arrival'->'completed_at', to_jsonb(now()))
    );
    update public.learner_journey_onboarding
    set arrival_completed_at = coalesce(arrival_completed_at, now()),
        story_progress = jsonb_set(story_state, array['arrival'], story_entry, true),
        updated_at = now()
    where program_id = pid and learner_id = uid;

  elsif operation = 'choose_guide' then
    new_guide := payload->>'guide_key';
    if new_guide is null or new_guide not in ('ibn-sina','al-razi','jabir','hippocrates') then
      raise exception 'Invalid guide' using errcode = '22023';
    end if;
    if arrival_at is null then
      raise exception 'Complete the Arrival first' using errcode = '42501';
    end if;
    if selected_guide is not null and selected_guide <> new_guide then
      raise exception 'Guide already chosen' using errcode = '23514';
    end if;

    update public.learner_journey_onboarding
    set guide_key = coalesce(guide_key, new_guide),
        guide_selected_at = coalesce(guide_selected_at, now()),
        updated_at = now()
    where program_id = pid and learner_id = uid;

  elsif operation = 'save_story_progress' then
    story_id := trim(coalesce(payload->>'story_id', ''));
    scene_id := trim(coalesce(payload->>'scene_id', ''));
    is_complete := coalesce((payload->>'completed')::boolean, false);
    if story_id !~ '^[a-z0-9][a-z0-9:_-]{0,79}$' or scene_id !~ '^[a-z0-9][a-z0-9_-]{0,63}$' then
      raise exception 'Invalid story position' using errcode = '22023';
    end if;

    if story_id like 'mission:%' then
      begin
        rid := split_part(story_id, ':', 2)::uuid;
      exception when invalid_text_representation then
        raise exception 'Invalid mission story' using errcode = '22023';
      end;
      if not private.ten_can_view(rid) then
        raise exception 'Mission access required' using errcode = '42501';
      end if;
      if is_complete and story_id like '%:epilogue'
         and not exists (select 1 from public.ten_codex c where c.run_id = rid and c.user_id = uid) then
        raise exception 'Complete the mission first' using errcode = '42501';
      end if;
    elsif story_id like 'signal:%:activation' then
      mission_key := split_part(story_id, ':', 2);
      if is_complete and not exists (
        select 1 from public.ten_codex c
        join public.ten_runs r on r.id = c.run_id
        join public.sessions s on s.id = r.session_id
        where c.user_id = uid and s.cohort_id = cid and lower(r.mission_id) = mission_key
      ) then
        raise exception 'Complete the Signal first' using errcode = '42501';
      end if;
    elsif story_id <> 'arrival' then
      raise exception 'Unknown story' using errcode = '22023';
    end if;

    story_entry := coalesce(story_state->story_id, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
      'last_scene_id', scene_id,
      'first_viewed_at', coalesce(story_state->story_id->'first_viewed_at', to_jsonb(now())),
      'updated_at', now(),
      'completed_at', case when is_complete then coalesce(story_state->story_id->'completed_at', to_jsonb(now())) else null end
    ));
    if octet_length((story_state || jsonb_build_object(story_id, story_entry))::text) > 65536 then
      raise exception 'Story progress limit reached' using errcode = '22023';
    end if;

    update public.learner_journey_onboarding
    set story_progress = jsonb_set(story_state, array[story_id], story_entry, true), updated_at = now()
    where program_id = pid and learner_id = uid;

  elsif operation = 'use_guide' then
    if selected_guide is null then
      raise exception 'Choose a Guide first' using errcode = '42501';
    end if;
    begin
      rid := (payload->>'run_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'Invalid mission' using errcode = '22023';
    end;
    select r.phase into run_phase from public.ten_runs r where r.id = rid;
    if run_phase is null or not private.ten_can_view(rid)
       or private.can_manage_session((select r.session_id from public.ten_runs r where r.id = rid)) then
      raise exception 'Learner mission access required' using errcode = '42501';
    end if;
    if run_phase not in ('commit_open','commit_locked','discussion','revote_open','reveal','transfer','debrief') then
      raise exception 'Your Guide is not available in this mission state' using errcode = '22023';
    end if;

    if not (guide_state ? rid::text) then
      guide_state := jsonb_set(guide_state, array[rid::text], jsonb_build_object('guide_key', selected_guide, 'used_at', now()), true);
      update public.learner_journey_onboarding
      set guide_uses = guide_state, updated_at = now()
      where program_id = pid and learner_id = uid;
      insert into public.ten_events(run_id, actor_id, event_type, detail)
      values (rid, uid, 'guide_invoked', jsonb_build_object('guide_key', selected_guide));
    end if;

  else
    raise exception 'Unknown experience operation' using errcode = '22023';
  end if;

  return public.ten_experience_state(cid);
end;
$$;

revoke all on function public.ten_experience_state(uuid) from public, anon;
revoke all on function public.ten_experience_command(text, jsonb, uuid) from public, anon;
grant execute on function public.ten_experience_state(uuid) to authenticated;
grant execute on function public.ten_experience_command(text, jsonb, uuid) to authenticated;
