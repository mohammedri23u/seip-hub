-- In-person teaching records are deliberately separate from legacy sessions,
-- attendance_records, secure assessments, pilot outcomes and certificate eligibility.
-- Secure assessment questions, responses, scoring and outcomes are unchanged.

create table public.classroom_meetings (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete restrict,
  meeting_key text not null check (meeting_key in ('meeting-1','meeting-2','meeting-3','meeting-4','meeting-5')),
  content_version text not null default '2.0-approved-foundation'
    check (content_version = '2.0-approved-foundation'),
  scheduled_at timestamptz,
  status text not null default 'planned' check (status in ('planned','completed')),
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete restrict,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cohort_id, meeting_key),
  constraint classroom_meeting_completion_consistent check (
    (status = 'planned' and completed_at is null and completed_by is null)
    or (status = 'completed' and completed_at is not null and completed_by is not null)
  )
);
create index classroom_meetings_cohort_idx on public.classroom_meetings(cohort_id);
create index classroom_meetings_created_by_idx on public.classroom_meetings(created_by);
create index classroom_meetings_completed_by_idx on public.classroom_meetings(completed_by) where completed_by is not null;

create table public.classroom_attendance (
  meeting_id uuid not null references public.classroom_meetings(id) on delete restrict,
  learner_id uuid not null references auth.users(id) on delete restrict,
  status text not null check (status in ('present','late','absent','excused')),
  recorded_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (meeting_id, learner_id)
);
create index classroom_attendance_learner_idx on public.classroom_attendance(learner_id);
create index classroom_attendance_recorded_by_idx on public.classroom_attendance(recorded_by);

-- Private teaching reflections are never on a row that learners can select.
create table public.classroom_meeting_notes (
  meeting_id uuid primary key references public.classroom_meetings(id) on delete restrict,
  notes text not null default '' check (char_length(notes) <= 4000),
  updated_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now()
);

create index classroom_notes_updated_by_idx on public.classroom_meeting_notes(updated_by);

create function private.can_manage_classroom_cohort(target_cohort_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $function$
  select (select auth.uid()) is not null
    and (select private.managed_account_access_allowed())
    and exists (select 1 from public.profiles own_profile
      where own_profile.id = (select auth.uid()) and own_profile.status = 'active')
    and exists (
      select 1 from public.cohorts c
      join public.programs p on p.id = c.program_id
      where c.id = target_cohort_id and p.code = 'SEIP26' and p.status = 'active'
        and (
          private.can_manage_cohort(c.id)
          or (c.status = 'active' and exists (
            select 1 from public.sessions s
            join public.session_facilitators sf on sf.session_id = s.id
            where s.cohort_id = c.id and sf.user_id = (select auth.uid())
              and sf.facilitator_role in ('lead','facilitator')
              and exists (select 1 from public.program_memberships pm
                where pm.program_id = c.program_id and pm.user_id = (select auth.uid())
                  and pm.status = 'active'
                  and pm.role in ('peer_educator','reviewer','assessment_lead','program_director'))
          ))
        )
    );
$function$;

create function private.can_read_classroom_cohort(target_cohort_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $function$
  select (select auth.uid()) is not null
    and (select private.managed_account_access_allowed())
    and exists (select 1 from public.profiles own_profile
      where own_profile.id = (select auth.uid()) and own_profile.status = 'active')
    and (
      private.can_manage_classroom_cohort(target_cohort_id)
      or exists (
        select 1 from public.cohort_memberships cm
        join public.cohorts c on c.id = cm.cohort_id
        join public.programs p on p.id = c.program_id
        join public.program_memberships pm on pm.program_id = c.program_id
          and pm.user_id = cm.user_id and pm.role = 'learner' and pm.status = 'active'
        where cm.cohort_id = target_cohort_id and cm.user_id = (select auth.uid())
          and cm.member_type = 'learner' and cm.status = 'active'
          and c.status = 'active' and p.code = 'SEIP26' and p.status = 'active'
      )
    );
$function$;

create function private.is_classroom_roster_learner(target_cohort_id uuid, target_learner_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $function$
  select (select auth.uid()) is not null
    and private.can_manage_classroom_cohort(target_cohort_id)
    and exists (
      select 1 from public.cohort_memberships cm
      where cm.cohort_id = target_cohort_id and cm.user_id = target_learner_id
        and cm.member_type = 'learner' and cm.status = 'active'
    );
$function$;

revoke all on function private.can_manage_classroom_cohort(uuid) from public, anon;
revoke all on function private.can_read_classroom_cohort(uuid) from public, anon;
revoke all on function private.is_classroom_roster_learner(uuid,uuid) from public, anon;
grant execute on function private.can_manage_classroom_cohort(uuid),
  private.can_read_classroom_cohort(uuid),
  private.is_classroom_roster_learner(uuid,uuid) to authenticated;

create function private.stamp_classroom_meeting()
returns trigger language plpgsql security invoker set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'Authenticated actor required' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id or new.cohort_id is distinct from old.cohort_id
    or new.meeting_key is distinct from old.meeting_key or new.content_version is distinct from old.content_version
    or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Classroom meeting identity is immutable' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    new.created_at := now();
  end if;
  if new.status = 'completed' then
    if tg_op = 'INSERT' then
      new.completed_at := now();
      new.completed_by := (select auth.uid());
    elsif old.status <> 'completed' then
      new.completed_at := now();
      new.completed_by := (select auth.uid());
    else
      new.completed_at := old.completed_at;
      new.completed_by := old.completed_by;
    end if;
  else
    new.completed_at := null;
    new.completed_by := null;
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

create function private.stamp_classroom_attendance()
returns trigger language plpgsql security invoker set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'Authenticated actor required' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (
    new.meeting_id is distinct from old.meeting_id or new.learner_id is distinct from old.learner_id
  ) then
    raise exception 'Classroom attendance identity is immutable' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.classroom_meetings m
    where m.id = new.meeting_id and private.is_classroom_roster_learner(m.cohort_id, new.learner_id)
  ) then
    raise exception 'Learner is not on the active classroom roster' using errcode = '42501';
  end if;
  new.recorded_by := (select auth.uid());
  new.updated_at := now();
  return new;
end;
$function$;

create function private.stamp_classroom_notes()
returns trigger language plpgsql security invoker set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'Authenticated actor required' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.meeting_id is distinct from old.meeting_id then
    raise exception 'Classroom notes identity is immutable' using errcode = '42501';
  end if;
  new.updated_by := (select auth.uid());
  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function private.stamp_classroom_meeting(),
  private.stamp_classroom_attendance(), private.stamp_classroom_notes() from public, anon, authenticated;

create trigger classroom_meetings_stamp before insert or update on public.classroom_meetings
for each row execute function private.stamp_classroom_meeting();
create trigger classroom_attendance_stamp before insert or update on public.classroom_attendance
for each row execute function private.stamp_classroom_attendance();
create trigger classroom_meeting_notes_stamp before insert or update on public.classroom_meeting_notes
for each row execute function private.stamp_classroom_notes();

alter table public.classroom_meetings enable row level security;
alter table public.classroom_attendance enable row level security;
alter table public.classroom_meeting_notes enable row level security;

create policy classroom_meetings_select on public.classroom_meetings
for select to authenticated using (private.can_read_classroom_cohort(cohort_id));
create policy classroom_meetings_insert on public.classroom_meetings
for insert to authenticated with check (
  created_by = (select auth.uid()) and private.can_manage_classroom_cohort(cohort_id)
);
create policy classroom_meetings_update on public.classroom_meetings
for update to authenticated using (private.can_manage_classroom_cohort(cohort_id))
with check (private.can_manage_classroom_cohort(cohort_id));

create policy classroom_attendance_select on public.classroom_attendance
for select to authenticated using (
  exists (
    select 1 from public.classroom_meetings m where m.id = classroom_attendance.meeting_id
      and (
        private.can_manage_classroom_cohort(m.cohort_id)
        or (classroom_attendance.learner_id = (select auth.uid()) and private.can_read_classroom_cohort(m.cohort_id))
      )
  )
);
create policy classroom_attendance_insert on public.classroom_attendance
for insert to authenticated with check (
  recorded_by = (select auth.uid()) and exists (
    select 1 from public.classroom_meetings m where m.id = classroom_attendance.meeting_id
      and private.is_classroom_roster_learner(m.cohort_id, classroom_attendance.learner_id)
  )
);
create policy classroom_attendance_update on public.classroom_attendance
for update to authenticated using (
  exists (select 1 from public.classroom_meetings m
    where m.id = classroom_attendance.meeting_id and private.can_manage_classroom_cohort(m.cohort_id))
) with check (
  recorded_by = (select auth.uid()) and exists (
    select 1 from public.classroom_meetings m where m.id = classroom_attendance.meeting_id
      and private.is_classroom_roster_learner(m.cohort_id, classroom_attendance.learner_id)
  )
);

create policy classroom_notes_select on public.classroom_meeting_notes
for select to authenticated using (
  exists (select 1 from public.classroom_meetings m
    where m.id = classroom_meeting_notes.meeting_id and private.can_manage_classroom_cohort(m.cohort_id))
);
create policy classroom_notes_insert on public.classroom_meeting_notes
for insert to authenticated with check (
  updated_by = (select auth.uid()) and exists (select 1 from public.classroom_meetings m
    where m.id = classroom_meeting_notes.meeting_id and private.can_manage_classroom_cohort(m.cohort_id))
);
create policy classroom_notes_update on public.classroom_meeting_notes
for update to authenticated using (
  exists (select 1 from public.classroom_meetings m
    where m.id = classroom_meeting_notes.meeting_id and private.can_manage_classroom_cohort(m.cohort_id))
) with check (
  updated_by = (select auth.uid()) and exists (select 1 from public.classroom_meetings m
    where m.id = classroom_meeting_notes.meeting_id and private.can_manage_classroom_cohort(m.cohort_id))
);

revoke all on public.classroom_meetings, public.classroom_attendance, public.classroom_meeting_notes from public, anon, authenticated;
grant select on public.classroom_meetings, public.classroom_attendance, public.classroom_meeting_notes to authenticated;
grant insert (cohort_id,meeting_key,content_version) on public.classroom_meetings to authenticated;
grant update (scheduled_at,status) on public.classroom_meetings to authenticated;
grant insert (meeting_id,learner_id,status), update (meeting_id,learner_id,status) on public.classroom_attendance to authenticated;
grant insert (meeting_id,notes), update (meeting_id,notes) on public.classroom_meeting_notes to authenticated;

-- One invoker transaction saves meeting logistics and teacher-private reflections.
-- It is a public API endpoint, so it rechecks the caller and still obeys all RLS.
create function public.save_classroom_meeting(
  target_meeting_id uuid, target_status text, target_scheduled_at timestamptz, target_notes text
) returns uuid language plpgsql security invoker set search_path = ''
as $function$
declare target_cohort_id uuid;
begin
  if (select auth.uid()) is null or not (select private.managed_account_access_allowed()) then
    raise exception 'Authenticated actor required' using errcode = '42501';
  end if;
  if target_status not in ('planned','completed') or target_status is null
    or target_notes is null or char_length(target_notes) > 4000 then
    raise exception 'Invalid classroom meeting values' using errcode = '22023';
  end if;
  select m.cohort_id into target_cohort_id from public.classroom_meetings m
    where m.id = target_meeting_id for update;
  if target_cohort_id is null or not private.can_manage_classroom_cohort(target_cohort_id) then
    raise exception 'Meeting is not accessible' using errcode = '42501';
  end if;
  update public.classroom_meetings set status = target_status, scheduled_at = target_scheduled_at
    where id = target_meeting_id;
  insert into public.classroom_meeting_notes (meeting_id, notes)
    values (target_meeting_id, target_notes)
    on conflict (meeting_id) do update set notes = excluded.notes;
  return target_meeting_id;
end;
$function$;
revoke all on function public.save_classroom_meeting(uuid,text,timestamptz,text) from public, anon;
grant execute on function public.save_classroom_meeting(uuid,text,timestamptz,text) to authenticated;

comment on table public.classroom_meetings is 'In-person THE TEN logistics only. Does not affect legacy completion or certificates.';
comment on table public.classroom_attendance is 'Teacher-recorded in-person attendance; no automatic legacy attendance conversion.';
comment on table public.classroom_meeting_notes is 'Teacher-private reflections. Learners have no SELECT policy.';

-- Teaching answers and facilitator notes are not committed in the public repository.
-- Only server-authorized THE TEN teachers can read the approved teaching payload.
create table public.classroom_teaching_content (
  content_version text primary key check (content_version = '2.0-approved-foundation'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);
alter table public.classroom_teaching_content enable row level security;
create policy classroom_teaching_content_select on public.classroom_teaching_content
for select to authenticated using (
  (select auth.uid()) is not null and (select private.managed_account_access_allowed())
  and exists (select 1 from public.profiles own_profile
    where own_profile.id = (select auth.uid()) and own_profile.status = 'active')
  and exists (
    select 1 from public.programs p
    where p.code = 'SEIP26' and p.status = 'active'
      and (
        private.has_program_role(p.id, array['program_director']::text[])
        or exists (
          select 1 from public.cohorts c
          where c.program_id = p.id and c.status = 'active'
            and private.can_manage_classroom_cohort(c.id)
        )
      )
  )
);
revoke all on public.classroom_teaching_content from public, anon, authenticated;
grant select on public.classroom_teaching_content to authenticated;
comment on table public.classroom_teaching_content is 'Approved formative teaching payload. Teachers only; no secure pre/post assessment material.';
