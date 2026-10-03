create or replace function public.publish_research_information(target_program_id uuid,new_version text,information text,withdrawal text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.has_program_role(target_program_id,array['program_director']) then raise exception 'Director required' using errcode='42501'; end if;
 if nullif(trim(new_version),'') is null then raise exception 'Version required'; end if;
 perform 1 from public.program_journey_settings where program_id=target_program_id for update;
 if not found then raise exception 'Journey settings required'; end if;
 insert into public.research_information_versions(program_id,version,participant_information,withdrawal_information,created_by) values(target_program_id,trim(new_version),information,withdrawal,auth.uid());
 update public.program_journey_settings set consent_version=trim(new_version),updated_at=now() where program_id=target_program_id;
 insert into public.audit_events(program_id,actor_user_id,event_type,entity_type,entity_id,new_value) values(target_program_id,auth.uid(),'research.information_published','research_information_version',new_version,jsonb_build_object('version',new_version));
end $$;
revoke all on function public.publish_research_information(uuid,text,text,text) from public,anon;
grant execute on function public.publish_research_information(uuid,text,text,text) to authenticated;
revoke insert on public.research_information_versions from authenticated;
create table public.program_release_evidence (
 program_id uuid not null references public.programs(id), gate text not null check(gate in ('sme_review','assessment_validation','rater_calibration','operational_dry_run','role_qa','curriculum_mapping')),
 evidence_url text not null check(evidence_url like 'https://%'), note text not null check(length(trim(note))>=10),
 recorded_by uuid not null references auth.users(id), recorded_at timestamptz not null default now(), primary key(program_id,gate)
);
alter table public.program_release_evidence enable row level security;
revoke all on public.program_release_evidence from anon,authenticated;
grant select,insert,update on public.program_release_evidence to authenticated;
create policy release_evidence_read on public.program_release_evidence for select to authenticated using(private.has_program_role(program_id,array['program_director','assessment_lead','reviewer']));
create policy release_evidence_insert on public.program_release_evidence for insert to authenticated with check(private.has_program_role(program_id,array['program_director']) and recorded_by=(select auth.uid()));
create policy release_evidence_update on public.program_release_evidence for update to authenticated using(private.has_program_role(program_id,array['program_director'])) with check(private.has_program_role(program_id,array['program_director']) and recorded_by=(select auth.uid()));
create or replace function public.ten_pilot_readiness(target_program_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p jsonb; b jsonb; g text; gov public.program_data_governance; v text; educational boolean; research boolean;
begin
 p:=public.ten_pilot_readiness_base(target_program_id);
 b:=coalesce(p->'blockers','[]'::jsonb);
 educational:=coalesce((p->>'education_ready')::boolean,false);
 foreach g in array array['sme_review','assessment_validation','rater_calibration','operational_dry_run','role_qa','curriculum_mapping'] loop
  if not exists(select 1 from public.program_release_evidence where program_id=target_program_id and gate=g) then
    educational:=false; b:=b||jsonb_build_array('Local evidence pending: '||g);
  end if;
 end loop;
 if p->'quality' is null or (coalesce((p->'quality'->>'double_rating_required')::boolean,false) and (p->'quality'->>'double_rating_target_count' is null or nullif(trim(p->'quality'->>'double_rating_selection_rule'),'') is null)) then educational:=false; end if;
 select * into gov from public.program_data_governance where program_id=target_program_id;
 select consent_version into v from public.program_journey_settings where program_id=target_program_id and active;
 research:=coalesce((p->>'research_ready')::boolean,false) and gov.ethics_status='approved' and exists(select 1 from public.research_information_versions where program_id=target_program_id and version=v);
 if gov.ethics_status is distinct from 'approved' then b:=b||jsonb_build_array('Ethics / REC approval pending or inactive'); end if;
 if not exists(select 1 from public.research_information_versions where program_id=target_program_id and version=v) then b:=b||jsonb_build_array('Published Participant Information pending'); end if;
 return p||jsonb_build_object('education_ready',educational,'research_ready',coalesce(research,false),'pilot_locked',educational and coalesce(research,false),'blockers',b);
end $$;
