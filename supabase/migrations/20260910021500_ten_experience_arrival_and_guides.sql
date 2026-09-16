alter table public.learner_journey_onboarding
  add column if not exists arrival_completed_at timestamptz,
  add column if not exists guide_key text,
  add column if not exists guide_selected_at timestamptz,
  add column if not exists experience_version text not null default 'baghdad_nexus_v1';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.learner_journey_onboarding'::regclass
      and conname = 'learner_journey_onboarding_guide_key_check'
  ) then
    alter table public.learner_journey_onboarding
      add constraint learner_journey_onboarding_guide_key_check
      check (guide_key is null or guide_key in ('ibn-sina','al-razi','jabir','hippocrates'));
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
begin
  if uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  cid := private.current_learner_cohort(uid, target_cohort_id);
  if cid is null then
    return jsonb_build_object('enrolled', false);
  end if;

  select c.program_id into pid
  from public.cohorts c
  where c.id = cid;

  select o.arrival_completed_at, o.guide_key, o.guide_selected_at, o.experience_version
    into arrival_at, selected_guide, guide_at, version
  from public.learner_journey_onboarding o
  where o.program_id = pid and o.learner_id = uid;

  return jsonb_build_object(
    'enrolled', true,
    'arrival_complete', arrival_at is not null,
    'arrival_completed_at', arrival_at,
    'guide_key', selected_guide,
    'guide_selected_at', guide_at,
    'experience_version', coalesce(version, 'baghdad_nexus_v1')
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
  new_guide text;
  existing_guide text;
  arrival_at timestamptz;
begin
  if uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  cid := private.current_learner_cohort(uid, target_cohort_id);
  if cid is null then
    raise exception 'No active learner cohort' using errcode = '42501';
  end if;

  select c.program_id into pid
  from public.cohorts c
  where c.id = cid;

  if not exists (
    select 1
    from public.learner_journey_onboarding o
    where o.program_id = pid
      and o.learner_id = uid
      and o.orientation_completed_at is not null
  ) then
    raise exception 'Complete orientation first' using errcode = '42501';
  end if;

  if operation = 'complete_arrival' then
    select a.id into pre_id
    from public.assessments a
    left join public.program_journey_settings s
      on s.program_id = pid and s.active
    where a.cohort_id = cid
      and (
        a.id = s.pre_assessment_id
        or (s.pre_assessment_id is null and a.assessment_type = 'diagnostic')
      )
    order by (a.id = s.pre_assessment_id) desc nulls last, a.created_at
    limit 1;

    if pre_id is null or not exists (
      select 1
      from public.assessment_attempts aa
      where aa.assessment_id = pre_id
        and aa.learner_id = uid
        and aa.status in ('submitted','late')
    ) then
      raise exception 'Complete the Entry Baseline first' using errcode = '42501';
    end if;

    update public.learner_journey_onboarding
    set arrival_completed_at = coalesce(arrival_completed_at, now()),
        updated_at = now()
    where program_id = pid and learner_id = uid;

  elsif operation = 'choose_guide' then
    new_guide := payload->>'guide_key';
    if new_guide is null or new_guide not in ('ibn-sina','al-razi','jabir','hippocrates') then
      raise exception 'Invalid guide' using errcode = '22023';
    end if;

    select o.arrival_completed_at, o.guide_key
      into arrival_at, existing_guide
    from public.learner_journey_onboarding o
    where o.program_id = pid and o.learner_id = uid;

    if arrival_at is null then
      raise exception 'Complete the Arrival first' using errcode = '42501';
    end if;

    if existing_guide is not null and existing_guide <> new_guide then
      raise exception 'Guide already chosen' using errcode = '23514';
    end if;

    update public.learner_journey_onboarding
    set guide_key = coalesce(guide_key, new_guide),
        guide_selected_at = coalesce(guide_selected_at, now()),
        updated_at = now()
    where program_id = pid and learner_id = uid;

  else
    raise exception 'Unknown experience operation' using errcode = '22023';
  end if;

  return public.ten_experience_state(cid);
end;
$$;

revoke all on function public.ten_experience_state(uuid) from public;
revoke all on function public.ten_experience_command(text, jsonb, uuid) from public;
grant execute on function public.ten_experience_state(uuid) to authenticated;
grant execute on function public.ten_experience_command(text, jsonb, uuid) to authenticated;
