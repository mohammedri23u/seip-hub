
create or replace function private.journey_missions_unlocked(target_session_id uuid,target_user_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(
 select 1 from public.sessions se join public.cohorts c on c.id=se.cohort_id
 join public.cohort_memberships cm on cm.cohort_id=c.id and cm.user_id=target_user_id and cm.member_type='learner' and cm.status in ('active','completed')
 join public.program_journey_settings js on js.program_id=c.program_id and js.active
 join public.learner_journey_onboarding o on o.program_id=c.program_id and o.learner_id=target_user_id
 cross join lateral private.assigned_assessment_pair(c.id,target_user_id) ap
 where se.id=target_session_id and o.orientation_completed_at is not null
 and o.arrival_completed_at is not null and o.guide_key is not null
 and exists(select 1 from public.assessment_attempts aa where aa.assessment_id=ap.pre_assessment_id and aa.learner_id=target_user_id and aa.status in ('submitted','late'))
 and not exists(
  select 1 from unnest(js.required_mission_ids) with ordinality prior(mission_id,n)
  where prior.n<array_position(js.required_mission_ids,coalesce((select r.mission_id from public.ten_runs r where r.session_id=se.id order by r.created_at desc limit 1),substring(se.join_code from 'M0[1-4]')))
  and not exists(select 1 from public.ten_codex tc join public.ten_runs tr on tr.id=tc.run_id join public.sessions ts on ts.id=tr.session_id where tc.user_id=target_user_id and ts.cohort_id=c.id and tr.mission_id=prior.mission_id)
 ));
$$;
create or replace function public.allocate_assessment_sequence(target_cohort uuid,target_learner uuid,sequence text) returns void language plpgsql security definer set search_path='' as $$
declare p uuid; g uuid;
begin
 select program_id into p from public.cohorts where id=target_cohort;
 if auth.uid() is null or not private.has_program_role(p,array['program_director','assessment_lead']) then raise exception 'Assessment lead required' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_learner::text||target_cohort::text,0));
 if not exists(select 1 from public.cohort_memberships where cohort_id=target_cohort and user_id=target_learner and member_type='learner' and status='active') then raise exception 'Active learner required'; end if;
 if exists(select 1 from public.assessment_attempts aa join public.assessments a on a.id=aa.assessment_id where a.cohort_id=target_cohort and aa.learner_id=target_learner) then raise exception 'Allocation locked after assessment starts'; end if;
 select group_id into g from public.program_assessment_sequences where cohort_id=target_cohort and sequence_code=sequence and active;
 if g is null then raise exception 'Configured sequence required'; end if;
 delete from public.group_members gm using public.program_assessment_sequences s where gm.group_id=s.group_id and s.cohort_id=target_cohort and gm.user_id=target_learner;
 insert into public.group_members(group_id,user_id) values(g,target_learner);
 insert into public.audit_events(program_id,actor_user_id,event_type,entity_type,entity_id,new_value) values(p,auth.uid(),'assessment.allocated','learner',target_learner::text,jsonb_build_object('sequence',sequence,'cohort',target_cohort));
end $$;
revoke all on function public.allocate_assessment_sequence(uuid,uuid,text) from public,anon;
grant execute on function public.allocate_assessment_sequence(uuid,uuid,text) to authenticated;
create or replace function private.lock_sequence_group_membership() returns trigger language plpgsql security definer set search_path='' as $$
declare g uuid; u uuid; c uuid;
begin
 if tg_op='DELETE' then g:=old.group_id;u:=old.user_id;else g:=new.group_id;u:=new.user_id;end if;
 select cohort_id into c from public.program_assessment_sequences where group_id=g and active limit 1;
 if c is not null then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text||c::text,0));
  if exists(select 1 from public.assessment_attempts aa join public.assessments a on a.id=aa.assessment_id where a.cohort_id=c and aa.learner_id=u) then raise exception 'Assessment allocation is immutable after start'; end if;
  if tg_op='INSERT' and exists(select 1 from public.group_members gm join public.program_assessment_sequences s on s.group_id=gm.group_id where s.cohort_id=c and s.active and gm.user_id=u and gm.group_id<>g) then raise exception 'One AB/BA allocation per learner'; end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger assessment_allocation_membership_guard before insert or delete on public.group_members for each row execute function private.lock_sequence_group_membership();
revoke update on public.live_activities,public.live_activity_rounds from authenticated;
grant update(title,stem,max_response_seconds) on public.live_activities to authenticated;

