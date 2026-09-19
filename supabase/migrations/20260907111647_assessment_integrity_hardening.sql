begin
-- A final score decision is an immutable adjudication event. Corrections are append-only.
create table public.final_score_corrections (
  id uuid primary key default gen_random_uuid(),
  final_score_decision_id uuid not null references public.final_score_decisions(id),
  response_id uuid not null references public.student_responses(id),
  previous_score numeric(8,3) not null check (previous_score >= 0),
  corrected_score numeric(8,3) not null check (corrected_score >= 0),
  max_score numeric(8,3) not null check (max_score > 0),
  reason text not null check (char_length(btrim(reason)) > 0),
  corrected_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (previous_score <= max_score),
  check (corrected_score <= max_score)
)
create index final_score_corrections_decision_time_idx
  on public.final_score_corrections (final_score_decision_id, created_at desc)
create index final_score_corrections_response_time_idx
  on public.final_score_corrections (response_id, created_at desc)
create index final_score_corrections_corrected_by_idx
  on public.final_score_corrections (corrected_by)
-- Database-level release gate: written items cannot go live without approved, mark-aligned rubrics.
create or replace function private.validate_assessment_release_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'live' and old.status is distinct from 'live' then
    if not exists (
      select 1 from public.assessment_items ai where ai.assessment_id = new.id
    ) then
      raise exception 'Assessment requires at least one item before going live';
    end if;

    if exists (
      select 1
      from public.assessment_items ai
      join public.question_versions qv on qv.id = ai.question_version_id
      join public.questions q on q.id = qv.question_id
      where ai.assessment_id = new.id
        and q.status <> 'approved'
    ) then
      raise exception 'All assessment questions must be approved before going live';
    end if;

    if exists (
      select 1
      from public.assessment_items ai
      join public.question_versions qv on qv.id = ai.question_version_id
      join public.questions q on q.id = qv.question_id
      left join public.question_rubrics qr on qr.question_version_id = ai.question_version_id
      where ai.assessment_id = new.id
        and q.question_type in ('short_answer', 'structured_written')
        and qr.question_version_id is null
    ) then
      raise exception 'Every written assessment item requires an assigned rubric before going live';
    end if;

    if exists (
      select 1
      from public.assessment_items ai
      join public.question_versions qv on qv.id = ai.question_version_id
      join public.questions q on q.id = qv.question_id
      join public.question_rubrics qr on qr.question_version_id = ai.question_version_id
      join public.rubric_versions rv on rv.id = qr.rubric_version_id
      join public.rubrics r on r.id = rv.rubric_id
      where ai.assessment_id = new.id
        and q.question_type in ('short_answer', 'structured_written')
        and r.status <> 'approved'
    ) then
      raise exception 'Every written assessment item requires an approved rubric before going live';
    end if;

    if exists (
      select 1
      from public.assessment_items ai
      join public.question_versions qv on qv.id = ai.question_version_id
      join public.questions q on q.id = qv.question_id
      join public.question_rubrics qr on qr.question_version_id = ai.question_version_id
      where ai.assessment_id = new.id
        and q.question_type in ('short_answer', 'structured_written')
        and ai.marks <> private.rubric_max_score(qr.rubric_version_id)
    ) then
      raise exception 'Written assessment item marks must equal the assigned rubric maximum before going live';
    end if;
  end if;
  return new;
end;
$$
revoke all on function private.validate_assessment_release_integrity() from public, anon, authenticated
drop trigger if exists assessments_validate_release_integrity on public.assessments
create trigger assessments_validate_release_integrity
before update of status on public.assessments
for each row execute function private.validate_assessment_release_integrity()
-- Rubric assignment becomes immutable once delivery has started or any learner response exists.
create or replace function private.lock_question_rubric_after_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_question_version uuid;
begin
  target_question_version := case
    when tg_op = 'INSERT' then new.question_version_id
    else old.question_version_id
  end;

  if exists (
    select 1 from public.student_responses sr
    where sr.question_version_id = target_question_version
  ) then
    raise exception 'Rubric assignment is locked after learner responses exist';
  end if;

  if exists (
    select 1
    from public.assessment_items ai
    join public.assessments a on a.id = ai.assessment_id
    where ai.question_version_id = target_question_version
      and a.status in ('live', 'closed', 'grading', 'moderation', 'approved_results', 'released')
  ) then
    raise exception 'Rubric assignment is locked after assessment delivery begins';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$
revoke all on function private.lock_question_rubric_after_response() from public, anon, authenticated
drop trigger if exists question_rubrics_lock_after_response on public.question_rubrics
create trigger question_rubrics_lock_after_response
before insert or update or delete on public.question_rubrics
for each row execute function private.lock_question_rubric_after_response()
-- Final decisions cannot be overwritten. Any later change must be an explicit correction record.
create or replace function private.lock_final_score_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Final score decisions are immutable; use the audited correction workflow';
end;
$$
revoke all on function private.lock_final_score_decision() from public, anon, authenticated
drop trigger if exists final_score_decisions_immutable on public.final_score_decisions
create trigger final_score_decisions_immutable
before update or delete on public.final_score_decisions
for each row execute function private.lock_final_score_decision()
drop policy if exists final_score_decisions_update on public.final_score_decisions
revoke update, delete on public.final_score_decisions from authenticated
create or replace function private.validate_final_score_correction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_response uuid;
  source_max numeric(8,3);
  source_base numeric(8,3);
  effective_previous numeric(8,3);
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.final_score_decision_id::text, 0));

  select response_id, max_score, final_score
    into source_response, source_max, source_base
  from public.final_score_decisions
  where id = new.final_score_decision_id;

  if source_response is null or source_response <> new.response_id then
    raise exception 'Correction source does not match response';
  end if;
  if new.max_score <> source_max then
    raise exception 'Correction max score must match the immutable final decision';
  end if;

  select coalesce((
    select fsc.corrected_score
    from public.final_score_corrections fsc
    where fsc.final_score_decision_id = new.final_score_decision_id
    order by fsc.created_at desc, fsc.id desc
    limit 1
  ), source_base) into effective_previous;

  if new.previous_score <> effective_previous then
    raise exception 'Correction is stale; previous score does not match the current effective score';
  end if;
  if new.corrected_score > source_max then
    raise exception 'Corrected score cannot exceed the maximum score';
  end if;
  if new.corrected_score = effective_previous then
    raise exception 'Corrected score must differ from the current effective score';
  end if;
  return new;
end;
$$
revoke all on function private.validate_final_score_correction() from public, anon, authenticated
create trigger final_score_corrections_validate
before insert on public.final_score_corrections
for each row execute function private.validate_final_score_correction()
create or replace function private.lock_final_score_correction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Final score corrections are immutable audit events';
end;
$$
revoke all on function private.lock_final_score_correction() from public, anon, authenticated
create trigger final_score_corrections_immutable
before update or delete on public.final_score_corrections
for each row execute function private.lock_final_score_correction()
create or replace function private.audit_final_score_correction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_program uuid;
begin
  select c.program_id into target_program
  from public.student_responses sr
  join public.assessment_attempts aa on aa.id = sr.attempt_id
  join public.assessments a on a.id = aa.assessment_id
  join public.cohorts c on c.id = a.cohort_id
  where sr.id = new.response_id;

  insert into public.audit_events (
    program_id, actor_user_id, event_type, entity_type, entity_id, old_value, new_value
  ) values (
    target_program,
    coalesce(auth.uid(), new.corrected_by),
    'final_score.corrected',
    'final_score_correction',
    new.id::text,
    jsonb_build_object('score', new.previous_score, 'max_score', new.max_score),
    jsonb_build_object('score', new.corrected_score, 'max_score', new.max_score, 'reason', new.reason)
  );
  return new;
end;
$$
revoke all on function private.audit_final_score_correction() from public, anon, authenticated
create trigger final_score_corrections_audit
after insert on public.final_score_corrections
for each row execute function private.audit_final_score_correction()
alter table public.final_score_corrections enable row level security
create policy final_score_corrections_select on public.final_score_corrections for select to authenticated
using (
  private.can_grade_response(response_id)
  or exists (
    select 1
    from public.student_responses sr
    join public.assessment_attempts aa on aa.id = sr.attempt_id
    join public.assessments a on a.id = aa.assessment_id
    where sr.id = response_id
      and aa.learner_id = (select auth.uid())
      and a.status = 'released'
  )
)
create policy final_score_corrections_insert on public.final_score_corrections for insert to authenticated
with check (
  corrected_by = (select auth.uid())
  and private.can_finalize_response(response_id)
)
revoke all on public.final_score_corrections from anon
grant select, insert on public.final_score_corrections to authenticated
commit
