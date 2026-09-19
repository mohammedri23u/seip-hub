
-- Preserve immutable independent scores; make moderation and finalization atomic.
create or replace function public.resolve_human_moderation(target_case uuid, score numeric, note text)
returns void language plpgsql security definer set search_path='' as $$
declare m public.moderation_cases; h public.human_reviews;
begin
 select * into m from public.moderation_cases where id=target_case for update;
 if auth.uid() is null or m.id is null or not private.can_finalize_response(m.response_id) then raise exception 'Assessment lead required' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(m.response_id::text,0));
 select * into h from public.human_reviews where id=m.human_review_id;
 if m.status not in ('open','in_review') or h.status is distinct from 'submitted' or score is null or score::text in ('NaN','Infinity','-Infinity') or score<0 or score>h.max_score or length(trim(coalesce(note,'')))<10 then raise exception 'Complete valid moderation required'; end if;
 update public.moderation_cases set status='resolved',resolved_by=auth.uid(),resolved_score=score,resolution_note=note,resolved_at=now() where id=m.id;
 insert into public.final_score_decisions(response_id,decision_source,human_review_id,moderation_case_id,final_score,max_score,rationale,decided_by)
 values(m.response_id,'moderation',h.id,m.id,score,h.max_score,note,auth.uid())
 on conflict(response_id) do update set decision_source='moderation',human_review_id=excluded.human_review_id,moderation_case_id=excluded.moderation_case_id,final_score=excluded.final_score,max_score=excluded.max_score,rationale=excluded.rationale,decided_by=excluded.decided_by,updated_at=now();
 insert into public.audit_events(actor_user_id,event_type,entity_type,entity_id) values(auth.uid(),'grading.moderation_finalized','moderation_case',m.id::text);
end $$;
revoke all on function public.resolve_human_moderation(uuid,numeric,text) from public,anon;
grant execute on function public.resolve_human_moderation(uuid,numeric,text) to authenticated;
drop trigger final_score_disagreement_guard on public.final_score_decisions;
create trigger final_score_disagreement_guard before insert or update on public.final_score_decisions for each row execute function private.check_human_disagreement();

-- Membership changes must not evade the allocation lock through UPDATE.
create or replace function private.guard_sequence_member_update() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (new.group_id,new.user_id) is distinct from (old.group_id,old.user_id) and exists(select 1 from public.program_assessment_sequences where group_id in (old.group_id,new.group_id) and active) then
 raise exception 'Use allocate_assessment_sequence to change allocation'; end if;
 return new;
end $$;
create trigger sequence_member_update_guard before update on public.group_members for each row execute function private.guard_sequence_member_update();

-- Bind the submitted choice to the version actually displayed.
create or replace function public.record_versioned_research_consent(target_program_id uuid,decision text,expected_version text,acknowledged boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_version text;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select consent_version into current_version from public.program_journey_settings where program_id=target_program_id and active for share;
 if expected_version is distinct from current_version or current_version is null then raise exception 'Information version changed; read the current version'; end if;
 if decision='granted' and acknowledged is distinct from true then raise exception 'Explicit acknowledgement required'; end if;
 return public.record_research_consent(target_program_id,decision);
end $$;
revoke all on function public.record_versioned_research_consent(uuid,text,text,boolean) from public,anon;
grant execute on function public.record_versioned_research_consent(uuid,text,text,boolean) to authenticated;

create or replace function public.program_completion_settings(target_program uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_program_role(target_program,array['program_director','assessment_lead']) then raise exception 'Program staff required' using errcode='42501'; end if;
 return (select jsonb_build_object('minimum_attended_sessions',minimum_attended_sessions,'require_feedback',require_feedback,'certificate_title',certificate_title,'required_mission_ids',required_mission_ids) from public.program_journey_settings where program_id=target_program);
end $$;
create or replace function public.save_program_completion_settings(target_program uuid,minimum_sessions integer,feedback_required boolean,title text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_program_role(target_program,array['program_director']) then raise exception 'Director required' using errcode='42501'; end if;
 if minimum_sessions is null or minimum_sessions<0 or minimum_sessions>4 or feedback_required is null or nullif(trim(title),'') is null then raise exception 'Valid completion requirements required'; end if;
 update public.program_journey_settings set minimum_attended_sessions=minimum_sessions,require_feedback=feedback_required,certificate_title=trim(title),updated_at=now() where program_id=target_program;
 if not found then raise exception 'Journey configuration not found'; end if;
 insert into public.audit_events(program_id,actor_user_id,event_type,entity_type,entity_id,new_value) values(target_program,auth.uid(),'program.completion_settings','program',target_program::text,jsonb_build_object('minimum_sessions',minimum_sessions,'require_feedback',feedback_required,'certificate_title',trim(title)));
end $$;
revoke all on function public.program_completion_settings(uuid),public.save_program_completion_settings(uuid,integer,boolean,text) from public,anon;
grant execute on function public.program_completion_settings(uuid),public.save_program_completion_settings(uuid,integer,boolean,text) to authenticated;

create or replace function private.guard_research_consent() returns trigger language plpgsql security definer set search_path='' as $$
declare g public.program_data_governance; v text;
begin
 select * into g from public.program_data_governance where program_id=new.program_id;
 select consent_version into v from public.program_journey_settings where program_id=new.program_id and active;
 if new.status='granted' then
  if g.ethics_status is distinct from 'approved' or g.retention_days is null or nullif(trim(g.data_controller_contact),'') is null or coalesce(g.privacy_notice_url,'') not like 'https://%' then raise exception 'Research consent is pending approved information and ethics governance'; end if;
  if new.policy_version is distinct from v or not exists(select 1 from public.research_information_versions where program_id=new.program_id and version=v) then raise exception 'Published current participant information required'; end if;
  if new.learner_id is distinct from auth.uid() or new.recorded_by is distinct from auth.uid() then raise exception 'Research consent must be the participant own explicit choice'; end if;
 end if;
 return new;
end $$;

