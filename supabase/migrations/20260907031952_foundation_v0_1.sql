-- SEIP Hub Foundation v0.1
-- PostgreSQL / Supabase

begin;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  student_id text unique,
  avatar_url text,
  status text not null default 'active' check (status in ('pending', 'active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'archived')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_memberships (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('program_director', 'assessment_lead', 'reviewer', 'peer_educator', 'learner')),
  status text not null default 'active' check (status in ('invited', 'active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, user_id, role)
);

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, name),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.cohort_memberships (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_type text not null check (member_type in ('learner', 'peer_educator', 'reviewer', 'faculty', 'staff')),
  status text not null default 'active' check (status in ('invited', 'active', 'inactive', 'completed')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cohort_id, user_id, member_type)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cohort_id, name)
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.learning_objectives (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  domain text,
  competency text,
  status text not null default 'active' check (status in ('draft', 'active', 'retired')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, code)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  title text not null,
  description text,
  scheduled_at timestamptz,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'live', 'completed', 'cancelled')),
  join_code text unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.session_facilitators (
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  facilitator_role text not null default 'facilitator' check (facilitator_role in ('lead', 'facilitator', 'observer')),
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table public.session_learning_objectives (
  session_id uuid not null references public.sessions(id) on delete cascade,
  learning_objective_id uuid not null references public.learning_objectives(id) on delete cascade,
  weight numeric(6,3) check (weight is null or (weight >= 0 and weight <= 100)),
  created_at timestamptz not null default now(),
  primary key (session_id, learning_objective_id)
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  learner_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('present', 'late', 'excused', 'absent')),
  method text not null default 'manual' check (method in ('manual', 'qr', 'code')),
  joined_at timestamptz,
  left_at timestamptz,
  verified_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, learner_id),
  check (left_at is null or joined_at is null or left_at >= joined_at)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  program_id uuid references public.programs(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  occurred_at timestamptz not null default now()
);

create index program_memberships_user_idx on public.program_memberships (user_id, status);
create index program_memberships_program_idx on public.program_memberships (program_id, status);
create index cohort_memberships_user_idx on public.cohort_memberships (user_id, status);
create index cohort_memberships_cohort_idx on public.cohort_memberships (cohort_id, status);
create index sessions_cohort_idx on public.sessions (cohort_id, scheduled_at);
create index attendance_session_idx on public.attendance_records (session_id, status);
create index attendance_learner_idx on public.attendance_records (learner_id, session_id);
create index learning_objectives_program_idx on public.learning_objectives (program_id, status);
create index audit_events_program_time_idx on public.audit_events (program_id, occurred_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger programs_set_updated_at before update on public.programs
for each row execute function private.set_updated_at();
create trigger program_memberships_set_updated_at before update on public.program_memberships
for each row execute function private.set_updated_at();
create trigger cohorts_set_updated_at before update on public.cohorts
for each row execute function private.set_updated_at();
create trigger cohort_memberships_set_updated_at before update on public.cohort_memberships
for each row execute function private.set_updated_at();
create trigger groups_set_updated_at before update on public.groups
for each row execute function private.set_updated_at();
create trigger learning_objectives_set_updated_at before update on public.learning_objectives
for each row execute function private.set_updated_at();
create trigger sessions_set_updated_at before update on public.sessions
for each row execute function private.set_updated_at();
create trigger attendance_records_set_updated_at before update on public.attendance_records
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and exists (
       select 1 from public.platform_admins pa where pa.user_id = auth.uid()
     );
$$;

create or replace function private.is_program_member(target_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.program_memberships pm
       where pm.program_id = target_program_id
         and pm.user_id = auth.uid()
         and pm.status = 'active'
     );
$$;

create or replace function private.has_program_role(target_program_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and (
       private.is_platform_admin()
       or exists (
         select 1
         from public.program_memberships pm
         where pm.program_id = target_program_id
           and pm.user_id = auth.uid()
           and pm.status = 'active'
           and pm.role = any(allowed_roles)
       )
     );
$$;

create or replace function private.is_cohort_member(target_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.cohort_memberships cm
       where cm.cohort_id = target_cohort_id
         and cm.user_id = auth.uid()
         and cm.status in ('active', 'completed')
     );
$$;

create or replace function private.can_manage_cohort(target_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.cohorts c
    where c.id = target_cohort_id
      and private.has_program_role(c.program_id, array['program_director']::text[])
  );
$$;

create or replace function private.can_manage_session(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and (
       private.is_platform_admin()
       or exists (
         select 1
         from public.sessions s
         join public.cohorts c on c.id = s.cohort_id
         where s.id = target_session_id
           and private.has_program_role(c.program_id, array['program_director']::text[])
       )
       or exists (
         select 1
         from public.session_facilitators sf
         where sf.session_id = target_session_id
           and sf.user_id = auth.uid()
       )
     );
$$;

create or replace function private.can_view_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and (
       auth.uid() = target_user_id
       or private.is_platform_admin()
       or exists (
         select 1
         from public.program_memberships mine
         join public.program_memberships theirs on theirs.program_id = mine.program_id
         where mine.user_id = auth.uid()
           and mine.status = 'active'
           and mine.role in ('program_director', 'assessment_lead', 'reviewer', 'peer_educator')
           and theirs.user_id = target_user_id
           and theirs.status = 'active'
       )
     );
$$;

revoke all on function private.is_platform_admin() from public, anon;
revoke all on function private.is_program_member(uuid) from public, anon;
revoke all on function private.has_program_role(uuid, text[]) from public, anon;
revoke all on function private.is_cohort_member(uuid) from public, anon;
revoke all on function private.can_manage_cohort(uuid) from public, anon;
revoke all on function private.can_manage_session(uuid) from public, anon;
revoke all on function private.can_view_profile(uuid) from public, anon;

grant usage on schema private to authenticated;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_program_member(uuid) to authenticated;
grant execute on function private.has_program_role(uuid, text[]) to authenticated;
grant execute on function private.is_cohort_member(uuid) to authenticated;
grant execute on function private.can_manage_cohort(uuid) to authenticated;
grant execute on function private.can_manage_session(uuid) to authenticated;
grant execute on function private.can_view_profile(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.programs enable row level security;
alter table public.program_memberships enable row level security;
alter table public.cohorts enable row level security;
alter table public.cohort_memberships enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.learning_objectives enable row level security;
alter table public.sessions enable row level security;
alter table public.session_facilitators enable row level security;
alter table public.session_learning_objectives enable row level security;
alter table public.attendance_records enable row level security;
alter table public.audit_events enable row level security;

-- Profiles
create policy profiles_select on public.profiles for select to authenticated
using (private.can_view_profile(id));
create policy profiles_update_own on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Platform admins: readable only by the current admin row/admins; no client-side writes.
create policy platform_admins_select on public.platform_admins for select to authenticated
using (user_id = (select auth.uid()) or private.is_platform_admin());

-- Programs
create policy programs_select on public.programs for select to authenticated
using (private.is_program_member(id) or private.is_platform_admin());
create policy programs_insert on public.programs for insert to authenticated
with check (private.is_platform_admin() and created_by = (select auth.uid()));
create policy programs_update on public.programs for update to authenticated
using (private.has_program_role(id, array['program_director']::text[]))
with check (private.has_program_role(id, array['program_director']::text[]));
create policy programs_delete on public.programs for delete to authenticated
using (private.is_platform_admin());

-- Program memberships
create policy program_memberships_select on public.program_memberships for select to authenticated
using (
  user_id = (select auth.uid())
  or private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[])
);
create policy program_memberships_insert on public.program_memberships for insert to authenticated
with check (private.has_program_role(program_id, array['program_director']::text[]));
create policy program_memberships_update on public.program_memberships for update to authenticated
using (private.has_program_role(program_id, array['program_director']::text[]))
with check (private.has_program_role(program_id, array['program_director']::text[]));
create policy program_memberships_delete on public.program_memberships for delete to authenticated
using (private.has_program_role(program_id, array['program_director']::text[]));

-- Cohorts
create policy cohorts_select on public.cohorts for select to authenticated
using (private.is_program_member(program_id) or private.is_platform_admin());
create policy cohorts_insert on public.cohorts for insert to authenticated
with check (
  created_by = (select auth.uid())
  and private.has_program_role(program_id, array['program_director']::text[])
);
create policy cohorts_update on public.cohorts for update to authenticated
using (private.has_program_role(program_id, array['program_director']::text[]))
with check (private.has_program_role(program_id, array['program_director']::text[]));
create policy cohorts_delete on public.cohorts for delete to authenticated
using (private.has_program_role(program_id, array['program_director']::text[]));

-- Cohort memberships
create policy cohort_memberships_select on public.cohort_memberships for select to authenticated
using (
  user_id = (select auth.uid())
  or private.can_manage_cohort(cohort_id)
  or exists (
    select 1 from public.cohorts c
    where c.id = cohort_id
      and private.has_program_role(c.program_id, array['assessment_lead', 'reviewer', 'peer_educator']::text[])
  )
);
create policy cohort_memberships_insert on public.cohort_memberships for insert to authenticated
with check (private.can_manage_cohort(cohort_id));
create policy cohort_memberships_update on public.cohort_memberships for update to authenticated
using (private.can_manage_cohort(cohort_id))
with check (private.can_manage_cohort(cohort_id));
create policy cohort_memberships_delete on public.cohort_memberships for delete to authenticated
using (private.can_manage_cohort(cohort_id));

-- Groups
create policy groups_select on public.groups for select to authenticated
using (
  private.is_cohort_member(cohort_id)
  or private.can_manage_cohort(cohort_id)
  or exists (
    select 1 from public.cohorts c
    where c.id = cohort_id
      and private.has_program_role(c.program_id, array['peer_educator', 'assessment_lead', 'reviewer']::text[])
  )
);
create policy groups_insert on public.groups for insert to authenticated
with check (private.can_manage_cohort(cohort_id));
create policy groups_update on public.groups for update to authenticated
using (private.can_manage_cohort(cohort_id))
with check (private.can_manage_cohort(cohort_id));
create policy groups_delete on public.groups for delete to authenticated
using (private.can_manage_cohort(cohort_id));

-- Group members
create policy group_members_select on public.group_members for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.groups g
    join public.cohorts c on c.id = g.cohort_id
    where g.id = group_id
      and private.has_program_role(c.program_id, array['program_director', 'peer_educator']::text[])
  )
);
create policy group_members_insert on public.group_members for insert to authenticated
with check (
  exists (
    select 1 from public.groups g
    where g.id = group_id and private.can_manage_cohort(g.cohort_id)
  )
);
create policy group_members_delete on public.group_members for delete to authenticated
using (
  exists (
    select 1 from public.groups g
    where g.id = group_id and private.can_manage_cohort(g.cohort_id)
  )
);

-- Learning objectives
create policy learning_objectives_select on public.learning_objectives for select to authenticated
using (private.is_program_member(program_id) or private.is_platform_admin());
create policy learning_objectives_insert on public.learning_objectives for insert to authenticated
with check (
  created_by = (select auth.uid())
  and private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[])
);
create policy learning_objectives_update on public.learning_objectives for update to authenticated
using (private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[]))
with check (private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[]));
create policy learning_objectives_delete on public.learning_objectives for delete to authenticated
using (private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[]));

-- Sessions
create policy sessions_select on public.sessions for select to authenticated
using (
  private.is_cohort_member(cohort_id)
  or private.can_manage_cohort(cohort_id)
  or exists (
    select 1 from public.cohorts c
    where c.id = cohort_id and private.is_program_member(c.program_id)
  )
);
create policy sessions_insert on public.sessions for insert to authenticated
with check (created_by = (select auth.uid()) and private.can_manage_cohort(cohort_id));
create policy sessions_update on public.sessions for update to authenticated
using (private.can_manage_cohort(cohort_id))
with check (private.can_manage_cohort(cohort_id));
create policy sessions_delete on public.sessions for delete to authenticated
using (private.can_manage_cohort(cohort_id));

-- Session facilitators
create policy session_facilitators_select on public.session_facilitators for select to authenticated
using (
  user_id = (select auth.uid())
  or private.can_manage_session(session_id)
  or exists (
    select 1 from public.sessions s
    join public.cohorts c on c.id = s.cohort_id
    where s.id = session_id and private.is_program_member(c.program_id)
  )
);
create policy session_facilitators_insert on public.session_facilitators for insert to authenticated
with check (
  exists (
    select 1 from public.sessions s
    where s.id = session_id and private.can_manage_cohort(s.cohort_id)
  )
);
create policy session_facilitators_update on public.session_facilitators for update to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = session_id and private.can_manage_cohort(s.cohort_id)
  )
)
with check (
  exists (
    select 1 from public.sessions s
    where s.id = session_id and private.can_manage_cohort(s.cohort_id)
  )
);
create policy session_facilitators_delete on public.session_facilitators for delete to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = session_id and private.can_manage_cohort(s.cohort_id)
  )
);

-- Session learning objectives
create policy session_learning_objectives_select on public.session_learning_objectives for select to authenticated
using (
  exists (
    select 1 from public.sessions s
    join public.cohorts c on c.id = s.cohort_id
    where s.id = session_id
      and (private.is_program_member(c.program_id) or private.is_platform_admin())
  )
);
create policy session_learning_objectives_insert on public.session_learning_objectives for insert to authenticated
with check (
  exists (
    select 1
    from public.sessions s
    join public.cohorts c on c.id = s.cohort_id
    join public.learning_objectives lo on lo.id = learning_objective_id
    where s.id = session_id
      and lo.program_id = c.program_id
      and private.has_program_role(c.program_id, array['program_director', 'assessment_lead']::text[])
  )
);
create policy session_learning_objectives_update on public.session_learning_objectives for update to authenticated
using (
  exists (
    select 1 from public.sessions s
    join public.cohorts c on c.id = s.cohort_id
    where s.id = session_id
      and private.has_program_role(c.program_id, array['program_director', 'assessment_lead']::text[])
  )
)
with check (
  exists (
    select 1 from public.sessions s
    join public.cohorts c on c.id = s.cohort_id
    where s.id = session_id
      and private.has_program_role(c.program_id, array['program_director', 'assessment_lead']::text[])
  )
);
create policy session_learning_objectives_delete on public.session_learning_objectives for delete to authenticated
using (
  exists (
    select 1 from public.sessions s
    join public.cohorts c on c.id = s.cohort_id
    where s.id = session_id
      and private.has_program_role(c.program_id, array['program_director', 'assessment_lead']::text[])
  )
);

-- Attendance
create policy attendance_select on public.attendance_records for select to authenticated
using (learner_id = (select auth.uid()) or private.can_manage_session(session_id));
create policy attendance_insert on public.attendance_records for insert to authenticated
with check (private.can_manage_session(session_id));
create policy attendance_update on public.attendance_records for update to authenticated
using (private.can_manage_session(session_id))
with check (private.can_manage_session(session_id));
create policy attendance_delete on public.attendance_records for delete to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = session_id and private.can_manage_cohort(s.cohort_id)
  )
);

-- Audit events are read-only from the browser. Writes will be server-side only.
create policy audit_events_select on public.audit_events for select to authenticated
using (
  private.is_platform_admin()
  or (program_id is not null and private.has_program_role(program_id, array['program_director']::text[]))
);

-- Explicit table privileges; RLS still determines row visibility.
revoke all on public.profiles, public.platform_admins, public.programs, public.program_memberships,
  public.cohorts, public.cohort_memberships, public.groups, public.group_members,
  public.learning_objectives, public.sessions, public.session_facilitators,
  public.session_learning_objectives, public.attendance_records, public.audit_events from anon;
grant select, update on public.profiles to authenticated;
grant select on public.platform_admins to authenticated;
grant select, insert, update, delete on public.programs to authenticated;
grant select, insert, update, delete on public.program_memberships to authenticated;
grant select, insert, update, delete on public.cohorts to authenticated;
grant select, insert, update, delete on public.cohort_memberships to authenticated;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.learning_objectives to authenticated;
grant select, insert, update, delete on public.sessions to authenticated;
grant select, insert, update, delete on public.session_facilitators to authenticated;
grant select, insert, update, delete on public.session_learning_objectives to authenticated;
grant select, insert, update, delete on public.attendance_records to authenticated;
grant select on public.audit_events to authenticated;

commit;
