
create table public.fce_stations(id uuid primary key default gen_random_uuid(),program_id uuid not null references public.programs(id),code text not null,version text not null,title text not null,core boolean not null default false,candidate_instructions text not null,examiner_package jsonb not null,source_url text not null,review_status text not null default 'candidate' check(review_status in ('candidate','approved','retired')),unique(program_id,code,version));
create table public.fce_encounters(id uuid primary key default gen_random_uuid(),station_id uuid not null references public.fce_stations(id),cohort_id uuid not null references public.cohorts(id),learner_id uuid not null references auth.users(id),examiner_id uuid not null references auth.users(id),second_examiner_id uuid references auth.users(id),sp_code text not null,scheduled_at timestamptz,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),check(second_examiner_id is null or second_examiner_id<>examiner_id),check(learner_id<>examiner_id and (second_examiner_id is null or learner_id<>second_examiner_id)));
create table public.fce_ratings(id uuid primary key default gen_random_uuid(),encounter_id uuid not null references public.fce_encounters(id),examiner_id uuid not null references auth.users(id),scores jsonb not null,global_rating integer not null check(global_rating between 1 and 5),safety_flags text[] not null default '{}',deviation_note text,encounter_seconds integer not null check(encounter_seconds between 0 and 3600),reasoning_seconds integer not null check(reasoning_seconds between 0 and 3600),submitted_at timestamptz not null default now(),unique(encounter_id,examiner_id));
create table public.fce_moderations(encounter_id uuid primary key references public.fce_encounters(id),resolved_scores jsonb not null,rationale text not null check(length(trim(rationale))>=10),moderator_id uuid not null references auth.users(id),resolved_at timestamptz not null default now());
alter table public.fce_stations enable row level security;
alter table public.fce_encounters enable row level security;
alter table public.fce_ratings enable row level security;
alter table public.fce_moderations enable row level security;
revoke all on public.fce_stations,public.fce_encounters,public.fce_ratings,public.fce_moderations from anon,authenticated;
grant select on public.fce_stations,public.fce_encounters,public.fce_ratings,public.fce_moderations to authenticated;
create policy fce_stations_staff on public.fce_stations for select to authenticated using(private.has_program_role(program_id,array['program_director','assessment_lead','reviewer']));
create policy fce_encounters_staff on public.fce_encounters for select to authenticated using(examiner_id=(select auth.uid()) or second_examiner_id=(select auth.uid()) or exists(select 1 from public.fce_stations s where s.id=station_id and private.has_program_role(s.program_id,array['program_director','assessment_lead'])));
create policy fce_ratings_independent on public.fce_ratings for select to authenticated using(examiner_id=(select auth.uid()) or exists(select 1 from public.fce_encounters e join public.fce_stations s on s.id=e.station_id where e.id=encounter_id and private.has_program_role(s.program_id,array['program_director','assessment_lead'])));
create policy fce_moderations_lead on public.fce_moderations for select to authenticated using(exists(select 1 from public.fce_encounters e join public.fce_stations s on s.id=e.station_id where e.id=encounter_id and private.has_program_role(s.program_id,array['program_director','assessment_lead'])));
create or replace function private.valid_fce_scores(scores jsonb) returns boolean language sql immutable set search_path='' as $$
 select jsonb_typeof(scores)='object' and (select count(*) from jsonb_object_keys(scores))=10 and not exists(select 1 from unnest(array['H1','H2','PE1','PE2','PE3','PE4','PE5','PR','DDx','JUST']) k where not(scores ? k) or jsonb_typeof(scores->k)<>'number' or (scores->>k) not in ('0','1','2'));
$$;
alter table public.fce_ratings add constraint fce_scores_valid check(private.valid_fce_scores(scores));
alter table public.fce_moderations add constraint fce_resolution_valid check(private.valid_fce_scores(resolved_scores));
create or replace function public.schedule_fce(target_station uuid,target_cohort uuid,target_learner uuid,examiner uuid,second_examiner uuid,sp text,scheduled timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
declare p uuid; e uuid; u uuid;
begin
 select program_id into p from public.fce_stations where id=target_station;
 if auth.uid() is null or not private.has_program_role(p,array['program_director','assessment_lead']) then raise exception 'Assessment lead required' using errcode='42501'; end if;
 if not exists(select 1 from public.cohort_memberships cm join public.cohorts c on c.id=cm.cohort_id where c.id=target_cohort and c.program_id=p and cm.user_id=target_learner and cm.member_type='learner' and cm.status='active') then raise exception 'Active learner in matching cohort required'; end if;
 foreach u in array array[examiner,second_examiner] loop
  if u is not null and not exists(select 1 from public.program_memberships where program_id=p and user_id=u and status='active' and role in ('program_director','assessment_lead','reviewer')) then raise exception 'Assigned examiner must hold an active rater role'; end if;
 end loop;
 if examiner is null or nullif(trim(sp),'') is null then raise exception 'Examiner and coded SP required'; end if;
 insert into public.fce_encounters(station_id,cohort_id,learner_id,examiner_id,second_examiner_id,sp_code,scheduled_at,created_by) values(target_station,target_cohort,target_learner,examiner,second_examiner,sp,scheduled,auth.uid()) returning id into e;
 insert into public.audit_events(program_id,actor_user_id,event_type,entity_type,entity_id) values(p,auth.uid(),'fce.scheduled','fce_encounter',e::text);
 return e;
end $$;
create or replace function public.submit_fce_rating(target_encounter uuid,domain_scores jsonb,global_score integer,flags text[],deviation text,observed_seconds integer,post_seconds integer) returns uuid language plpgsql security definer set search_path='' as $$
declare e public.fce_encounters; p uuid; r uuid;
begin
 select * into e from public.fce_encounters where id=target_encounter for update;
 select program_id into p from public.fce_stations where id=e.station_id;
 if e.id is null or auth.uid() is null or not private.has_program_role(p,array['program_director','assessment_lead','reviewer']) or (auth.uid()<>e.examiner_id and auth.uid() is distinct from e.second_examiner_id) then raise exception 'Assigned examiner required' using errcode='42501'; end if;
 if exists(select 1 from public.fce_moderations where encounter_id=e.id) then raise exception 'Encounter already moderated'; end if;
 insert into public.fce_ratings(encounter_id,examiner_id,scores,global_rating,safety_flags,deviation_note,encounter_seconds,reasoning_seconds) values(e.id,auth.uid(),domain_scores,global_score,coalesce(flags,'{}'),deviation,observed_seconds,post_seconds) returning id into r;
 insert into public.audit_events(program_id,actor_user_id,event_type,entity_type,entity_id) values(p,auth.uid(),'fce.rating_submitted','fce_rating',r::text);
 return r;
end $$;
create or replace function public.moderate_fce(target_encounter uuid,domain_scores jsonb,reason text) returns void language plpgsql security definer set search_path='' as $$
declare e public.fce_encounters; p uuid; n integer;
begin
 select * into e from public.fce_encounters where id=target_encounter for update;
 select program_id into p from public.fce_stations where id=e.station_id;
 if e.id is null or auth.uid() is null or not private.has_program_role(p,array['program_director','assessment_lead']) then raise exception 'Assessment lead required' using errcode='42501'; end if;
 select count(*) into n from public.fce_ratings where encounter_id=e.id;
 if n < (case when e.second_examiner_id is null then 1 else 2 end) then raise exception 'All assigned independent ratings required'; end if;
 insert into public.fce_moderations(encounter_id,resolved_scores,rationale,moderator_id) values(e.id,domain_scores,reason,auth.uid());
 insert into public.audit_events(program_id,actor_user_id,event_type,entity_type,entity_id) values(p,auth.uid(),'fce.moderated','fce_encounter',e.id::text);
end $$;
revoke all on function public.schedule_fce(uuid,uuid,uuid,uuid,uuid,text,timestamptz),public.submit_fce_rating(uuid,jsonb,integer,text[],text,integer,integer),public.moderate_fce(uuid,jsonb,text) from public,anon;
grant execute on function public.schedule_fce(uuid,uuid,uuid,uuid,uuid,text,timestamptz),public.submit_fce_rating(uuid,jsonb,integer,text[],text,integer,integer),public.moderate_fce(uuid,jsonb,text) to authenticated;
create index fce_encounters_station on public.fce_encounters(station_id);
create index fce_encounters_cohort on public.fce_encounters(cohort_id);
create index fce_encounters_learner on public.fce_encounters(learner_id);
create index fce_encounters_examiner on public.fce_encounters(examiner_id);
create index fce_encounters_second on public.fce_encounters(second_examiner_id);

