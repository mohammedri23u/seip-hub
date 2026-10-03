create table private.assessment_retake_directives (
 id uuid primary key default gen_random_uuid(),
 program_id uuid not null references public.programs(id),
 cohort_id uuid not null references public.cohorts(id),
 learner_id uuid not null references auth.users(id),
 policy_code text not null,
 previous_pre_assessment_id uuid not null references public.assessments(id),
 previous_post_assessment_id uuid not null references public.assessments(id),
 pre_assessment_id uuid not null references public.assessments(id),
 post_assessment_id uuid not null references public.assessments(id),
 sequence_code text not null check(sequence_code in ('AB','BA')),
 legacy_attempt_ids uuid[] not null check(cardinality(legacy_attempt_ids)>0),
 prior_state jsonb not null check(jsonb_typeof(prior_state)='object'),
 reason text not null,
 created_at timestamptz not null default clock_timestamp(),
 unique(cohort_id,learner_id,policy_code),
 check(pre_assessment_id<>post_assessment_id),
 check(previous_pre_assessment_id<>previous_post_assessment_id)
);
alter table private.assessment_retake_directives enable row level security;
revoke all on private.assessment_retake_directives from public,anon,authenticated;
create index assessment_retake_directives_lookup on private.assessment_retake_directives(cohort_id,learner_id,created_at desc);
create trigger assessment_retake_directives_immutable before update or delete on private.assessment_retake_directives for each row execute function private.scientific_immutable();
comment on table private.assessment_retake_directives is 'Append-only owner-authorized instrument reassignment. Original immutable pins, attempt snapshots and answers are retained. No public write interface.';

create or replace function private.assigned_assessment_pair(target_cohort_id uuid,target_user_id uuid)
returns table(pre_assessment_id uuid,post_assessment_id uuid,sequence_code text)
language plpgsql stable security definer set search_path='' as $function$
declare pid uuid;
begin
 if exists(select 1 from private.assessment_retake_directives d where d.cohort_id=target_cohort_id and d.learner_id=target_user_id) then
  return query select d.pre_assessment_id,d.post_assessment_id,d.sequence_code from private.assessment_retake_directives d where d.cohort_id=target_cohort_id and d.learner_id=target_user_id order by d.created_at desc,d.id desc limit 1;
  return;
 end if;
 if exists(select 1 from private.scientific_learner_assessment_pins p where p.cohort_id=target_cohort_id and p.learner_id=target_user_id) then
  return query select p.pre_assessment_id,p.post_assessment_id,p.sequence_code from private.scientific_learner_assessment_pins p where p.cohort_id=target_cohort_id and p.learner_id=target_user_id;
  return;
 end if;
 select c.program_id into pid from public.cohorts c where c.id=target_cohort_id;
 if pid is null then return; end if;
 if exists(select 1 from public.program_assessment_sequences s where s.cohort_id=target_cohort_id and s.active) then
  return query select s.pre_assessment_id,s.post_assessment_id,s.sequence_code from public.program_assessment_sequences s join public.group_members gm on gm.group_id=s.group_id where s.cohort_id=target_cohort_id and s.active and gm.user_id=target_user_id order by s.sequence_code limit 1;
  return;
 end if;
 return query select s.pre_assessment_id,s.post_assessment_id,'DEFAULT'::text from public.program_journey_settings s where s.program_id=pid and s.active limit 1;
end $function$;

create function private.learner_retake_notice(target_program_id uuid,target_learner_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $function$
 select jsonb_build_object('required',not exists(select 1 from public.assessment_attempts aa where aa.assessment_id=d.pre_assessment_id and aa.learner_id=d.learner_id and aa.status in ('submitted','late')),
 'pre_assessment_id',d.pre_assessment_id,'post_assessment_id',d.post_assessment_id,
 'previous_pre_assessment_id',d.previous_pre_assessment_id,'previous_post_assessment_id',d.previous_post_assessment_id,
 'requested_at',d.created_at,'policy_code',d.policy_code)
 from private.assessment_retake_directives d where d.program_id=target_program_id and d.learner_id=target_learner_id order by d.created_at desc,d.id desc limit 1;
$function$;
revoke all on function private.learner_retake_notice(uuid,uuid) from public,anon,authenticated;

create function private.legacy_retake_annotation(target_attempt_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $function$
 select coalesce((select jsonb_build_object('superseded_by_retake',true,'completion_kind','superseded_legacy','phase','legacy','retake_pre_assessment_id',d.pre_assessment_id,'retake_requested_at',d.created_at)
 from private.assessment_retake_directives d where target_attempt_id=any(d.legacy_attempt_ids) order by d.created_at desc,d.id desc limit 1),'{}'::jsonb);
$function$;
revoke all on function private.legacy_retake_annotation(uuid) from public,anon,authenticated;

-- Extend existing role-checked read functions without weakening their permissions.
do $migration$
declare def text; needle text;
begin
 select pg_get_functiondef('public.journey_summary(uuid)'::regprocedure) into def;
 needle:='''assessment_sequence'', assessment_sequence,';
 if position(needle in def)=0 then raise exception 'Journey contract changed; review migration'; end if;
 def:=replace(def,needle,needle||' ''assessment_retake'', private.learner_retake_notice(pid,uid),');
 execute def;

 select pg_get_functiondef('private.grading_attempt_snapshot(uuid)'::regprocedure) into def;
 needle:=') from attempt a cross join totals t;';
 if position(needle in def)=0 then raise exception 'Snapshot contract changed; review migration'; end if;
 def:=replace(def,needle,') || private.legacy_retake_annotation(target_attempt_id) from attempt a cross join totals t;');
 execute def;

 select pg_get_functiondef('private.named_grading_workspace(uuid,uuid)'::regprocedure) into def;
 needle:='p.student_id,';
 if position(needle in def)=0 then raise exception 'Directory contract changed; review migration'; end if;
 def:=replace(def,needle,needle||' private.learner_retake_notice(target_program_id,p.id) retake,');
 needle:='''learner'',(select';
 if position(needle in def)=0 then raise exception 'Learner workspace contract changed; review migration'; end if;
 def:=replace(def,needle,'''retake'',private.learner_retake_notice(target_program_id,target_learner_id), '||needle);
 needle:='''phase'',case when aa.assessment_id=pair.pre_assessment_id then ''pre'' when aa.assessment_id=pair.post_assessment_id then ''post'' else ''practice'' end,';
 if position(needle in def)=0 then raise exception 'Phase contract changed; review migration'; end if;
 def:=replace(def,needle,'''phase'',coalesce(private.legacy_retake_annotation(aa.id)->>''phase'',case when aa.assessment_id=pair.pre_assessment_id then ''pre'' when aa.assessment_id=pair.post_assessment_id then ''post'' else ''practice'' end),');
 execute def;
end $migration$;