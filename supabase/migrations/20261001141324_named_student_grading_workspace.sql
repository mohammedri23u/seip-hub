-- Named oversight workspace. Existing blinded reviewer routes and finalization gates are unchanged.
create or replace function private.named_grading_workspace(target_program_id uuid, target_learner_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
 if auth.uid() is null or not private.managed_account_access_allowed() or not private.has_program_role(target_program_id,array['program_director','assessment_lead']::text[]) then
  raise exception 'Assessment leadership access required' using errcode='42501';
 end if;
 if target_learner_id is null then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.full_name,x.learner_id),'[]'::jsonb) into result from (
   select p.id learner_id,coalesce(nullif(p.full_name,''),'Unnamed learner') full_name,p.student_id,
    coalesce((select jsonb_agg(distinct g.name) from public.group_members gm join public.groups g on g.id=gm.group_id join public.cohorts c on c.id=g.cohort_id where gm.user_id=p.id and c.program_id=target_program_id and not exists(select 1 from public.program_assessment_sequences s where s.group_id=g.id)),'[]'::jsonb) groups,
    (select count(*) from public.assessment_attempts aa join public.assessments a on a.id=aa.assessment_id join public.cohorts c on c.id=a.cohort_id where aa.learner_id=p.id and c.program_id=target_program_id and aa.status in('submitted','late')) submitted_attempts,
    (select count(*) from public.assessment_attempts aa join public.assessments a on a.id=aa.assessment_id join public.cohorts c on c.id=a.cohort_id where aa.learner_id=p.id and c.program_id=target_program_id and aa.status='in_progress') in_progress_attempts,
    (select count(*) from public.student_responses sr join public.assessment_attempts aa on aa.id=sr.attempt_id join public.assessments a on a.id=aa.assessment_id join public.cohorts c on c.id=a.cohort_id where aa.learner_id=p.id and c.program_id=target_program_id and aa.status in('submitted','late') and exists(select 1 from public.question_rubrics qr where qr.question_version_id=sr.question_version_id) and not exists(select 1 from public.final_score_decisions f where f.response_id=sr.id) and not exists(select 1 from public.human_reviews h where h.response_id=sr.id and h.status='submitted')) pending_reviews,
    (select count(*) from public.student_responses sr join public.assessment_attempts aa on aa.id=sr.attempt_id join public.assessments a on a.id=aa.assessment_id join public.cohorts c on c.id=a.cohort_id where aa.learner_id=p.id and c.program_id=target_program_id and aa.status in('submitted','late') and not exists(select 1 from public.final_score_decisions f where f.response_id=sr.id) and exists(select 1 from public.human_reviews h where h.response_id=sr.id and h.status='submitted')) pending_approval
   from public.profiles p where exists(select 1 from public.cohort_memberships cm join public.cohorts c on c.id=cm.cohort_id where cm.user_id=p.id and cm.member_type='learner' and cm.status='active' and c.program_id=target_program_id)
  ) x;
  return jsonb_build_object('learners',result);
 end if;
 if not exists(select 1 from public.cohort_memberships cm join public.cohorts c on c.id=cm.cohort_id where cm.user_id=target_learner_id and cm.member_type='learner' and c.program_id=target_program_id) then
  raise exception 'Learner not found in this program' using errcode='42501';
 end if;
 select jsonb_build_object(
  'learner',(select jsonb_build_object('learner_id',p.id,'full_name',p.full_name,'student_id',p.student_id) from public.profiles p where p.id=target_learner_id),
  'assigned_forms',(select coalesce(jsonb_agg(jsonb_build_object('cohort_id',cm.cohort_id,'pre_assessment_id',pair.pre_assessment_id,'post_assessment_id',pair.post_assessment_id,'sequence',pair.sequence_code)),'[]'::jsonb) from public.cohort_memberships cm join public.cohorts c on c.id=cm.cohort_id left join lateral private.assigned_assessment_pair(cm.cohort_id,target_learner_id) pair on true where cm.user_id=target_learner_id and cm.member_type='learner' and c.program_id=target_program_id),
  'attempts',(select coalesce(jsonb_agg(jsonb_build_object(
   'id',aa.id,'assessment_id',aa.assessment_id,'title',a.title,'status',aa.status,'started_at',aa.started_at,'submitted_at',aa.submitted_at,
   'phase',case when aa.assessment_id=pair.pre_assessment_id then 'pre' when aa.assessment_id=pair.post_assessment_id then 'post' else 'practice' end,
   'duration_minutes',a.duration_minutes,'released_at',lar.released_at,'released_score',lar.total_score,'released_max',lar.max_score,
   'items',case when aa.status not in('submitted','late') then '[]'::jsonb else (select coalesce(jsonb_agg(jsonb_build_object(
    'position',ai.position,'question_version_id',v.id,'question_code',q.question_code,'question_type',q.question_type,'marks',ai.marks,
    'stem',v.stem,'response_id',sr.id,'response_text',sr.text_response,'selected_option_id',sr.selected_option_id,
    'selected_option_ids',sr.selected_option_ids,'has_rubric',exists(select 1 from public.question_rubrics qr where qr.question_version_id=v.id),
    'options',case when q.question_type='single_best_answer' then (select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'text',o.option_text,'is_correct',o.is_correct) order by o.position),'[]'::jsonb) from public.question_options o where o.question_version_id=v.id) else '[]'::jsonb end,
    'machine_score',ms.score,'machine_max',ms.max_score,
    'calculated_mcq',case when q.question_type='single_best_answer' and exists(select 1 from public.question_options o where o.question_version_id=v.id and o.is_correct) then case when exists(select 1 from public.question_options o where o.id=sr.selected_option_id and o.question_version_id=v.id and o.is_correct) then ai.marks else 0 end else null end,
    'final_score',fd.final_score,'final_max',fd.max_score,
    'review_id',hr.id,'review_score',hr.total_score,'review_max',hr.max_score,
    'my_review_status',(select h.status from public.human_reviews h where h.response_id=sr.id and h.reviewer_id=auth.uid()),
    'moderation_required',exists(select 1 from public.moderation_cases m where m.response_id=sr.id and m.status in('open','in_review'))
   ) order by ai.position),'[]'::jsonb)
   from public.assessment_items ai join public.question_versions v on v.id=ai.question_version_id join public.questions q on q.id=v.question_id
   left join public.student_responses sr on sr.attempt_id=aa.id and sr.question_version_id=ai.question_version_id
   left join public.machine_scores ms on ms.response_id=sr.id
   left join public.final_score_decisions fd on fd.response_id=sr.id
   left join lateral (select h.id,h.total_score,h.max_score from public.human_reviews h where h.response_id=sr.id and h.status='submitted' order by h.submitted_at desc,h.id limit 1) hr on true
   where ai.assessment_id=aa.assessment_id) end
  ) order by aa.started_at),'[]'::jsonb)
  from public.assessment_attempts aa join public.assessments a on a.id=aa.assessment_id join public.cohorts c on c.id=a.cohort_id
  left join lateral private.assigned_assessment_pair(a.cohort_id,target_learner_id) pair on true
  left join public.learner_assessment_results lar on lar.attempt_id=aa.id
  where aa.learner_id=target_learner_id and c.program_id=target_program_id)
 ) into result;
 return result;
end;
$$;
revoke all on function private.named_grading_workspace(uuid,uuid) from public,anon;
grant execute on function private.named_grading_workspace(uuid,uuid) to authenticated;
create or replace function public.ten_grading_workspace(target_program_id uuid,target_learner_id uuid default null)
returns jsonb language sql stable security invoker set search_path='' as $$
 select private.named_grading_workspace(target_program_id,target_learner_id);
$$;
revoke all on function public.ten_grading_workspace(uuid,uuid) from public,anon;
grant execute on function public.ten_grading_workspace(uuid,uuid) to authenticated;
comment on function public.ten_grading_workspace(uuid,uuid) is 'Leadership-only named grading workspace; no writes or changes to blinded reviewer permissions.';
