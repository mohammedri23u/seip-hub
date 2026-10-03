create table if not exists public.program_assessment_sequences (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  sequence_code text not null check (sequence_code in ('AB','BA')),
  pre_assessment_id uuid not null references public.assessments(id) on delete restrict,
  post_assessment_id uuid not null references public.assessments(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_id),
  unique(cohort_id, sequence_code)
);

create index if not exists program_assessment_sequences_program_idx on public.program_assessment_sequences(program_id);
create index if not exists program_assessment_sequences_cohort_idx on public.program_assessment_sequences(cohort_id);
alter table public.program_assessment_sequences enable row level security;

create or replace function private.assigned_assessment_pair(target_cohort_id uuid, target_user_id uuid)
returns table(pre_assessment_id uuid, post_assessment_id uuid, sequence_code text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  pid uuid;
  configured_count integer;
begin
  select c.program_id into pid from public.cohorts c where c.id = target_cohort_id;
  if pid is null then return; end if;

  select count(*)::integer into configured_count
  from public.program_assessment_sequences pas
  where pas.cohort_id = target_cohort_id and pas.active;

  if configured_count > 0 then
    return query
    select pas.pre_assessment_id, pas.post_assessment_id, pas.sequence_code
    from public.program_assessment_sequences pas
    join public.group_members gm on gm.group_id = pas.group_id
    where pas.cohort_id = target_cohort_id
      and pas.active
      and gm.user_id = target_user_id
    order by pas.sequence_code
    limit 1;
    return;
  end if;

  return query
  select s.pre_assessment_id, s.post_assessment_id, 'DEFAULT'::text
  from public.program_journey_settings s
  where s.program_id = pid and s.active
  limit 1;
end;
$$;

create or replace function private.journey_pretest_unlocked(target_assessment_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    not exists (
      select 1
      from public.assessments a
      cross join lateral private.assigned_assessment_pair(a.cohort_id, target_user_id) ap
      where a.id = target_assessment_id
        and ap.pre_assessment_id = a.id
    )
    or exists (
      select 1
      from public.assessments a
      join public.cohorts c on c.id = a.cohort_id
      cross join lateral private.assigned_assessment_pair(a.cohort_id, target_user_id) ap
      join public.learner_journey_onboarding o on o.program_id = c.program_id and o.learner_id = target_user_id
      where a.id = target_assessment_id
        and ap.pre_assessment_id = a.id
        and o.orientation_completed_at is not null
    );
$$;

create or replace function private.journey_posttest_unlocked(target_assessment_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    not exists (
      select 1
      from public.assessments a
      cross join lateral private.assigned_assessment_pair(a.cohort_id, target_user_id) ap
      where a.id = target_assessment_id
        and ap.post_assessment_id = a.id
    )
    or exists (
      select 1
      from public.assessments a
      join public.cohorts c on c.id = a.cohort_id
      join public.program_journey_settings s on s.program_id = c.program_id and s.active
      cross join lateral private.assigned_assessment_pair(a.cohort_id, target_user_id) ap
      where a.id = target_assessment_id
        and ap.post_assessment_id = a.id
        and (
          select count(distinct r.mission_id)
          from public.ten_codex tc
          join public.ten_runs r on r.id = tc.run_id
          join public.sessions se on se.id = r.session_id
          where tc.user_id = target_user_id
            and se.cohort_id = a.cohort_id
            and r.mission_id = any(s.required_mission_ids)
        ) >= cardinality(s.required_mission_ids)
    );
$$;

create or replace function private.can_take_assessment(target_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.assessments a
       join public.cohort_memberships cm on cm.cohort_id = a.cohort_id
       where a.id = target_assessment_id
         and cm.user_id = auth.uid()
         and cm.member_type = 'learner'
         and cm.status = 'active'
         and a.status = 'live'
         and (a.opens_at is null or now() >= a.opens_at)
         and (a.closes_at is null or now() <= a.closes_at)
         and (
           a.assessment_type in ('formative','session_quiz')
           or exists (
             select 1
             from private.assigned_assessment_pair(a.cohort_id, auth.uid()) ap
             where a.id in (ap.pre_assessment_id, ap.post_assessment_id)
           )
         )
         and private.journey_pretest_unlocked(a.id, auth.uid())
         and private.journey_posttest_unlocked(a.id, auth.uid())
     );
$$;

create or replace function public.journey_summary(target_cohort_id uuid default null::uuid)
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
  profile_name text;
  program_name text;
  cohort_name text;
  pre_id uuid;
  pre_title text;
  pre_status text;
  post_id uuid;
  post_title text;
  post_status text;
  assessment_sequence text;
  required_ids text[] := array['M01','M02','M03','M04']::text[];
  minimum_attendance integer := 0;
  feedback_required boolean := true;
  completion_title text := 'Certificate of Completion';
  onboarding_done boolean := false;
  pre_done boolean := false;
  post_done boolean := false;
  feedback_done boolean := false;
  mission_done_count integer := 0;
  attended_count integer := 0;
  missions jsonb := '[]'::jsonb;
  certificate jsonb;
  eligible boolean := false;
  next_stage text := 'orientation';
begin
  if uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  cid := private.current_learner_cohort(uid, target_cohort_id);
  if cid is null then
    return jsonb_build_object('enrolled', false, 'profile', jsonb_build_object(
      'name', coalesce((select p.full_name from public.profiles p where p.id = uid), 'Learner')));
  end if;

  select c.program_id, c.name, p.name, coalesce(pr.full_name, 'Learner')
    into pid, cohort_name, program_name, profile_name
  from public.cohorts c
  join public.programs p on p.id = c.program_id
  left join public.profiles pr on pr.id = uid
  where c.id = cid;

  select coalesce(s.required_mission_ids, required_ids),
         coalesce(s.minimum_attended_sessions, 0),
         coalesce(s.require_feedback, true),
         coalesce(s.certificate_title, completion_title)
    into required_ids, minimum_attendance, feedback_required, completion_title
  from public.program_journey_settings s
  where s.program_id = pid and s.active;

  required_ids := coalesce(required_ids, array['M01','M02','M03','M04']::text[]);
  minimum_attendance := coalesce(minimum_attendance, 0);
  feedback_required := coalesce(feedback_required, true);
  completion_title := coalesce(completion_title, 'Certificate of Completion');

  select ap.pre_assessment_id, ap.post_assessment_id, ap.sequence_code
    into pre_id, post_id, assessment_sequence
  from private.assigned_assessment_pair(cid, uid) ap
  limit 1;

  if pre_id is not null then
    select a.title, a.status into pre_title, pre_status
    from public.assessments a where a.id = pre_id and a.cohort_id = cid;
  end if;
  if post_id is not null then
    select a.title, a.status into post_title, post_status
    from public.assessments a where a.id = post_id and a.cohort_id = cid;
  end if;

  onboarding_done := exists(
    select 1 from public.learner_journey_onboarding o
    where o.program_id = pid and o.learner_id = uid and o.orientation_completed_at is not null
  );
  pre_done := pre_id is not null and exists(
    select 1 from public.assessment_attempts aa
    where aa.assessment_id = pre_id and aa.learner_id = uid and aa.status in ('submitted','late')
  );
  post_done := post_id is not null and exists(
    select 1 from public.assessment_attempts aa
    where aa.assessment_id = post_id and aa.learner_id = uid and aa.status in ('submitted','late')
  );
  feedback_done := exists(
    select 1 from public.learner_program_feedback f where f.cohort_id = cid and f.learner_id = uid
  );

  select count(distinct r.mission_id)::integer into mission_done_count
  from public.ten_codex tc
  join public.ten_runs r on r.id = tc.run_id
  join public.sessions se on se.id = r.session_id
  where tc.user_id = uid and se.cohort_id = cid and r.mission_id = any(required_ids);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', x.mission_id,
    'position', x.position,
    'title', coalesce(tc.content->>'title', x.mission_id),
    'mentor', tc.content->>'mentor',
    'completed', exists(
      select 1 from public.ten_codex codex
      join public.ten_runs run on run.id = codex.run_id
      join public.sessions sess on sess.id = run.session_id
      where codex.user_id = uid and sess.cohort_id = cid and run.mission_id = x.mission_id
    )
  ) order by x.position), '[]'::jsonb) into missions
  from unnest(required_ids) with ordinality as x(mission_id, position)
  left join public.ten_content tc on tc.id = x.mission_id;

  select count(distinct ar.session_id)::integer into attended_count
  from public.attendance_records ar
  join public.sessions se on se.id = ar.session_id
  where ar.learner_id = uid and se.cohort_id = cid and ar.status in ('present','late');

  eligible := onboarding_done
    and pre_done
    and mission_done_count >= cardinality(required_ids)
    and post_done
    and (not feedback_required or feedback_done)
    and attended_count >= minimum_attendance;

  next_stage := case
    when not onboarding_done then 'orientation'
    when pre_id is null or post_id is null then 'configuration'
    when not pre_done then 'pretest'
    when mission_done_count < cardinality(required_ids) then 'missions'
    when not post_done then 'posttest'
    when feedback_required and not feedback_done then 'feedback'
    when attended_count < minimum_attendance then 'attendance'
    else 'certificate'
  end;

  select jsonb_build_object('id', c.id, 'code', c.verification_code, 'title', c.certificate_title,
    'status', c.status, 'issued_at', c.issued_at)
  into certificate
  from public.learner_certificates c
  where c.cohort_id = cid and c.learner_id = uid;

  return jsonb_build_object(
    'enrolled', true,
    'profile', jsonb_build_object('name', profile_name),
    'program', jsonb_build_object('id', pid, 'name', program_name),
    'cohort', jsonb_build_object('id', cid, 'name', cohort_name),
    'assessment_sequence', assessment_sequence,
    'onboarding_complete', onboarding_done,
    'pretest', jsonb_build_object('id', pre_id, 'title', pre_title, 'status', pre_status, 'completed', pre_done),
    'missions', missions,
    'mission_completed_count', mission_done_count,
    'mission_required_count', cardinality(required_ids),
    'posttest', jsonb_build_object('id', post_id, 'title', post_title, 'status', post_status, 'completed', post_done),
    'feedback_required', feedback_required,
    'feedback_complete', feedback_done,
    'attendance', jsonb_build_object('completed', attended_count, 'required', minimum_attendance),
    'certificate_title', completion_title,
    'eligible', eligible,
    'next_stage', next_stage,
    'certificate', certificate
  );
end;
$$;
