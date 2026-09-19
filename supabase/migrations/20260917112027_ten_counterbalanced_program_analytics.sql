create or replace function public.ten_program_analytics(target_program_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not (private.is_platform_admin() or private.has_program_role(target_program_id,array['program_director','assessment_lead']::text[])) then
    raise exception 'Not authorized for program analytics';
  end if;

  with excluded as (
    select user_id from public.program_analytics_exclusions where program_id=target_program_id
  ), active_learners as (
    select distinct cm.user_id,cm.cohort_id
    from public.cohort_memberships cm
    join public.cohorts c on c.id=cm.cohort_id
    where c.program_id=target_program_id and cm.status='active' and cm.member_type='learner'
      and not exists(select 1 from excluded e where e.user_id=cm.user_id)
  ), assigned as (
    select al.user_id,al.cohort_id,ap.pre_assessment_id,ap.post_assessment_id,ap.sequence_code
    from active_learners al
    cross join lateral private.assigned_assessment_pair(al.cohort_id,al.user_id) ap
  ), paired_results as (
    select a.user_id,a.sequence_code,
      pre.total_score as pre_score,pre.max_score as pre_max,
      post.total_score as post_score,post.max_score as post_max
    from assigned a
    left join public.learner_assessment_results pre on pre.learner_id=a.user_id and pre.assessment_id=a.pre_assessment_id
    left join public.learner_assessment_results post on post.learner_id=a.user_id and post.assessment_id=a.post_assessment_id
  ), assessment_summary as (
    select
      count(*) filter(where pre_score is not null) as entry_results,
      count(*) filter(where post_score is not null) as exit_results,
      round(avg(100.0*pre_score/nullif(pre_max,0)) filter(where pre_score is not null),2) as entry_mean_percent,
      round(avg(100.0*post_score/nullif(post_max,0)) filter(where post_score is not null),2) as exit_mean_percent,
      count(*) filter(where pre_score is not null and post_score is not null) as matched_pairs,
      round(avg((100.0*post_score/nullif(post_max,0))-(100.0*pre_score/nullif(pre_max,0))) filter(where pre_score is not null and post_score is not null),2) as matched_delta_percent
    from paired_results
  ), objective_evidence as (
    select lo.id,lo.code,lo.title,a.user_id,
      max(lor.performance_percent) filter(where lar.assessment_id=a.pre_assessment_id) as entry_value,
      max(lor.performance_percent) filter(where lar.assessment_id=a.post_assessment_id) as exit_value
    from public.learning_objectives lo
    cross join assigned a
    left join public.learner_assessment_results lar on lar.learner_id=a.user_id and lar.assessment_id in (a.pre_assessment_id,a.post_assessment_id)
    left join public.learner_objective_results lor on lor.assessment_result_id=lar.id and lor.learning_objective_id=lo.id
    where lo.program_id=target_program_id and lo.status='active'
    group by lo.id,lo.code,lo.title,a.user_id
  ), objective_rows as (
    select id,code,title,
      round(avg(entry_value) filter(where entry_value is not null),2) as entry_mean,
      round(avg(exit_value) filter(where exit_value is not null),2) as exit_mean,
      count(*) filter(where entry_value is not null) as entry_n,
      count(*) filter(where exit_value is not null) as exit_n,
      round(avg(exit_value-entry_value) filter(where entry_value is not null and exit_value is not null),2) as matched_delta
    from objective_evidence
    group by id,code,title
  ), mission_base as (
    select m.mission_id,
      count(distinct tc.user_id) filter(where not exists(select 1 from excluded e where e.user_id=tc.user_id)) as completers,
      count(distinct tr.id) filter(where tr.phase='completed') as completed_runs,
      count(distinct tp.user_id) filter(where not exists(select 1 from excluded e where e.user_id=tp.user_id)) as participants
    from (values ('M01'::text),('M02'),('M03'),('M04')) m(mission_id)
    left join public.ten_runs tr on tr.mission_id=m.mission_id
    left join public.sessions se on se.id=tr.session_id
    left join public.cohorts c on c.id=se.cohort_id and c.program_id=target_program_id
    left join public.ten_codex tc on tc.run_id=tr.id and c.id is not null
    left join public.ten_participants tp on tp.run_id=tr.id and c.id is not null
    where tr.id is null or c.id is not null
    group by m.mission_id
  ), calibration as (
    select tr.mission_id,
      round(avg(r.confidence) filter(where r.round=1),1) as initial_confidence_mean,
      round(avg(r.confidence) filter(where r.round=2),1) as revote_confidence_mean,
      count(*) filter(where r.round=2) as revote_count,
      count(*) filter(where r.round=2 and r1.payload is distinct from r.payload) as changed_count
    from public.ten_runs tr
    join public.sessions se on se.id=tr.session_id
    join public.cohorts c on c.id=se.cohort_id and c.program_id=target_program_id
    join public.ten_responses r on r.run_id=tr.id
    left join public.ten_responses r1 on r1.run_id=r.run_id and r1.user_id=r.user_id and r1.stage_index=r.stage_index and r1.round=1
    where not exists(select 1 from excluded e where e.user_id=r.user_id)
    group by tr.mission_id
  ), feedback_summary as (
    select count(*) as n,round(avg(lpf.relevance_rating),2) as relevance_mean,round(avg(lpf.learning_design_rating),2) as learning_design_mean
    from public.learner_program_feedback lpf
    where lpf.program_id=target_program_id and not exists(select 1 from excluded e where e.user_id=lpf.learner_id)
  ), consent_version as (
    select pjs.consent_version from public.program_journey_settings pjs where pjs.program_id=target_program_id and pjs.active limit 1
  ), current_consent as (
    select al.user_id,rcr.status
    from active_learners al cross join consent_version cv
    left join public.research_consent_records rcr on rcr.program_id=target_program_id and rcr.learner_id=al.user_id and rcr.policy_version=cv.consent_version
  ), consent_summary as (
    select count(*) filter(where status='granted') as consented,
      count(*) filter(where status='declined') as declined,
      count(*) filter(where status='withdrawn') as withdrawn,
      count(*) filter(where status is null) as unknown
    from current_consent
  ), sequence_summary as (
    select sequence_code,count(*) as learners from assigned group by sequence_code
  )
  select jsonb_build_object(
    'program_id',target_program_id,
    'cohorts',(select count(*) from public.cohorts where program_id=target_program_id),
    'active_learners',(select count(*) from active_learners),
    'excluded_test_accounts',(select count(*) from excluded),
    'assessment',jsonb_build_object(
      'entry_results',coalesce(a.entry_results,0),'exit_results',coalesce(a.exit_results,0),
      'entry_mean_percent',a.entry_mean_percent,'exit_mean_percent',a.exit_mean_percent,
      'matched_pairs',coalesce(a.matched_pairs,0),'delta_percent',a.matched_delta_percent
    ),
    'assessment_sequences',coalesce((select jsonb_agg(jsonb_build_object('sequence',s.sequence_code,'learners',s.learners) order by s.sequence_code) from sequence_summary s),'[]'::jsonb),
    'objectives',coalesce((select jsonb_agg(jsonb_build_object(
      'code',o.code,'title',o.title,'entry_mean',o.entry_mean,'exit_mean',o.exit_mean,'delta',o.matched_delta,'entry_n',o.entry_n,'exit_n',o.exit_n
    ) order by o.code) from objective_rows o),'[]'::jsonb),
    'missions',coalesce((select jsonb_agg(jsonb_build_object(
      'mission_id',mb.mission_id,'completers',mb.completers,'participants',mb.participants,'completed_runs',mb.completed_runs,
      'initial_confidence_mean',cal.initial_confidence_mean,'revote_confidence_mean',cal.revote_confidence_mean,
      'changed_count',coalesce(cal.changed_count,0),'revote_count',coalesce(cal.revote_count,0),
      'changed_percent',case when coalesce(cal.revote_count,0)>0 then round(100.0*cal.changed_count/cal.revote_count,1) else null end
    ) order by mb.mission_id) from mission_base mb left join calibration cal using(mission_id)),'[]'::jsonb),
    'feedback',(select jsonb_build_object('n',n,'relevance_mean',relevance_mean,'learning_design_mean',learning_design_mean) from feedback_summary),
    'research_consent',(select jsonb_build_object('consented',consented,'declined',declined,'withdrawn',withdrawn,'unknown',unknown) from consent_summary)
  ) into result
  from assessment_summary a;

  return result;
end;
$$;
