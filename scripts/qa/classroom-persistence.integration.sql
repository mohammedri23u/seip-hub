-- Run only after the classroom migration, through a trusted SQL console/MCP.
-- Every fixture and write is inside this explicit transaction and is rolled back.
-- Existing actors are selected without printing names, emails, sessions or credentials.
begin;
set local statement_timeout = '45s';

do $test$
declare
  v_program_id uuid;
  admin_id uuid;
  teacher_ids uuid[];
  learner_ids uuid[];
  actor_claims jsonb;
  cohort_a uuid := gen_random_uuid();
  cohort_b uuid := gen_random_uuid();
  unrelated_program uuid := gen_random_uuid();
  unrelated_cohort uuid := gen_random_uuid();
  session_a uuid := gen_random_uuid();
  session_b uuid := gen_random_uuid();
  meeting_a uuid;
  meeting_a2 uuid;
  meeting_b uuid;
  n integer;
  denied boolean;
  legacy_before jsonb;
  legacy_after jsonb;
  item record;
begin
  select id into v_program_id from public.programs where code = 'SEIP26' and status = 'active';
  select pa.user_id into admin_id from public.platform_admins pa
    where exists (select 1 from public.profiles p where p.id=pa.user_id and p.status='active')
      and not (private.managed_account_state(pa.user_id,
        (select s.id::text from auth.sessions s where s.user_id=pa.user_id order by s.created_at desc limit 1))->>'password_change_required')::boolean
      and (private.managed_account_state(pa.user_id,
      (select s.id::text from auth.sessions s where s.user_id=pa.user_id order by s.created_at desc limit 1))->>'session_valid')::boolean
    limit 1;
  select array_agg(user_id) into teacher_ids from (
    select distinct pm.user_id from public.program_memberships pm
    cross join lateral (select private.managed_account_state(pm.user_id,
      (select s.id::text from auth.sessions s where s.user_id=pm.user_id order by s.created_at desc limit 1)) as state) q
    where pm.program_id=v_program_id and pm.status='active' and pm.role='peer_educator'
      and exists (select 1 from public.profiles p where p.id=pm.user_id and p.status='active')
      and (state->>'session_valid')::boolean and not (state->>'password_change_required')::boolean
    order by pm.user_id limit 2
  ) users;
  select array_agg(user_id) into learner_ids from (
    select distinct pm.user_id from public.program_memberships pm
    cross join lateral (select private.managed_account_state(pm.user_id,
      (select s.id::text from auth.sessions s where s.user_id=pm.user_id order by s.created_at desc limit 1)) as state) q
    where pm.program_id=v_program_id and pm.status='active' and pm.role='learner'
      and exists (select 1 from public.profiles p where p.id=pm.user_id and p.status='active')
      and not exists (select 1 from public.program_memberships staff
        where staff.user_id=pm.user_id and staff.program_id=pm.program_id and staff.status='active'
          and staff.role<>'learner')
      and (state->>'session_valid')::boolean and not (state->>'password_change_required')::boolean
    order by pm.user_id limit 3
  ) users;
  if v_program_id is null or admin_id is null or coalesce(cardinality(teacher_ids),0)<2 or coalesce(cardinality(learner_ids),0)<3 then
    raise exception 'QA prerequisite: active admin, two teachers and three learners with usable account state';
  end if;
  select jsonb_object_agg(u.id::text, jsonb_build_object('sub',u.id,'role','authenticated','session_id',
    (select s.id from auth.sessions s where s.user_id=u.id order by s.created_at desc limit 1)))
    into actor_claims from auth.users u where u.id=any(teacher_ids || learner_ids || array[admin_id]);

  -- Capture old learning/certificate data; new classroom actions must not affect it.
  select jsonb_build_object(
    'attendance_records',(select count(*) from public.attendance_records),
    'assessment_attempts',(select count(*) from public.assessment_attempts),
    'student_responses',(select count(*) from public.student_responses),
    'learner_certificates',(select count(*) from public.learner_certificates),
    'live_activity_responses',(select count(*) from public.live_activity_responses),
    'ten_echo_responses',(select count(*) from public.ten_echo_responses),
    'ten_responses',(select count(*) from public.ten_responses)
  ) into legacy_before;

  for item in select c.relname,c.relrowsecurity from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
    where ns.nspname='public' and c.relname in ('classroom_meetings','classroom_attendance','classroom_meeting_notes','classroom_teaching_content')
  loop
    if not item.relrowsecurity then raise exception 'RLS disabled: %',item.relname; end if;
    if has_table_privilege('anon','public.'||item.relname,'SELECT,INSERT,UPDATE,DELETE') then
      raise exception 'Anonymous table grant: %',item.relname;
    end if;
  end loop;
  if (select count(*) from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
    where ns.nspname='public' and c.relname in ('classroom_meetings','classroom_attendance','classroom_meeting_notes','classroom_teaching_content'))<>4 then
    raise exception 'Missing classroom table';
  end if;
  if has_function_privilege('anon','public.save_classroom_meeting(uuid,text,timestamp with time zone,text)','EXECUTE') then
    raise exception 'Anonymous meeting RPC execution granted';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
    where (ns.nspname='private' and p.proname in ('can_manage_classroom_cohort','can_read_classroom_cohort','is_classroom_roster_learner','stamp_classroom_meeting','stamp_classroom_attendance','stamp_classroom_notes')
      or ns.nspname='public' and p.proname='save_classroom_meeting') and p.prosecdef) then
    raise exception 'New classroom function unexpectedly SECURITY DEFINER';
  end if;

  -- Rollback-only fixtures: two THE TEN cohorts and an unrelated-program educator.
  insert into public.cohorts(id,program_id,name,status,created_by) values
    (cohort_a,v_program_id,'Classroom rollback QA A','active',admin_id),
    (cohort_b,v_program_id,'Classroom rollback QA B','active',admin_id);
  insert into public.sessions(id,cohort_id,title,status,created_by) values
    (session_a,cohort_a,'Rollback-only assignment A','draft',admin_id),
    (session_b,cohort_b,'Rollback-only assignment B','draft',admin_id);
  insert into public.session_facilitators(session_id,user_id,facilitator_role) values
    (session_a,teacher_ids[1],'lead'),(session_b,teacher_ids[2],'lead'),
    (session_b,teacher_ids[1],'observer'),(session_a,learner_ids[3],'lead');
  insert into public.cohort_memberships(cohort_id,user_id,member_type,status) values
    (cohort_a,learner_ids[1],'learner','active'),(cohort_a,learner_ids[2],'learner','active'),
    (cohort_b,learner_ids[3],'learner','active');
  insert into public.programs(id,name,code,status,created_by) values
    (unrelated_program,'Rollback-only unrelated program','CLASSROOM-QA-'||substr(unrelated_program::text,1,8),'active',admin_id);
  insert into public.program_memberships(program_id,user_id,role,status) values
    (unrelated_program,learner_ids[3],'program_director','active');
  insert into public.cohorts(id,program_id,name,status,created_by) values
    (unrelated_cohort,unrelated_program,'Unrelated rollback cohort','active',admin_id);
  insert into public.classroom_teaching_content(content_version,payload)
    values ('2.0-approved-foundation','{"cases":[],"slides":[],"sources":[]}'::jsonb)
    on conflict(content_version) do nothing;

  -- Admin initializes each set exactly once.
  perform set_config('request.jwt.claims',(actor_claims->admin_id::text)::text,true);
  perform set_config('request.jwt.claim.sub',(admin_id)::text,true);
  execute 'set local role authenticated';
  if not private.managed_account_access_allowed() then raise exception 'QA actor managed session claims invalid'; end if;
  insert into public.classroom_meetings(cohort_id,meeting_key,content_version)
    select c.id,'meeting-'||i,'2.0-approved-foundation' from unnest(array[cohort_a,cohort_b]) c(id) cross join generate_series(1,5)i
    on conflict(cohort_id,meeting_key) do nothing;
  select id into meeting_a from public.classroom_meetings where cohort_id=cohort_a and meeting_key='meeting-1';
  select id into meeting_a2 from public.classroom_meetings where cohort_id=cohort_a and meeting_key='meeting-2';
  select id into meeting_b from public.classroom_meetings where cohort_id=cohort_b and meeting_key='meeting-1';
  if meeting_a is null or meeting_b is null then raise exception 'Admin initialization failed'; end if;
  execute 'reset role';

  -- Assigned teacher A manages A, never B, despite a program-wide peer role.
  perform set_config('request.jwt.claims',(actor_claims->teacher_ids[1]::text)::text,true);
  perform set_config('request.jwt.claim.sub',(teacher_ids[1])::text,true);
  execute 'set local role authenticated';
  if not private.managed_account_access_allowed() then raise exception 'QA actor managed session claims invalid'; end if;
  if not private.can_manage_classroom_cohort(cohort_a) or private.can_manage_classroom_cohort(cohort_b) then
    raise exception 'Facilitator cohort scope failed';
  end if;
  select count(*) into n from public.classroom_meetings where cohort_id=cohort_a;
  if n<>5 then raise exception 'Assigned cohort metadata inaccessible'; end if;
  select count(*) into n from public.classroom_meetings where cohort_id=cohort_b;
  if n<>0 then raise exception 'Cross-cohort meeting metadata exposed'; end if;
  perform public.save_classroom_meeting(meeting_a,'completed','2026-10-22T13:30:00Z','Teacher-private rollback reflection');
  if not exists(select 1 from public.classroom_meetings where id=meeting_a and status='completed' and completed_by=teacher_ids[1] and completed_at is not null)
    then raise exception 'Completion audit failed'; end if;
  insert into public.classroom_meetings(cohort_id,meeting_key,content_version)
    select cohort_a,'meeting-'||i,'2.0-approved-foundation' from generate_series(1,5)i
    on conflict(cohort_id,meeting_key) do nothing;
  if (select count(*) from public.classroom_meetings where cohort_id=cohort_a)<>5
    or not exists(select 1 from public.classroom_meeting_notes where meeting_id=meeting_a and notes='Teacher-private rollback reflection')
    or not exists(select 1 from public.classroom_meetings where id=meeting_a and status='completed') then
    raise exception 'Idempotent initialization overwrote prior work';
  end if;
  insert into public.classroom_attendance(meeting_id,learner_id,status) values
    (meeting_a,learner_ids[1],'present'),(meeting_a,learner_ids[2],'absent')
    on conflict(meeting_id,learner_id) do update set status=excluded.status;
  insert into public.classroom_attendance(meeting_id,learner_id,status) values
    (meeting_a,learner_ids[1],'late')
    on conflict(meeting_id,learner_id) do update set status=excluded.status;
  if not exists(select 1 from public.classroom_attendance where meeting_id=meeting_a and learner_id=learner_ids[1] and status='late' and recorded_by=teacher_ids[1])
    then raise exception 'Attendance upsert/audit failed'; end if;
  denied:=false;
  begin
    insert into public.classroom_attendance(meeting_id,learner_id,status) values
      (meeting_a2,learner_ids[1],'present'),(meeting_a2,learner_ids[3],'present');
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied or exists(select 1 from public.classroom_attendance where meeting_id=meeting_a2)
    then raise exception 'Out-of-roster bulk save was not rejected atomically'; end if;
  denied:=false;
  begin update public.classroom_meetings set meeting_key='meeting-5' where id=meeting_a;
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Meeting identity mutable'; end if;
  denied:=false;
  begin perform public.save_classroom_meeting(meeting_b,'completed',null,'Cross-cohort forgery');
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Cross-cohort RPC accepted'; end if;
  denied:=false;
  begin insert into public.classroom_meetings(cohort_id,meeting_key) values(cohort_b,'meeting-1');
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Cross-cohort insert accepted'; end if;
  if (select count(*) from public.classroom_teaching_content)<>1 then raise exception 'Teacher teaching payload inaccessible'; end if;
  denied:=false;
  begin update public.classroom_teaching_content set payload='{}';
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Teacher can mutate approved payload'; end if;
  execute 'reset role';

  -- A learner reads own cohort and own attendance, never reflections/answers.
  perform set_config('request.jwt.claims',(actor_claims->learner_ids[1]::text)::text,true);
  perform set_config('request.jwt.claim.sub',(learner_ids[1])::text,true);
  execute 'set local role authenticated';
  if not private.managed_account_access_allowed() then raise exception 'QA actor managed session claims invalid'; end if;
  if (select count(*) from public.classroom_meetings where cohort_id=cohort_a)<>5
    or exists(select 1 from public.classroom_meetings where cohort_id=cohort_b)
    then raise exception 'Learner meeting metadata scope failed'; end if;
  if (select count(*) from public.classroom_attendance where meeting_id=meeting_a)<>1
    or exists(select 1 from public.classroom_attendance where meeting_id=meeting_a and learner_id<>learner_ids[1])
    then raise exception 'Learner attendance privacy failed'; end if;
  if exists(select 1 from public.classroom_meeting_notes) or exists(select 1 from public.classroom_teaching_content)
    then raise exception 'Teacher-private material exposed to learner'; end if;
  denied:=false;
  begin perform public.save_classroom_meeting(meeting_a,'completed',null,'Learner forgery');
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Learner changed meeting'; end if;
  denied:=false;
  begin insert into public.classroom_attendance(meeting_id,learner_id,status) values(meeting_a2,learner_ids[1],'present');
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Learner wrote attendance'; end if;
  execute 'reset role';

  -- Being director of another program is insufficient for THE TEN management.
  perform set_config('request.jwt.claims',(actor_claims->learner_ids[3]::text)::text,true);
  perform set_config('request.jwt.claim.sub',(learner_ids[3])::text,true);
  execute 'set local role authenticated';
  if not private.managed_account_access_allowed() then raise exception 'QA actor managed session claims invalid'; end if;
  if private.can_manage_classroom_cohort(cohort_a) or private.can_manage_classroom_cohort(unrelated_cohort)
    or exists(select 1 from public.classroom_meetings where cohort_id=cohort_a)
    or exists(select 1 from public.classroom_teaching_content) then
    raise exception 'Unrelated program role authorized THE TEN classroom';
  end if;
  denied:=false;
  begin insert into public.classroom_meetings(cohort_id,meeting_key) values(unrelated_cohort,'meeting-1');
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Unrelated program classroom record accepted'; end if;
  execute 'reset role';

  -- Anonymous callers cannot read any of the four resources or invoke mutations.
  perform set_config('request.jwt.claims','{}',true);
  perform set_config('request.jwt.claim.sub','',true);
  execute 'set local role anon';
  denied:=false;
  begin perform count(*) from public.classroom_meetings;
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Anonymous classroom read succeeded'; end if;
  denied:=false;
  begin perform public.save_classroom_meeting(meeting_a,'planned',null,'');
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Anonymous RPC succeeded'; end if;
  execute 'reset role';

  select jsonb_build_object(
    'attendance_records',(select count(*) from public.attendance_records),
    'assessment_attempts',(select count(*) from public.assessment_attempts),
    'student_responses',(select count(*) from public.student_responses),
    'learner_certificates',(select count(*) from public.learner_certificates),
    'live_activity_responses',(select count(*) from public.live_activity_responses),
    'ten_echo_responses',(select count(*) from public.ten_echo_responses),
    'ten_responses',(select count(*) from public.ten_responses)
  ) into legacy_after;
  if legacy_before<>legacy_after then raise exception 'Legacy learner/assessment/certificate records changed'; end if;
end;
$test$;
rollback;
select 'PASS: classroom roles, cohort scope, learner privacy, roster checks, atomic upsert, audit, idempotence and legacy isolation; all fixtures rolled back' as result;
