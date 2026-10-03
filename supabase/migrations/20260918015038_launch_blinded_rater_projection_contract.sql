
create or replace function public.ten_review_queue(target_program_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not private.has_program_role(target_program_id,array['program_director','assessment_lead','reviewer']) then raise exception 'Reviewer access required' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
 'response_id',sr.id,'assessment_title',a.title,'question_code',q.question_code,
 'existing_review_id',hr.id,'existing_review_status',hr.status,
 'finalized',f.id is not null,
 'moderation_required',exists(select 1 from public.moderation_cases m where m.response_id=sr.id and m.status in ('open','in_review')),
 'sampled',exists(select 1 from public.grading_quality_samples s where s.response_id=sr.id and s.status in ('assigned','complete'))
 ) order by sr.submitted_at,q.question_code),'[]'::jsonb) into result
 from public.student_responses sr join public.assessment_attempts aa on aa.id=sr.attempt_id
 join public.assessments a on a.id=aa.assessment_id join public.cohorts c on c.id=a.cohort_id
 join public.question_versions qv on qv.id=sr.question_version_id join public.questions q on q.id=qv.question_id
 join public.question_rubrics qr on qr.question_version_id=sr.question_version_id
 left join public.human_reviews hr on hr.response_id=sr.id and hr.reviewer_id=auth.uid()
 left join public.final_score_decisions f on f.response_id=sr.id
 where c.program_id=target_program_id and aa.status in ('submitted','late') and nullif(trim(sr.text_response),'') is not null;
 return result;
end $$;
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
    'program_id',q.program_id,
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


