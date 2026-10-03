set local lock_timeout='5s';
lock table public.assessments, public.assessment_attempts, public.student_responses in share row exclusive mode;
alter table private.micro_assessment_expirations add column if not exists reopened_at timestamptz;
alter table private.micro_assessment_expirations add column if not exists reopening_reason text;

-- Preserve historical expiry evidence; reopening never deletes a response or score.
create temporary table untimed_reopen_targets on commit drop as
select aa.*,c.program_id,
 (select count(*) from public.student_responses sr where sr.attempt_id=aa.id) saved_count,
 (select md5(coalesce(jsonb_agg(to_jsonb(sr) order by sr.id),'[]'::jsonb)::text) from public.student_responses sr where sr.attempt_id=aa.id) response_hash,
 (select md5(coalesce(jsonb_agg(to_jsonb(ms) order by ms.id),'[]'::jsonb)::text) from public.machine_scores ms join public.student_responses sr on sr.id=ms.response_id where sr.attempt_id=aa.id) machine_hash
from public.assessment_attempts aa
join public.assessments a on a.id=aa.assessment_id
join public.cohorts c on c.id=a.cohort_id join public.programs p on p.id=c.program_id
join private.micro_assessment_versions m on m.assessment_id=a.id
join private.micro_assessment_expirations e on e.attempt_id=aa.id
where p.code='SEIP26' and a.assessment_type='progress' and aa.status in('submitted','late') and e.reopened_at is null
and exists(select 1 from public.assessment_items ai where ai.assessment_id=a.id and not exists(select 1 from public.student_responses sr where sr.attempt_id=aa.id and sr.question_version_id=ai.question_version_id));

do $checks$
begin
 if exists(select 1 from untimed_reopen_targets t join public.learner_assessment_results r on r.attempt_id=t.id where r.released_at is not null) then raise exception 'A timed-out target has a released result; preserve it and review before reopening'; end if;
 if exists(select 1 from untimed_reopen_targets t where t.saved_count <> (select coalesce(max(ai.position),0) from public.student_responses sr join public.assessment_items ai on ai.assessment_id=t.assessment_id and ai.question_version_id=sr.question_version_id where sr.attempt_id=t.id)) then raise exception 'Saved responses are not a contiguous sequence; review before reopening'; end if;
end $checks$;

-- Keep existing session, ownership, release and sequence checks. Null duration disables time enforcement.
do $patches$
declare d text; needle text;
begin
 select pg_get_functiondef('public.get_progressive_assessment_step(uuid)'::regprocedure) into d;
 needle:='''micro_assessment'',true';
 if position(needle in d)=0 then raise exception 'Unexpected progressive delivery definition'; end if;
 d:=replace(d,needle,'''micro_assessment'',deadline is not null,''compact_assessment'',true,''timing_mode'',case when deadline is null then ''self_paced'' else ''timed'' end,''reopened_at'',(select e.reopened_at from private.micro_assessment_expirations e where e.attempt_id=att.id)');
 d:=replace(d,'''time_limit_seconds'',300','''time_limit_seconds'',case when deadline is null then null else 300 end');
 execute d;
 select pg_get_functiondef('private.micro_response_deadline_guard()'::regprocedure) into d;
 needle:='attempt_status<>''in_progress'' or clock_timestamp()>=deadline';
 if position(needle in d)=0 then raise exception 'Unexpected response deadline guard'; end if;
 d:=replace(d,needle,'attempt_status<>''in_progress'' or (deadline is not null and clock_timestamp()>=deadline)');
 d:=replace(d,'Assessment time has ended; committed answers are retained','Assessment is closed; committed answers are retained');
 execute d;
 select pg_get_functiondef('private.scientific_attempt_submission_guard()'::regprocedure) into d;
 needle:='e.attempt_id=new.id and e.deadline_at<=clock_timestamp()';
 if position(needle in d)=0 then raise exception 'Unexpected submission guard'; end if;
 d:=replace(d,needle,'e.attempt_id=new.id and e.reopened_at is null and e.deadline_at<=clock_timestamp() and exists(select 1 from public.assessments a where a.id=new.assessment_id and a.duration_minutes is not null)');
 execute d;
 select pg_get_functiondef('public.activate_micro_assessments(uuid,boolean)'::regprocedure) into d;
 if position('a.duration_minutes<>5' in d)=0 then raise exception 'Unexpected activation validation'; end if;
 d:=replace(d,'a.duration_minutes<>5','a.duration_minutes is not null');
 d:=replace(d,'Micro forms must be five-minute progress assessments','Micro forms must be self-paced progress assessments');
 d:=replace(d,'''duration_seconds'',300','''duration_seconds'',null,''timing_mode'',''self_paced''');
 execute d;
 select pg_get_functiondef('private.grading_attempt_snapshot(uuid)'::regprocedure) into d;
 needle:='m.instrument_version,e.finalized_at expiration_recorded_at,';
 if position(needle in d)=0 then raise exception 'Unexpected grade snapshot definition'; end if;
 d:=replace(d,needle,needle||'e.reopened_at,');
 d:=replace(d,'e.attempt_id is not null or (','(e.attempt_id is not null and e.reopened_at is null) or (');
 d:=replace(d,'m.assessment_id is not null and aa.status=''in_progress''','m.assessment_id is not null and a.duration_minutes is not null and aa.status=''in_progress''');
 d:=replace(d,'''expired'',a.expired,','''expired'',a.expired,''reopened_at'',a.reopened_at,''timing_mode'',case when a.duration_minutes is null then ''self_paced'' else ''timed'' end,');
 d:=replace(d,'then ''expired_unfinalized'' else ''in_progress'' end','then ''expired_unfinalized'' when a.reopened_at is not null then ''reopened_in_progress'' else ''in_progress'' end');
 execute d;
end $patches$;

-- The user changed timing, not question content, weights, allocation or the instrument IDs.
insert into public.audit_events(program_id,actor_user_id,event_type,entity_type,entity_id,old_value,new_value)
select c.program_id,null,'assessment.timing_policy_changed','assessment',a.id::text,
 jsonb_build_object('duration_minutes',a.duration_minutes,'title',a.title,'timing_mode','timed'),
 jsonb_build_object('duration_minutes',null,'timing_mode','self_paced','requested_by','program owner in connected administration conversation','responses_preserved',true)
from public.assessments a join public.cohorts c on c.id=a.cohort_id join public.programs p on p.id=c.program_id join private.micro_assessment_versions m on m.assessment_id=a.id
where p.code='SEIP26' and a.assessment_type='progress';
update private.micro_assessment_versions m set metadata=metadata||jsonb_build_object('timing_mode','self_paced','timing_policy_version','self-paced-1','self_paced_from',clock_timestamp(),'previous_time_limit_seconds',300)
from public.assessments a join public.cohorts c on c.id=a.cohort_id join public.programs p on p.id=c.program_id
where m.assessment_id=a.id and p.code='SEIP26' and a.assessment_type='progress';
update public.assessments a set duration_minutes=null,
 title=replace(a.title,'5-minute Micro 1.0','Micro 1.0 · Self-paced'),
 description='4 questions: 3 single-best-answer MCQs + 1 very short answer. No time limit. Save each answer to continue. You can leave and resume at the next unanswered question. Previously committed answers stay saved and locked. Unsent text is not saved automatically.\n٤ أسئلة: ٣ MCQs وسؤال VSAQ واحد، بدون توقيت إجباري. خذ وقتك واضغط حفظ لكل جواب. تگدر ترجع لاحقًا وتكمل من السؤال المتبقي. الإجابات المثبّتة تبقى محفوظة، والجواب الذي لم تضغط حفظه لا يُرسل تلقائيًا.'
from public.cohorts c join public.programs p on p.id=c.program_id
where a.cohort_id=c.id and p.code='SEIP26' and a.assessment_type='progress' and exists(select 1 from private.micro_assessment_versions m where m.assessment_id=a.id);
update private.micro_assessment_expirations e set reopened_at=clock_timestamp(),reopening_reason='Owner requested self-paced completion; retain saved answers and scores.'
from untimed_reopen_targets t where e.attempt_id=t.id;
update public.assessment_attempts aa set status='in_progress',submitted_at=null
from untimed_reopen_targets t where aa.id=t.id;

-- Fail atomically if any saved answer, machine score, identity or original start time changed.
do $verify$
begin
 if exists(select 1 from untimed_reopen_targets t join public.assessment_attempts aa on aa.id=t.id where aa.status<>'in_progress' or aa.submitted_at is not null or aa.started_at is distinct from t.started_at or aa.learner_id<>t.learner_id or aa.assessment_id<>t.assessment_id
 or t.response_hash is distinct from (select md5(coalesce(jsonb_agg(to_jsonb(sr) order by sr.id),'[]'::jsonb)::text) from public.student_responses sr where sr.attempt_id=t.id)
 or t.machine_hash is distinct from (select md5(coalesce(jsonb_agg(to_jsonb(ms) order by ms.id),'[]'::jsonb)::text) from public.machine_scores ms join public.student_responses sr on sr.id=ms.response_id where sr.attempt_id=t.id)) then raise exception 'Reopening preservation check failed'; end if;
end $verify$;
insert into public.audit_events(program_id,actor_user_id,event_type,entity_type,entity_id,old_value,new_value)
select t.program_id,null,'assessment.timeout_reopened','assessment_attempt',t.id::text,
 jsonb_build_object('status',t.status,'submitted_at',t.submitted_at,'started_at',t.started_at,'saved_answers',t.saved_count,'response_hash',t.response_hash,'machine_hash',t.machine_hash),
 jsonb_build_object('status','in_progress','submitted_at',null,'resume_position',t.saved_count+1,'timing_mode','self_paced','responses_preserved',true,'machine_scores_preserved',true,'source','owner-authorized connected database maintenance')
from untimed_reopen_targets t;