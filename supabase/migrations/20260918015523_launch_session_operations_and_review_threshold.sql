
create or replace function public.schedule_program_session(target_session uuid,scheduled timestamptz,duration integer,facilitator uuid) returns void language plpgsql security definer set search_path='' as $$
declare p uuid;
begin
 select c.program_id into p from public.sessions s join public.cohorts c on c.id=s.cohort_id where s.id=target_session for update of s;
 if auth.uid() is null or p is null or not private.has_program_role(p,array['program_director']) then raise exception 'Director required' using errcode='42501'; end if;
 if scheduled is null or duration is null or duration<=0 or duration>480 then raise exception 'Valid schedule and duration required'; end if;
 if facilitator is not null and not exists(select 1 from public.program_memberships where program_id=p and user_id=facilitator and status='active' and role in ('program_director','peer_educator','assessment_lead')) then raise exception 'Active facilitator role required'; end if;
 update public.sessions set scheduled_at=scheduled,duration_minutes=duration,status=case when status='draft' then 'scheduled' else status end,updated_at=now() where id=target_session;
 if facilitator is not null then
 insert into public.session_facilitators(session_id,user_id,facilitator_role) values(target_session,facilitator,'facilitator') on conflict(session_id,user_id) do nothing;
 end if;
 insert into public.audit_events(program_id,actor_user_id,event_type,entity_type,entity_id,new_value) values(p,auth.uid(),'session.scheduled','session',target_session::text,jsonb_build_object('scheduled_at',scheduled,'duration',duration,'facilitator',facilitator));
end $$;
revoke all on function public.schedule_program_session(uuid,timestamptz,integer,uuid) from public,anon;
grant execute on function public.schedule_program_session(uuid,timestamptz,integer,uuid) to authenticated;
create or replace function private.audit_release_evidence() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_events(program_id,actor_user_id,event_type,entity_type,entity_id,new_value)
 values(new.program_id,auth.uid(),'release.evidence_recorded','release_gate',new.gate,jsonb_build_object('gate',new.gate,'evidence_url',new.evidence_url,'note',new.note));
 return new;
end $$;
create trigger release_evidence_audit after insert or update on public.program_release_evidence for each row execute function private.audit_release_evidence();
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
    'moderation_threshold_points',rv.moderation_threshold_points,
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


