-- Independent ratings remain immutable after submission.
create or replace function private.guard_submitted_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status='submitted' then raise exception 'Submitted independent rating is immutable; use moderation'; end if;
 return new;
end $$;
create trigger human_review_submission_lock before update on public.human_reviews for each row execute function private.guard_submitted_review();
create or replace function private.can_view_independent_review(target_response_id uuid,target_reviewer_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and private.can_grade_response(target_response_id) and (auth.uid()=target_reviewer_id or private.can_finalize_response(target_response_id));
$$;
drop policy human_reviews_select on public.human_reviews;
create policy human_reviews_select on public.human_reviews for select to authenticated using(private.can_view_independent_review(response_id,reviewer_id));
revoke insert,update,delete on public.human_reviews,public.human_criterion_scores from authenticated;
create or replace function private.check_human_disagreement() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.decision_source='human_review' and exists (
 select 1 from public.human_criterion_scores a join public.human_reviews ar on ar.id=a.human_review_id
 join public.human_criterion_scores b on b.criterion_id=a.criterion_id and b.human_review_id<>a.human_review_id
 join public.human_reviews br on br.id=b.human_review_id
 where ar.response_id=new.response_id and br.response_id=new.response_id and ar.status='submitted' and br.status='submitted' and a.score<>b.score
 ) then raise exception 'Independent ratings disagree; resolve through moderation'; end if;
 return new;
end $$;
create trigger final_score_disagreement_guard before insert on public.final_score_decisions for each row execute function private.check_human_disagreement();
CREATE OR REPLACE FUNCTION public.ten_save_human_review(target_response_id uuid, criterion_scores jsonb, feedback text DEFAULT NULL::text, submit_review boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); rv_id uuid; review_id uuid; max_total numeric; score_total numeric:=0; c record; requested numeric;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not private.can_grade_response(target_response_id) then raise exception 'Reviewer access required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_response_id::text,0));
  if not exists(select 1 from public.student_responses sr join public.assessment_attempts aa on aa.id=sr.attempt_id where sr.id=target_response_id and aa.status in ('submitted','late')) then raise exception 'Submitted attempt required'; end if;
  if jsonb_typeof(criterion_scores) is distinct from 'object' then raise exception 'Criterion score object required'; end if;
  select qr.rubric_version_id into rv_id from public.student_responses sr join public.question_rubrics qr on qr.question_version_id=sr.question_version_id where sr.id=target_response_id;
  if rv_id is null then raise exception 'No rubric is linked to this response'; end if;

  select coalesce(sum(max_score),0) into max_total from public.rubric_criteria where rubric_version_id=rv_id;
  for c in select id,max_score from public.rubric_criteria where rubric_version_id=rv_id order by position loop
    if not (criterion_scores ? c.id::text) then raise exception 'All rubric criteria require a score'; end if;
    requested:=(criterion_scores->>c.id::text)::numeric;
    if requested is null or requested::text in ('NaN','Infinity','-Infinity') or requested<0 or requested>c.max_score or (c.max_score=2 and requested<>trunc(requested)) then raise exception 'Criterion score out of range'; end if;
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

  if submit_review and exists (
    select 1 from public.human_reviews h join public.human_criterion_scores s on s.human_review_id=h.id
    join public.human_criterion_scores own on own.human_review_id=review_id and own.criterion_id=s.criterion_id
    where h.response_id=target_response_id and h.id<>review_id and h.status='submitted' and s.score<>own.score
  ) and not exists(select 1 from public.moderation_cases where response_id=target_response_id and status in ('open','in_review')) then
    insert into public.moderation_cases(response_id,human_review_id,trigger_type,reason,opened_by)
    values(target_response_id,review_id,'quality_control','Independent criterion ratings disagree; human moderation required.',uid);
  end if;
  return jsonb_build_object('review_id',review_id,'status',case when submit_review then 'submitted' else 'draft' end,'total_score',score_total,'max_score',max_total);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.ten_review_detail(target_response_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); payload jsonb;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not private.can_grade_response(target_response_id) then raise exception 'Reviewer access required' using errcode='42501'; end if;

  select jsonb_build_object(
    'response_id',sr.id,
    'assessment_id',aa.assessment_id,
    'assessment_title',a.title,
    'response_code',sr.id::text,
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
$function$
;
