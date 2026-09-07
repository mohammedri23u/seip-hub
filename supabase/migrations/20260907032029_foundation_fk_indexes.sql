-- SEIP Hub Foundation v0.1 performance follow-up
-- Adds covering indexes for foreign keys identified by Supabase's performance advisor.

create index if not exists attendance_records_verified_by_idx
  on public.attendance_records (verified_by);

create index if not exists audit_events_actor_user_id_idx
  on public.audit_events (actor_user_id);

create index if not exists cohorts_created_by_idx
  on public.cohorts (created_by);

create index if not exists group_members_user_id_idx
  on public.group_members (user_id);

create index if not exists learning_objectives_created_by_idx
  on public.learning_objectives (created_by);

create index if not exists programs_created_by_idx
  on public.programs (created_by);

create index if not exists session_facilitators_user_id_idx
  on public.session_facilitators (user_id);

create index if not exists session_learning_objectives_lo_idx
  on public.session_learning_objectives (learning_objective_id);

create index if not exists sessions_created_by_idx
  on public.sessions (created_by);
