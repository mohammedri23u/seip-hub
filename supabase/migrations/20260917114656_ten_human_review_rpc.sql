create or replace function public.ten_review_detail(target_response_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare uid uuid:=auth.uid(); payload jsonb;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not private.can_grade_response(target_response_id) then raise exception 'Reviewer access required' using errcode='42501'; end if;

  select jsonb_build_object(
    'response_id',sr.id,
    'assessment_id',aa.assessment_id,
    'assessment_title',a.title,
    'learner_id',aa.learner_id,
    'question_code',q.question_code,
    'stem',qv.stem,
    'response_text',sr.text_response,
    'rubric_version_id',qr.rubric_version_id,
    'rubric_instructions',rv.instructions,
    'reference_answer',rv.reference_answer,
    'criteria',coalesce((select jsonb_agg(jsonb_build_object(
      'id',rc.id,'code',rc.criterion_code,'title',rc.title,'description',rc.description,'scoring_guidance',rc.scoring_guidance,'max_score',rc.max_score,'position',rc.position
    ) order by rc.position) from public.rubric_criteria rc where rc.rubric_version_id=qr.rubric_version_id),'[]'::jsonb),
    'my_review',case when hr.id is null then null else jsonb_build_object(
      'id',hr.id,'status',hr.status,'total_score',hr.total_score,'max_score',hr.max_score,'general_feedback',hr.general_feedback,
      'criterion_scores',coalesce((select jsonb_object_agg(hcs.criterion_id::text,hcs.score) from public.human_criterion_scores hcs where hcs.human_review_id=hr.id),'{}'::jsonb)
    ) end,
    'final_decision',case when fsd.id is null then null else jsonb_build_object('id',fsd.id,'score',fsd.final_score,'max_score',fsd.max_score,'source',fsd.decision_source) end
  ) into payload
  from public.student_responses sr
  join public.assessment_attempts aa on aa.id=sr.attempt_id
  join public.assessments a on a.id=aa.assessment_id
  join public.question_versions qv on qv.id=sr.question_version_id
  join public.questions q on q.id=qv.question_id
  left join public.question_rubrics qr on qr.question_version_id=sr.question_version_id
  left join public.rubric_versions rv on rv.id=qr.rubric_version_id
  left join public.human_reviews hr on hr.response_id=sr.id and hr.reviewer_id=uid
  left join public.final_score_decisions fsd on fsd.response_id=sr.id
  where sr.id=target_response_id;
  return payload;
end;
$$;

create or replace function public.ten_save_human_review(target_response_id uuid, criterion_scores jsonb, feedback text default null, submit_review boolean default false)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare uid uuid:=auth.uid(); rv_id uuid; review_id uuid; max_total numeric; score_total numeric:=0; c record; requested numeric;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not private.can_grade_response(target_response_id) then raise exception 'Reviewer access required' using errcode='42501'; end if;
  select qr.rubric_version_id into rv_id from public.student_responses sr join public.question_rubrics qr on qr.question_version_id=sr.question_version_id where sr.id=target_response_id;
  if rv_id is null then raise exception 'No rubric is linked to this response'; end if;

  select coalesce(sum(max_score),0) into max_total from public.rubric_criteria where rubric_version_id=rv_id;
  for c in select id,max_score from public.rubric_criteria where rubric_version_id=rv_id order by position loop
    if not (criterion_scores ? c.id::text) then raise exception 'All rubric criteria require a score'; end if;
    requested:=(criterion_scores->>c.id::text)::numeric;
    if requested<0 or requested>c.max_score then raise exception 'Criterion score out of range'; end if;
    score_total:=score_total+requested;
  end loop;

  insert into public.human_reviews(response_id,rubric_version_id,reviewer_id,status,total_score,max_score,general_feedback,submitted_at)
  values(target_response_id,rv_id,uid,case when submit_review then 'submitted' else 'draft' end,score_total,max_total,feedback,case when submit_review then now() else null end)
  on conflict(response_id,reviewer_id) do update set
    rubric_version_id=excluded.rubric_version_id,status=excluded.status,total_score=excluded.total_score,max_score=excluded.max_score,general_feedback=excluded.general_feedback,
    submitted_at=case when submit_review then now() else human_reviews.submitted_at end,updated_at=now()
  returning id into review_id;

  delete from public.human_criterion_scores where human_review_id=review_id;
  for c in select id,max_score from public.rubric_criteria where rubric_version_id=rv_id order by position loop
    requested:=(criterion_scores->>c.id::text)::numeric;
    insert into public.human_criterion_scores(human_review_id,criterion_id,score) values(review_id,c.id,requested);
  end loop;

  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,new_value)
  select uid,case when submit_review then 'human_review_submitted' else 'human_review_saved' end,'human_review',review_id::text,
    jsonb_build_object('response_id',target_response_id,'score',score_total,'max_score',max_total);

  return jsonb_build_object('review_id',review_id,'status',case when submit_review then 'submitted' else 'draft' end,'total_score',score_total,'max_score',max_total);
end;
$$;

create or replace function public.ten_finalize_human_review(target_review_id uuid, rationale text default null)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare uid uuid:=auth.uid(); hr record; decision_id uuid;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select * into hr from public.human_reviews where id=target_review_id;
  if hr.id is null or hr.status<>'submitted' then raise exception 'Submitted human review required'; end if;
  if not private.can_finalize_response(hr.response_id) then raise exception 'Assessment lead access required' using errcode='42501'; end if;

  insert into public.final_score_decisions(response_id,decision_source,human_review_id,final_score,max_score,rationale,decided_by)
  values(hr.response_id,'human_review',hr.id,hr.total_score,hr.max_score,rationale,uid)
  on conflict(response_id) do update set decision_source='human_review',human_review_id=excluded.human_review_id,moderation_case_id=null,final_score=excluded.final_score,max_score=excluded.max_score,rationale=excluded.rationale,decided_by=uid,updated_at=now()
  returning id into decision_id;

  insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id,new_value)
  values(uid,'final_score_decided','final_score_decision',decision_id::text,jsonb_build_object('response_id',hr.response_id,'score',hr.total_score,'max_score',hr.max_score));
  return jsonb_build_object('decision_id',decision_id,'response_id',hr.response_id,'score',hr.total_score,'max_score',hr.max_score);
end;
$$;

revoke all on function public.ten_review_detail(uuid) from public; grant execute on function public.ten_review_detail(uuid) to authenticated;
revoke all on function public.ten_save_human_review(uuid,jsonb,text,boolean) from public; grant execute on function public.ten_save_human_review(uuid,jsonb,text,boolean) to authenticated;
revoke all on function public.ten_finalize_human_review(uuid,text) from public; grant execute on function public.ten_finalize_human_review(uuid,text) to authenticated;
