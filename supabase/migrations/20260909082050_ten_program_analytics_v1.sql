create or replace function public.ten_program_analytics(target_program_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not (private.is_platform_admin() or private.has_program_role(target_program_id, array['program_director','assessment_lead'])) then
    raise exception 'Not authorized for program analytics';
  end if;

  with settings as (
    select pjs.pre_assessment_id, pjs.post_assessment_id
    from public.program_journey_settings pjs
    where pjs.program_id = target_program_id and pjs.active = true
    limit 1
  ), active_learners as (
    select distinct cm.user_id
    from public.cohort_memberships cm
    join public.cohorts c on c.id = cm.cohort_id
    where c.program_id = target_program_id and cm.status = 'active' and cm.member_type = 'learner'
  ), assessment_summary as (
    select
      count(*) filter (where lar.assessment_id = s.pre_assessment_id) as entry_results,
      count(*) filter (where lar.assessment_id = s.post_assessment_id) as exit_results,
      round(avg(100.0 * lar.total_score / nullif(lar.max_score,0)) filter (where lar.assessment_id = s.pre_assessment_id),2) as entry_mean_percent,
      round(avg(100.0 * lar.total_score / nullif(lar.max_score,0)) filter (where lar.assessment_id = s.post_assessment_id),2) as exit_mean_percent
    from settings s
    left join public.learner_assessment_results lar on lar.assessment_id in (s.pre_assessment_id,s.post_assessment_id)
  ), objective_rows as (
    select lo.id, lo.code, lo.title,
      round(avg(lor.performance_percent) filter (where lar.assessment_id = s.pre_assessment_id),2) as entry_mean,
      round(avg(lor.performance_percent) filter (where lar.assessment_id = s.post_assessment_id),2) as exit_mean,
      count(*) filter (where lar.assessment_id = s.pre_assessment_id) as entry_n,
      count(*) filter (where lar.assessment_id = s.post_assessment_id) as exit_n
    from public.learning_objectives lo
    cross join settings s
    left join public.learner_objective_results lor on lor.learning_objective_id = lo.id
    left join public.learner_assessment_results lar on lar.id = lor.assessment_result_id and lar.assessment_id in (s.pre_assessment_id,s.post_assessment_id)
    where lo.program_id = target_program_id and lo.status = 'active'
    group by lo.id,lo.code,lo.title
  ), mission_base as (
    select m.mission_id,
      count(distinct tc.user_id) as completers,
      count(distinct tr.id) filter (where tr.phase='completed') as completed_runs,
      count(distinct tp.user_id) as participants
    from (values ('M01'::text),('M02'),('M03'),('M04')) m(mission_id)
    left join public.ten_runs tr on tr.mission_id = m.mission_id
    left join public.sessions se on se.id = tr.session_id
    left join public.cohorts c on c.id = se.cohort_id and c.program_id = target_program_id
    left join public.ten_codex tc on tc.run_id = tr.id and c.id is not null
    left join public.ten_participants tp on tp.run_id = tr.id and c.id is not null
    where tr.id is null or c.id is not null
    group by m.mission_id
  ), calibration as (
    select tr.mission_id,
      round(avg(r.confidence) filter (where r.round=1),1) as initial_confidence_mean,
      round(avg(r.confidence) filter (where r.round=2),1) as revote_confidence_mean,
      count(*) filter (where r.round=2) as revote_count,
      count(*) filter (where r.round=2 and r1.payload is distinct from r.payload) as changed_count
    from public.ten_runs tr
    join public.sessions se on se.id=tr.session_id
    join public.cohorts c on c.id=se.cohort_id and c.program_id=target_program_id
    join public.ten_responses r on r.run_id=tr.id
    left join public.ten_responses r1 on r1.run_id=r.run_id and r1.user_id=r.user_id and r1.stage_index=r.stage_index and r1.round=1
    group by tr.mission_id
  ), feedback_summary as (
    select count(*) as n, round(avg(relevance_rating),2) as relevance_mean, round(avg(learning_design_rating),2) as learning_design_mean
    from public.learner_program_feedback
    where program_id=target_program_id
  ), latest_consent as (
    select distinct on (learner_id) learner_id,status
    from public.research_consent_records
    where program_id=target_program_id
    order by learner_id, recorded_at desc
  ), consent_summary as (
    select
      count(*) filter (where lc.status='consented') as consented,
      count(*) filter (where lc.status='declined') as declined,
      count(*) filter (where lc.status='withdrawn') as withdrawn,
      greatest((select count(*) from active_learners)-count(lc.learner_id),0) as unknown
    from latest_consent lc
  )
  select jsonb_build_object(
    'program_id', target_program_id,
    'cohorts', (select count(*) from public.cohorts where program_id=target_program_id),
    'active_learners', (select count(*) from active_learners),
    'assessment', jsonb_build_object(
      'entry_results', coalesce(a.entry_results,0),
      'exit_results', coalesce(a.exit_results,0),
      'entry_mean_percent', a.entry_mean_percent,
      'exit_mean_percent', a.exit_mean_percent,
      'delta_percent', case when a.entry_mean_percent is not null and a.exit_mean_percent is not null then round(a.exit_mean_percent-a.entry_mean_percent,2) else null end
    ),
    'objectives', coalesce((select jsonb_agg(jsonb_build_object(
      'code',o.code,'title',o.title,'entry_mean',o.entry_mean,'exit_mean',o.exit_mean,
      'delta',case when o.entry_mean is not null and o.exit_mean is not null then round(o.exit_mean-o.entry_mean,2) else null end,
      'entry_n',o.entry_n,'exit_n',o.exit_n
    ) order by o.code) from objective_rows o),'[]'::jsonb),
    'missions', coalesce((select jsonb_agg(jsonb_build_object(
      'mission_id',mb.mission_id,'completers',mb.completers,'participants',mb.participants,'completed_runs',mb.completed_runs,
      'initial_confidence_mean',cal.initial_confidence_mean,'revote_confidence_mean',cal.revote_confidence_mean,
      'changed_count',coalesce(cal.changed_count,0),'revote_count',coalesce(cal.revote_count,0),
      'changed_percent',case when coalesce(cal.revote_count,0)>0 then round(100.0*cal.changed_count/cal.revote_count,1) else null end
    ) order by mb.mission_id) from mission_base mb left join calibration cal using (mission_id)),'[]'::jsonb),
    'feedback', (select jsonb_build_object('n',n,'relevance_mean',relevance_mean,'learning_design_mean',learning_design_mean) from feedback_summary),
    'research_consent', (select jsonb_build_object('consented',consented,'declined',declined,'withdrawn',withdrawn,'unknown',unknown) from consent_summary)
  ) into result
  from assessment_summary a;

  return result;
end;
$$;

revoke all on function public.ten_program_analytics(uuid) from public, anon;
grant execute on function public.ten_program_analytics(uuid) to authenticated;
