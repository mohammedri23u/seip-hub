-- Run as the migration/test connection. Every fixture and mutation is rolled back.
-- This tests database/RPC contracts, not browser authentication or UI rendering.
begin;
create temp table qa_users(label text primary key,id uuid default gen_random_uuid());
insert into qa_users(label) values('AB'),('BA'),('facilitator'),('director'),('lead'),('reviewer');
create temp table qa_results(test text,passed boolean,detail text);
create temp table qa_context as select p.id pid,c.id cid,
 (select pre_assessment_id from public.program_assessment_sequences where cohort_id=c.id and sequence_code='AB') form_a,
 (select pre_assessment_id from public.program_assessment_sequences where cohort_id=c.id and sequence_code='BA') form_b
 from public.programs p join public.cohorts c on c.program_id=p.id where p.code='SEIP26' limit 1;
create temp table qa_missions as select t.id code,t.content,s.id session_id from public.ten_content t join public.sessions s on s.join_code='TEN-'||t.id;
alter table qa_context add column activity_id uuid;
update qa_context set activity_id=(select a.id from public.live_activities a join public.live_session_runs r on r.id=a.run_id join qa_missions m on m.session_id=r.session_id where m.code='M01' order by a.position limit 1);
grant all on qa_users,qa_results,qa_context,qa_missions to authenticated;
insert into auth.users(id,email,raw_user_meta_data) select id,'launch-qa-'||id::text||'@example.invalid','{"full_name":"Synthetic Launch QA"}' from qa_users;
insert into public.program_memberships(program_id,user_id,role)
 select c.pid,u.id,case u.label when 'AB' then 'learner' when 'BA' then 'learner' when 'facilitator' then 'peer_educator' when 'director' then 'program_director' when 'lead' then 'assessment_lead' else 'reviewer' end from qa_users u cross join qa_context c;
insert into public.cohort_memberships(cohort_id,user_id,member_type) select c.cid,u.id,'learner' from qa_users u cross join qa_context c where label in ('AB','BA');
insert into public.group_members(group_id,user_id) select s.group_id,u.id from qa_users u join public.program_assessment_sequences s on s.sequence_code=u.label cross join qa_context c where s.cohort_id=c.cid;
insert into public.session_facilitators(session_id,user_id) select session_id,id from qa_missions cross join qa_users where label='facilitator';
create function pg_temp.expect_denied(test_name text,statement text) returns void language plpgsql as $$
begin
 begin
  execute statement;
  insert into qa_results values(test_name,false,'Unexpected success');
 exception when others then
  insert into qa_results values(test_name,sqlstate in ('42501','P0001','23514','23505'),sqlstate||': '||sqlerrm);
 end;
end $$;
create function pg_temp.become(label_in text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub',(select id::text from qa_users where label=label_in),true); end $$;
set local role authenticated;
do $$
#variable_conflict use_variable
declare c record; u record; m record; a uuid; step jsonb; result jsonb; first_question uuid; response_id uuid; n integer; affected integer; act uuid; other_form uuid; rid uuid; stage jsonb; answer jsonb; stage_index integer;
begin
 select * into c from qa_context;
 if c.pid is null then raise exception 'Configured SEIP26 cohort required'; end if;
 for u in select * from qa_users where label in ('AB','BA') loop
  perform pg_temp.become(u.label);
  a:=case when u.label='AB' then c.form_a else c.form_b end;
  other_form:=case when u.label='AB' then c.form_b else c.form_a end;
  perform pg_temp.expect_denied(u.label||' pre before orientation',format('insert into public.assessment_attempts(assessment_id,learner_id) values(%L,%L)',a,u.id));
  perform public.complete_journey_orientation(c.pid,true,true);
  perform pg_temp.expect_denied(u.label||' wrong form',format('insert into public.assessment_attempts(assessment_id,learner_id) values(%L,%L)',other_form,u.id));
  insert into public.assessment_attempts(assessment_id,learner_id) values(a,u.id);
  step:=public.get_progressive_assessment_step(a);
  first_question:=(step->'item'->>'question_version_id')::uuid;
  insert into qa_results values(u.label||' stage 1 only',step->>'position'='1' and not(step ? 'items'),'One item projection');
  perform pg_temp.expect_denied(u.label||' full form disclosure',format('select public.get_assessment_delivery(%L)',a));
  perform pg_temp.expect_denied(u.label||' out-of-order submission',format('select public.submit_progressive_assessment_step(%L,%L,%L,%L)',a,step->>'attempt_id',gen_random_uuid(),'QA response'));
  for n in 1..15 loop
   step:=public.get_progressive_assessment_step(a);
   result:=public.submit_progressive_assessment_step(a,(step->>'attempt_id')::uuid,(step->'item'->>'question_version_id')::uuid,'Synthetic QA response; not research data.');
   if n=1 then
    update public.student_responses set text_response='Tampered' where attempt_id=(step->>'attempt_id')::uuid;
    get diagnostics affected = row_count;
    insert into qa_results values(u.label||' committed answer immutable',affected=0,'RLS update affected zero rows');
    perform pg_temp.expect_denied(u.label||' replay submission',format('select public.submit_progressive_assessment_step(%L,%L,%L,%L)',a,step->>'attempt_id',first_question,'Changed answer'));
   end if;
  end loop;
  insert into qa_results values(u.label||' all 15 Pre stages submitted',(result->>'completed')::boolean,'Sequential RPC submission');
  perform public.ten_experience_command('complete_arrival','{}',c.cid);
  perform public.ten_experience_command('choose_guide','{"guide_key":"ibn-sina"}',c.cid);
  insert into qa_results values(u.label||' arrival and guide',true,'Assigned Pre form accepted');
  perform pg_temp.expect_denied(u.label||' certificate bypass',format('select public.claim_completion_certificate(%L)',c.cid));
  perform pg_temp.expect_denied(u.label||' research without ethics',format('select public.record_research_consent(%L,%L)',c.pid,'granted'));
  perform pg_temp.expect_denied(u.label||' stale consent version',format('select public.record_versioned_research_consent(%L,%L,%L,true)',c.pid,'granted','STALE-QA'));
  perform public.record_research_consent(c.pid,'declined');
  insert into qa_results values(u.label||' research decline allowed',true,'Education remains available');
  perform pg_temp.expect_denied(u.label||' unauthorized scoring',format('select public.ten_save_human_review(%L,%L,null,true)',gen_random_uuid(),'{}'));
  perform pg_temp.expect_denied(u.label||' export without approval',format('select public.generate_research_export(%L)',gen_random_uuid()));
  act:=c.activity_id;
  perform pg_temp.expect_denied(u.label||' facilitator command',format('select public.advance_live_activity(%L,%L)',act,'open_round_1'));
  select count(*) into n from public.live_activity_answer_keys;
  insert into qa_results values(u.label||' protected live answer keys',n=0,'RLS visibility');
 end loop;
 for u in select * from qa_users where label in ('director','lead','reviewer') loop
  perform pg_temp.become(u.label);
  result:=public.ten_pilot_readiness(c.pid);
  insert into qa_results values(u.label||' readiness access',result->>'pilot_locked'='false','Real-world gates remain pending');
 end loop;
 perform pg_temp.become('director');
 perform pg_temp.expect_denied('allocation locked after start',format('select public.allocate_assessment_sequence(%L,%L,%L)',c.cid,(select id from qa_users where label='BA'),'AB'));
 perform pg_temp.become('facilitator');
 perform public.advance_live_activity(act,'open_round_1');
 insert into qa_results values('assigned facilitator can open vote',true,'Assigned session authorization');
 perform pg_temp.expect_denied('premature reveal',format('select public.advance_live_activity(%L,%L)',act,'reveal'));

 -- Complete the actual four Mission state machines through public RPCs.
 for m in select * from qa_missions order by code loop
  perform pg_temp.become('facilitator');
  result:=public.ten_api('create',jsonb_build_object('session_id',m.session_id,'mission_id',m.code));
  rid:=(result->>'id')::uuid;
  perform public.ten_command(rid,'commit_open');
  stage_index:=0;
  for stage in select value from jsonb_array_elements(m.content->'stages') loop
   answer:='{"text":"Synthetic QA reasoning","most_likely":"QA hypothesis","must_not_miss":"QA alternative","less_likely":"QA alternative","supports":"QA evidence","opposes":"None","missing":"QA missing evidence","probability":"intermediate","choices":[0],"choice":0}';
   if stage->>'responseType'='true_false' then answer:=answer||'{"choice":true}'; end if;
   for u in select * from qa_users where label in ('AB','BA') loop
    perform pg_temp.become(u.label);
    perform public.ten_api('respond',jsonb_build_object('run_id',rid,'stage_index',stage_index,'round',1,'answer',answer,'justification','Synthetic QA justification','confidence',60));
   end loop;
   perform pg_temp.become('facilitator');
   perform public.ten_command(rid,'commit_locked');
   if coalesce((stage->>'peerInstruction')::boolean,false) then
    perform public.ten_command(rid,'discussion');
    perform public.ten_command(rid,'revote_open');
    for u in select * from qa_users where label in ('AB','BA') loop
     perform pg_temp.become(u.label);
     perform public.ten_api('respond',jsonb_build_object('run_id',rid,'stage_index',stage_index,'round',2,'answer',answer,'justification','Synthetic QA revote','confidence',60));
    end loop;
    perform pg_temp.become('facilitator');
   end if;
   perform public.ten_command(rid,'reveal');
   perform public.ten_command(rid,'next');
   stage_index:=stage_index+1;
  end loop;
  for u in select * from qa_users where label in ('AB','BA') loop
   perform pg_temp.become(u.label);
   perform public.ten_api('respond',jsonb_build_object('run_id',rid,'stage_index',stage_index,'round',1,'answer',jsonb_build_object('text','Synthetic transfer reasoning'),'justification','Synthetic transfer justification','confidence',60));
  end loop;
  perform pg_temp.become('facilitator');
  perform public.ten_command(rid,'debrief');
  perform public.ten_command(rid,'completed');
  insert into qa_results values(m.code||' complete state machine',true,'Both learners committed every stage, peer revote and transfer');
 end loop;
 for u in select * from qa_users where label in ('AB','BA') loop
  perform pg_temp.become(u.label);
  result:=public.journey_summary(c.cid);
  insert into qa_results values(u.label||' four Signals earned',(result->>'mission_completed_count')::integer=4,'Mission completion gate');
  a:=case when u.label='AB' then c.form_b else c.form_a end;
  insert into public.assessment_attempts(assessment_id,learner_id) values(a,u.id);
  for n in 1..15 loop
   step:=public.get_progressive_assessment_step(a);
   result:=public.submit_progressive_assessment_step(a,(step->>'attempt_id')::uuid,(step->'item'->>'question_version_id')::uuid,'Synthetic Post QA response.');
  end loop;
  insert into qa_results values(u.label||' assigned Post completed',(result->>'completed')::boolean,'Opposite form completed');
  perform public.submit_journey_feedback(c.cid,4,4,'Synthetic QA feedback','Synthetic QA improvement',null);
  result:=public.journey_summary(c.cid);
  insert into qa_results values(u.label||' attendance and feedback eligibility',(result->>'eligible')::boolean,'All requirements satisfied without research consent');
  result:=public.claim_completion_certificate(c.cid);
  insert into qa_results values(u.label||' certificate issued',result is not null,'Rolled-back test certificate only');
 end loop;

 -- Independent ratings by different staff users, followed by atomic moderation.
 perform pg_temp.become('lead');
 select sr.id into response_id from public.student_responses sr join public.assessment_attempts aa on aa.id=sr.attempt_id where aa.learner_id=(select id from qa_users where label='AB') order by sr.id limit 1;
 select jsonb_object_agg(criterion->>'id',0) into step from jsonb_array_elements(public.ten_review_detail(response_id)->'criteria') criterion;
 insert into public.grading_quality_samples(response_id,program_id,reason,created_by) values(response_id,c.pid,'Synthetic double-rating QA sample',auth.uid());
 result:=public.ten_save_human_review(response_id,step,'Synthetic QA review',true);
 insert into qa_results values('first independent rating',result->>'status'='submitted','Human review RPC');
 perform pg_temp.expect_denied('submitted rating immutable',format('select public.ten_save_human_review(%L,%L,null,true)',response_id,step));
 perform pg_temp.expect_denied('sample cannot finalize with one rater',format('select public.ten_finalize_human_review(%L,null)',result->>'review_id'));
 perform pg_temp.become('reviewer');
 select count(*) into n from public.human_reviews where reviewer_id<>auth.uid();
 insert into qa_results values('reviewer cannot see other independent ratings',n=0,'RLS blind scoring');
 result:=public.ten_review_detail(response_id);
 insert into qa_results values('reviewer rubric projection',result->>'program_id'=c.pid::text and jsonb_array_length(result->'criteria')>0,'Protected rubric RPC');
 select jsonb_object_agg(criterion->>'id',criterion->'max_score') into step from jsonb_array_elements(result->'criteria') criterion;
 result:=public.ten_save_human_review(response_id,step,'Synthetic second rating',true);
 insert into qa_results values('second independent rating',result->>'status'='submitted','Separate reviewer');
 perform pg_temp.expect_denied('reviewer cannot release final score',format('select public.ten_finalize_human_review(%L,null)',result->>'review_id'));
 perform pg_temp.become('lead');
 perform pg_temp.expect_denied('disagreement blocks final score',format('select public.ten_finalize_human_review(%L,null)',result->>'review_id'));
 select id into act from public.moderation_cases mc where mc.response_id=response_id and status='open';
 perform public.resolve_human_moderation(act,1,'Synthetic QA moderation rationale');
 insert into qa_results values('moderation and final score atomic',exists(select 1 from public.final_score_decisions fs where fs.response_id=response_id and decision_source='moderation'),'Original independent scores retained');
 select id into a from public.fce_stations where program_id=c.pid and core order by code limit 1;
 act:=public.schedule_fce(a,c.cid,(select id from qa_users where label='AB'),auth.uid(),(select id from qa_users where label='reviewer'),'QA-SP',null);
 step:='{"H1":1,"H2":1,"PE1":1,"PE2":1,"PE3":1,"PE4":1,"PE5":1,"PR":1,"DDx":1,"JUST":1}';
 perform public.submit_fce_rating(act,step,3,array['consent_not_respected'],'Synthetic QA flag',420,180);
 perform pg_temp.expect_denied('FCE premature moderation',format('select public.moderate_fce(%L,%L,%L)',act,step,'Synthetic QA rationale'));
 perform pg_temp.become('reviewer');
 select count(*) into n from public.fce_ratings where encounter_id=act;
 insert into qa_results values('FCE second examiner blind',n=0,'Other rating hidden');
 perform public.submit_fce_rating(act,step,4,'{}',null,410,170);
 perform pg_temp.expect_denied('FCE rating immutable',format('select public.submit_fce_rating(%L,%L,4,ARRAY[]::text[],null,410,170)',act,step));
 perform pg_temp.become('lead');
 perform public.moderate_fce(act,step,'Synthetic QA moderation after both examiners');
 insert into qa_results values('FCE moderated without pass fail',true,'Two independent ratings and global scores retained');
end $$;
select jsonb_agg(to_jsonb(r)) results from qa_results r;
rollback;
