-- Read-only grading overview: completion is not the same as persisted answers.
create or replace function private.grading_attempt_snapshot(target_attempt_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $function$
with attempt as (
 select aa.*,a.title,a.cohort_id,a.duration_minutes,
  case when aa.assessment_id=p.pre_assessment_id then 'pre' when aa.assessment_id=p.post_assessment_id then 'post' else 'practice' end phase,
  m.instrument_version,
  e.finalized_at expiration_recorded_at,
  case when m.assessment_id is not null then aa.started_at+make_interval(mins=>a.duration_minutes) end deadline_at,
  (e.attempt_id is not null or (m.assessment_id is not null and aa.status='in_progress' and now()>=aa.started_at+make_interval(mins=>a.duration_minutes))) expired,
  aa.status in ('submitted','late') closed
 from public.assessment_attempts aa join public.assessments a on a.id=aa.assessment_id
 left join lateral private.assigned_assessment_pair(a.cohort_id,aa.learner_id) p on true
 left join private.micro_assessment_versions m on m.assessment_id=a.id
 left join private.micro_assessment_expirations e on e.attempt_id=aa.id
 where aa.id=target_attempt_id
), evidence as (
 select ai.marks,q.question_type,sr.id response_id,
  (sr.id is not null and (sr.selected_option_id is not null or coalesce(cardinality(sr.selected_option_ids),0)>0 or nullif(btrim(sr.text_response),'') is not null)) answered,
  exists(select 1 from public.question_rubrics qr where qr.question_version_id=ai.question_version_id) has_rubric,
  case when cs.max_score>0 and cs.score between 0 and cs.max_score then cs.score/cs.max_score*ai.marks end official_score,
  case when hr.max_score>0 and hr.total_score between 0 and hr.max_score then hr.total_score/hr.max_score*ai.marks end human_score,
  case when q.question_type='single_best_answer' and sr.selected_option_id is not null and (select count(*) from public.question_options o where o.question_version_id=ai.question_version_id and o.is_correct)=1
   then case when exists(select 1 from public.question_options o where o.question_version_id=ai.question_version_id and o.id=sr.selected_option_id and o.is_correct) then ai.marks else 0 end end calculated_mcq,
  exists(select 1 from public.moderation_cases mc where mc.response_id=sr.id and mc.status in('open','in_review')) moderation
 from attempt aa join public.assessment_items ai on ai.assessment_id=aa.assessment_id
 join public.question_versions v on v.id=ai.question_version_id join public.questions q on q.id=v.question_id
 left join public.student_responses sr on sr.attempt_id=aa.id and sr.question_version_id=ai.question_version_id
 left join lateral private.current_response_score(sr.id) cs on true
 left join lateral (select h.total_score,h.max_score from public.human_reviews h where h.response_id=sr.id and h.status='submitted' order by h.submitted_at desc,h.id desc limit 1) hr on true
), totals as (
 select count(*) total_items,coalesce(sum(marks),0) maximum,
  count(response_id) saved_answers,count(*) filter(where answered) answered_items,
  count(*) filter(where not answered) missing_items,
  count(*) filter(where answered and has_rubric and official_score is null and human_score is null) pending_reviews,
  count(*) filter(where answered and official_score is null and coalesce(human_score,calculated_mcq) is not null) pending_approval,
  count(*) filter(where answered and coalesce(official_score,human_score,calculated_mcq) is not null) known_items,
  count(*) filter(where answered and official_score is not null) approved_items,
  sum(coalesce(official_score,human_score,calculated_mcq)) filter(where answered) known_score,
  sum(official_score) filter(where answered) approved_score,
  count(*) filter(where moderation) moderation_items,
  sum(coalesce(official_score,calculated_mcq)) filter(where answered and question_type='single_best_answer') mcq_score,
  coalesce(sum(marks) filter(where question_type='single_best_answer'),0) mcq_max,
  count(*) filter(where answered and question_type='single_best_answer') mcq_answered,
  sum(coalesce(official_score,human_score)) filter(where answered and has_rubric) written_score,
  coalesce(sum(marks) filter(where has_rubric),0) written_max
 from evidence
)
select jsonb_build_object(
 'id',a.id,'assessment_id',a.assessment_id,'title',a.title,'phase',a.phase,'status',a.status,
 'instrument_version',coalesce(a.instrument_version,'original'),'started_at',a.started_at,'submitted_at',a.submitted_at,
 'deadline_at',a.deadline_at,'expiration_recorded_at',a.expiration_recorded_at,'expired',a.expired,
 'completion_kind',case when a.status='invalidated' then 'invalidated' when not a.closed then case when a.expired then 'expired_unfinalized' else 'in_progress' end
  when t.answered_items=0 then case when a.expired then 'timed_out_empty' else 'submitted_empty' end
  when t.answered_items<t.total_items then case when a.expired then 'timed_out_partial' else 'submitted_partial' end
  else case when a.expired then 'timed_out_complete' else 'submitted_complete' end end,
 'total_items',t.total_items,'max_score',t.maximum,'saved_answers',t.saved_answers,'answered_items',t.answered_items,'missing_items',t.missing_items,
 'pending_reviews',case when a.closed then t.pending_reviews else 0 end,
 'pending_approval',case when a.closed then t.pending_approval else 0 end,
 'known_items',case when a.closed then t.known_items else 0 end,
 'approved_items',case when a.closed then t.approved_items else 0 end,
 'known_score',case when a.closed then t.known_score end,
 'approved_score',case when a.closed then t.approved_score end,
 'moderation_items',case when a.closed then t.moderation_items else 0 end,
 'mcq_score',case when a.closed then t.mcq_score end,'mcq_max',t.mcq_max,'mcq_answered',t.mcq_answered,
 'written_score',case when a.closed then t.written_score end,'written_max',t.written_max,
 'final_score',case when a.closed and t.total_items>0 and t.missing_items=0 and t.approved_items=t.total_items and t.moderation_items=0 then t.approved_score end,
 'final_percent',case when a.closed and t.maximum>0 and t.missing_items=0 and t.approved_items=t.total_items and t.moderation_items=0 then round(t.approved_score/t.maximum*100,2) end
) from attempt a cross join totals t;
$function$;
revoke all on function private.grading_attempt_snapshot(uuid) from public,anon,authenticated;

-- Amend the existing role-checked read contract in place, rejecting an unexpected source.
do $migration$
declare definition text; original text; needle text;
begin
 select pg_get_functiondef('private.named_grading_workspace(uuid,uuid)'::regprocedure) into definition;
 original:=definition;
 needle:='p.student_id,';
 if position(needle in definition)=0 then raise exception 'Named grading contract changed; review migration'; end if;
 definition:=replace(definition,needle,needle||$patch$
    (select coalesce(jsonb_agg(private.grading_attempt_snapshot(aa.id) order by aa.started_at desc),'[]'::jsonb) from public.assessment_attempts aa join public.assessments a on a.id=aa.assessment_id join public.cohorts c on c.id=a.cohort_id where aa.learner_id=p.id and c.program_id=target_program_id) attempt_summaries,$patch$);
 needle:='''duration_minutes'',a.duration_minutes';
 if position(needle in definition)=0 then raise exception 'Attempt read contract changed; review migration'; end if;
 definition:=replace(definition,needle,'''summary'',private.grading_attempt_snapshot(aa.id),'||needle);
 needle:='''calculated_mcq'',case when q.question_type=''single_best_answer'' and exists';
 if position(needle in definition)=0 then raise exception 'MCQ read contract changed; review migration'; end if;
 definition:=replace(definition,needle,'''calculated_mcq'',case when q.question_type=''single_best_answer'' and sr.selected_option_id is not null and exists');
 needle:='left join public.final_score_decisions fd on fd.response_id=sr.id';
 if position(needle in definition)=0 then raise exception 'Final-score read contract changed; review migration'; end if;
 definition:=replace(definition,needle,'left join lateral (select cs.score final_score,cs.max_score from private.current_response_score(sr.id) cs where cs.score_source<>''machine'') fd on true');
 if definition=original then raise exception 'No grading contract update applied'; end if;
 execute definition;
end;
$migration$;
comment on function private.grading_attempt_snapshot(uuid) is 'Internal read-only gradebook snapshot; called only by role-checked named grading. No responses or grades are synthesized.';
