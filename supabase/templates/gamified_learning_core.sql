-- SEIP Hub Stage 5A — Narrative Gamified Learning Core
-- PostgreSQL / Supabase
-- Depends on foundation_v0_1.sql and existing session/cohort/group authorization helpers.

begin;

create table public.game_characters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  archetype text not null,
  ability_name text not null,
  ability_description text not null,
  sort_order smallint not null check (sort_order > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.game_level_definitions (
  level_no smallint primary key check (level_no between 1 and 4),
  name text not null,
  min_xp integer not null unique check (min_xp >= 0),
  unlock_code text not null unique,
  unlock_description text not null,
  created_at timestamptz not null default now()
);

create table public.learner_game_profiles (
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  learner_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.game_characters(id),
  character_locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cohort_id, learner_id)
);

create table public.game_episodes (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  session_id uuid not null unique references public.sessions(id) on delete cascade,
  episode_number smallint not null check (episode_number between 1 and 4),
  title text not null,
  story_title text,
  teaser text,
  comic_url text,
  video_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'live', 'completed', 'archived')),
  current_mission_order smallint not null default 0 check (current_mission_order >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cohort_id, episode_number),
  check (completed_at is null or started_at is null or completed_at >= started_at)
);

create table public.game_missions (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.game_episodes(id) on delete cascade,
  mission_order smallint not null check (mission_order > 0),
  title text not null,
  mission_type text not null check (mission_type in ('feature_selection','problem_representation','ranked_differential','focused_history','investigation_choice','clinical_decision','reflection','facilitator_only')),
  response_mode text not null default 'individual' check (response_mode in ('individual', 'team', 'none')),
  prompt text,
  config jsonb not null default '{}'::jsonb,
  max_xp integer not null default 0 check (max_xp between 0 and 100),
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (episode_id, mission_order)
);

create table public.game_mission_responses (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.game_missions(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  response jsonb not null default '{}'::jsonb,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed', 'locked')),
  facilitator_feedback text,
  reviewed_by uuid references auth.users(id),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index game_mission_responses_individual_uq on public.game_mission_responses (mission_id, submitted_by) where group_id is null;
create unique index game_mission_responses_group_uq on public.game_mission_responses (mission_id, group_id) where group_id is not null;

create table public.game_xp_events (
  id bigint generated always as identity primary key,
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  episode_id uuid not null references public.game_episodes(id) on delete cascade,
  mission_id uuid references public.game_missions(id) on delete set null,
  learner_id uuid not null references auth.users(id) on delete cascade,
  points integer not null check (points between -100 and 100 and points <> 0),
  source_type text not null check (source_type in ('attendance','comic','mission','participation','reasoning','teamwork','reflection','episode_completion','correction')),
  idempotency_key text not null,
  awarded_by uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (cohort_id, learner_id, idempotency_key)
);

create table public.game_ability_uses (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.game_episodes(id) on delete cascade,
  learner_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.game_characters(id),
  use_number smallint not null default 1 check (use_number between 1 and 2),
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'used', 'cancelled')),
  request_context jsonb not null default '{}'::jsonb,
  resolution text,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  unique (episode_id, learner_id, use_number)
);

create index learner_game_profiles_character_idx on public.learner_game_profiles (character_id);
create index game_episodes_cohort_idx on public.game_episodes (cohort_id, episode_number);
create index game_episodes_status_idx on public.game_episodes (cohort_id, status);
create index game_missions_episode_idx on public.game_missions (episode_id, mission_order);
create index game_mission_responses_mission_idx on public.game_mission_responses (mission_id, submitted_at);
create index game_xp_events_learner_idx on public.game_xp_events (learner_id, cohort_id, created_at desc);
create index game_xp_events_episode_idx on public.game_xp_events (episode_id, learner_id);
create index game_ability_uses_episode_status_idx on public.game_ability_uses (episode_id, status, requested_at);

create trigger learner_game_profiles_set_updated_at before update on public.learner_game_profiles for each row execute function private.set_updated_at();
create trigger game_episodes_set_updated_at before update on public.game_episodes for each row execute function private.set_updated_at();
create trigger game_missions_set_updated_at before update on public.game_missions for each row execute function private.set_updated_at();
create trigger game_mission_responses_set_updated_at before update on public.game_mission_responses for each row execute function private.set_updated_at();

create or replace function private.is_active_learner_in_cohort(target_cohort_id uuid, target_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.cohort_memberships cm where cm.cohort_id = target_cohort_id and cm.user_id = target_user_id and cm.member_type = 'learner' and cm.status = 'active');
$$;

create or replace function private.can_manage_game_episode(target_episode_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.game_episodes ge where ge.id = target_episode_id and private.can_manage_session(ge.session_id));
$$;

create or replace function private.is_group_member(target_group_id uuid, target_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members gm where gm.group_id = target_group_id and gm.user_id = target_user_id);
$$;

create or replace function private.game_total_xp(target_cohort_id uuid, target_user_id uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(gx.points), 0)::integer from public.game_xp_events gx where gx.cohort_id = target_cohort_id and gx.learner_id = target_user_id;
$$;

create or replace function private.game_level_from_xp(total_xp integer)
returns smallint language sql immutable set search_path = '' as $$
  select case when total_xp >= 300 then 4::smallint when total_xp >= 200 then 3::smallint when total_xp >= 100 then 2::smallint else 1::smallint end;
$$;

create or replace function private.validate_game_episode_session()
returns trigger language plpgsql set search_path = '' as $$
declare session_cohort_id uuid;
begin
  select s.cohort_id into session_cohort_id from public.sessions s where s.id = new.session_id;
  if session_cohort_id is null or session_cohort_id <> new.cohort_id then raise exception 'game episode cohort must match session cohort'; end if;
  return new;
end;
$$;
create trigger game_episodes_validate_session before insert or update of session_id, cohort_id on public.game_episodes for each row execute function private.validate_game_episode_session();

create or replace function private.prevent_locked_character_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.character_locked_at is not null and new.character_id <> old.character_id then raise exception 'character selection is locked for this cohort'; end if;
  return new;
end;
$$;
create trigger learner_game_profiles_lock_character before update of character_id on public.learner_game_profiles for each row execute function private.prevent_locked_character_change();

create or replace function private.lock_game_characters_on_episode_live()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'live' and old.status is distinct from 'live' then update public.learner_game_profiles set character_locked_at = coalesce(character_locked_at, now()) where cohort_id = new.cohort_id; end if;
  return new;
end;
$$;
create trigger game_episodes_lock_characters before update of status on public.game_episodes for each row execute function private.lock_game_characters_on_episode_live();

create or replace function private.can_submit_game_mission(target_mission_id uuid, target_group_id uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.game_missions gm join public.game_episodes ge on ge.id = gm.episode_id
    where gm.id = target_mission_id and gm.status = 'published' and ge.status = 'live' and ge.current_mission_order = gm.mission_order
      and private.is_active_learner_in_cohort(ge.cohort_id, auth.uid())
      and ((gm.response_mode = 'individual' and target_group_id is null)
        or (gm.response_mode = 'team' and target_group_id is not null and exists (select 1 from public.groups g where g.id = target_group_id and g.cohort_id = ge.cohort_id and private.is_group_member(g.id, auth.uid()))))
  );
$$;

create or replace function private.can_request_signature_ability(target_episode_id uuid, target_learner_id uuid, target_character_id uuid, target_use_number smallint)
returns boolean language sql stable security definer set search_path = '' as $$
  with episode_context as (
    select ge.cohort_id, ge.episode_number, ge.status from public.game_episodes ge where ge.id = target_episode_id
  ), learner_context as (
    select lgp.character_id, private.game_level_from_xp(private.game_total_xp(lgp.cohort_id, lgp.learner_id)) as level_no
    from public.learner_game_profiles lgp join episode_context ec on ec.cohort_id = lgp.cohort_id where lgp.learner_id = target_learner_id
  )
  select auth.uid() = target_learner_id and exists (
    select 1 from episode_context ec join learner_context lc on true
    where ec.status = 'live' and lc.character_id = target_character_id and private.is_active_learner_in_cohort(ec.cohort_id, target_learner_id)
      and target_use_number between 1 and case when ec.episode_number = 4 and lc.level_no >= 4 then 2 else 1 end
  );
$$;

revoke all on function private.is_active_learner_in_cohort(uuid, uuid) from public, anon;
revoke all on function private.can_manage_game_episode(uuid) from public, anon;
revoke all on function private.is_group_member(uuid, uuid) from public, anon;
revoke all on function private.game_total_xp(uuid, uuid) from public, anon;
revoke all on function private.game_level_from_xp(integer) from public, anon;
revoke all on function private.can_submit_game_mission(uuid, uuid) from public, anon;
revoke all on function private.can_request_signature_ability(uuid, uuid, uuid, smallint) from public, anon;

grant execute on function private.is_active_learner_in_cohort(uuid, uuid) to authenticated;
grant execute on function private.can_manage_game_episode(uuid) to authenticated;
grant execute on function private.is_group_member(uuid, uuid) to authenticated;
grant execute on function private.game_level_from_xp(integer) to authenticated;
grant execute on function private.can_submit_game_mission(uuid, uuid) to authenticated;
grant execute on function private.can_request_signature_ability(uuid, uuid, uuid, smallint) to authenticated;

alter table public.game_characters enable row level security;
alter table public.game_level_definitions enable row level security;
alter table public.learner_game_profiles enable row level security;
alter table public.game_episodes enable row level security;
alter table public.game_missions enable row level security;
alter table public.game_mission_responses enable row level security;
alter table public.game_xp_events enable row level security;
alter table public.game_ability_uses enable row level security;

create policy game_characters_select on public.game_characters for select to authenticated using (true);
create policy game_level_definitions_select on public.game_level_definitions for select to authenticated using (true);

create policy learner_game_profiles_select on public.learner_game_profiles for select to authenticated
using (learner_id = (select auth.uid()) or private.can_manage_cohort(cohort_id) or exists (select 1 from public.cohorts c where c.id = cohort_id and private.has_program_role(c.program_id, array['peer_educator']::text[])));
create policy learner_game_profiles_insert on public.learner_game_profiles for insert to authenticated
with check (learner_id = (select auth.uid()) and private.is_active_learner_in_cohort(cohort_id, learner_id) and exists (select 1 from public.game_characters gc where gc.id = character_id and gc.is_active));
create policy learner_game_profiles_update_own on public.learner_game_profiles for update to authenticated
using (learner_id = (select auth.uid()) and private.is_active_learner_in_cohort(cohort_id, learner_id))
with check (learner_id = (select auth.uid()) and private.is_active_learner_in_cohort(cohort_id, learner_id) and exists (select 1 from public.game_characters gc where gc.id = character_id and gc.is_active));
create policy learner_game_profiles_update_manager on public.learner_game_profiles for update to authenticated
using (private.can_manage_cohort(cohort_id)) with check (private.can_manage_cohort(cohort_id) and exists (select 1 from public.game_characters gc where gc.id = character_id and gc.is_active));

create policy game_episodes_select on public.game_episodes for select to authenticated
using (private.can_manage_session(session_id) or (private.is_cohort_member(cohort_id) and status in ('published','live','completed','archived')));
create policy game_episodes_insert on public.game_episodes for insert to authenticated with check (created_by = (select auth.uid()) and private.can_manage_session(session_id));
create policy game_episodes_update on public.game_episodes for update to authenticated using (private.can_manage_session(session_id)) with check (private.can_manage_session(session_id));
create policy game_episodes_delete on public.game_episodes for delete to authenticated using (private.can_manage_session(session_id));

create policy game_missions_select on public.game_missions for select to authenticated
using (private.can_manage_game_episode(episode_id) or (status = 'published' and exists (select 1 from public.game_episodes ge where ge.id = episode_id and private.is_cohort_member(ge.cohort_id) and ge.status in ('published','live','completed','archived'))));
create policy game_missions_insert on public.game_missions for insert to authenticated with check (private.can_manage_game_episode(episode_id));
create policy game_missions_update on public.game_missions for update to authenticated using (private.can_manage_game_episode(episode_id)) with check (private.can_manage_game_episode(episode_id));
create policy game_missions_delete on public.game_missions for delete to authenticated using (private.can_manage_game_episode(episode_id));

create policy game_mission_responses_select on public.game_mission_responses for select to authenticated
using (submitted_by = (select auth.uid()) or (group_id is not null and private.is_group_member(group_id, (select auth.uid()))) or exists (select 1 from public.game_missions gm where gm.id = mission_id and private.can_manage_game_episode(gm.episode_id)));
create policy game_mission_responses_insert on public.game_mission_responses for insert to authenticated
with check (submitted_by = (select auth.uid()) and private.can_submit_game_mission(mission_id, group_id));
create policy game_mission_responses_update_own on public.game_mission_responses for update to authenticated
using (submitted_by = (select auth.uid()) and status = 'submitted' and private.can_submit_game_mission(mission_id, group_id))
with check (submitted_by = (select auth.uid()) and status = 'submitted' and private.can_submit_game_mission(mission_id, group_id));
create policy game_mission_responses_update_manager on public.game_mission_responses for update to authenticated
using (exists (select 1 from public.game_missions gm where gm.id = mission_id and private.can_manage_game_episode(gm.episode_id)))
with check (exists (select 1 from public.game_missions gm where gm.id = mission_id and private.can_manage_game_episode(gm.episode_id)));

create policy game_xp_events_select on public.game_xp_events for select to authenticated using (learner_id = (select auth.uid()) or private.can_manage_game_episode(episode_id));
create policy game_xp_events_insert on public.game_xp_events for insert to authenticated
with check (awarded_by = (select auth.uid()) and private.can_manage_game_episode(episode_id) and exists (
  select 1 from public.game_episodes ge where ge.id = episode_id and ge.cohort_id = cohort_id and private.is_active_learner_in_cohort(cohort_id, learner_id)
    and (mission_id is null or exists (select 1 from public.game_missions gm where gm.id = mission_id and gm.episode_id = episode_id))
));

create policy game_ability_uses_select on public.game_ability_uses for select to authenticated using (learner_id = (select auth.uid()) or private.can_manage_game_episode(episode_id));
create policy game_ability_uses_insert on public.game_ability_uses for insert to authenticated
with check (learner_id = (select auth.uid()) and status = 'requested' and private.can_request_signature_ability(episode_id, learner_id, character_id, use_number));
create policy game_ability_uses_update_manager on public.game_ability_uses for update to authenticated using (private.can_manage_game_episode(episode_id)) with check (private.can_manage_game_episode(episode_id));

create or replace view public.learner_game_progress_v with (security_invoker = true) as
with totals as (
  select lgp.cohort_id, lgp.learner_id, lgp.character_id, lgp.character_locked_at, coalesce(sum(gx.points), 0)::integer as total_xp
  from public.learner_game_profiles lgp
  left join public.game_xp_events gx on gx.cohort_id = lgp.cohort_id and gx.learner_id = lgp.learner_id
  group by lgp.cohort_id, lgp.learner_id, lgp.character_id, lgp.character_locked_at
)
select t.cohort_id, t.learner_id, t.character_id, gc.slug as character_slug, gc.name as character_name, gc.archetype, gc.ability_name,
  t.total_xp, private.game_level_from_xp(t.total_xp) as level_no, gld.name as level_name, t.character_locked_at
from totals t join public.game_characters gc on gc.id = t.character_id
join public.game_level_definitions gld on gld.level_no = private.game_level_from_xp(t.total_xp);

create or replace function public.get_group_game_totals(target_cohort_id uuid)
returns table (group_id uuid, group_name text, total_xp integer, member_count integer)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, coalesce(sum(gx.points), 0)::integer, count(distinct gm.user_id)::integer
  from public.groups g
  left join public.group_members gm on gm.group_id = g.id
  left join public.game_xp_events gx on gx.cohort_id = g.cohort_id and gx.learner_id = gm.user_id
  where g.cohort_id = target_cohort_id and (private.is_cohort_member(target_cohort_id) or private.can_manage_cohort(target_cohort_id) or private.is_platform_admin())
  group by g.id, g.name order by coalesce(sum(gx.points), 0) desc, g.name asc;
$$;
revoke all on function public.get_group_game_totals(uuid) from public, anon;
grant execute on function public.get_group_game_totals(uuid) to authenticated;

insert into public.game_level_definitions (level_no, name, min_xp, unlock_code, unlock_description) values
(1,'Recruit',0,'signature_ability','Signature Ability once per Episode.'),
(2,'Investigator',100,'second_chance','Second Chance once during the whole program when facilitator-permitted.'),
(3,'Strategist',200,'ability_share','Ability Share once during the whole program.'),
(4,'Master',300,'final_mission_mastery','Signature Ability may be used twice in Episode IV.')
on conflict (level_no) do update set name = excluded.name, min_xp = excluded.min_xp, unlock_code = excluded.unlock_code, unlock_description = excluded.unlock_description;

insert into public.game_characters (slug, name, archetype, ability_name, ability_description, sort_order) values
('ibn-sina','Ibn Sina','The Synthesizer','Synthesis','Request a structured summary of already revealed key positives, key negatives, risk factors and unresolved findings.',1),
('jabir-ibn-hayyan','Jabir ibn Hayyan','The Experimentalist','Test the Hypothesis','Before committing to an investigation, ask what clinical question that test would answer; then keep or revise the choice.',2),
('al-razi','Al-Razi','The Observer','Reveal a Clue','Reveal one additional clinically relevant clue built into the scenario but not yet disclosed.',3),
('hippocrates','Hippocrates','The Clinical Guardian','Red Flag','Ask whether any information already available should change the urgency of assessment. No diagnosis or solution is given.',4),
('gregory-house','Dr. Gregory House','The Diagnostic Challenger','Challenge the Diagnosis','After declaring a leading diagnosis, reveal one existing finding that does not fit perfectly, prompting maintenance or revision.',5),
('stephen-strange','Dr. Stephen Strange','The Time Keeper','Time Reversal','Once per Episode, reverse the most recent decision before its consequence or feedback is revealed.',6),
('tony-tony-chopper','Tony Tony Chopper','The Team Medic','Call the Crew','Request a 30–60 second second opinion from another learner or team.',7),
('senku-ishigami','Senku Ishigami','The Evidence Scientist','Evidence Check','Request one concise scientific principle relevant to judging a proposed decision, without revealing the case answer.',8),
('sherlock-holmes','Sherlock Holmes','The Deductionist','Connect the Dots','Select two known findings and ask whether their clinical connection is strong, possible or probably unrelated.',9),
('baymax','Baymax','The Safety Guardian','Safety Scan','Ask whether an immediate patient-safety concern is present in the current information; identify the concern category, not the solution.',10)
on conflict (slug) do update set name = excluded.name, archetype = excluded.archetype, ability_name = excluded.ability_name, ability_description = excluded.ability_description, sort_order = excluded.sort_order, is_active = true;

revoke all on public.game_characters, public.game_level_definitions, public.learner_game_profiles, public.game_episodes, public.game_missions, public.game_mission_responses, public.game_xp_events, public.game_ability_uses from anon;
grant select on public.game_characters, public.game_level_definitions to authenticated;
grant select, insert, update on public.learner_game_profiles to authenticated;
grant select, insert, update, delete on public.game_episodes to authenticated;
grant select, insert, update, delete on public.game_missions to authenticated;
grant select, insert, update on public.game_mission_responses to authenticated;
grant select, insert on public.game_xp_events to authenticated;
grant select, insert, update on public.game_ability_uses to authenticated;
grant select on public.learner_game_progress_v to authenticated;

commit;
