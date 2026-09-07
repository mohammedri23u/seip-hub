-- SEIP Hub Stage 4 — Rubric, AI-assisted grading, human review, moderation, and final score decisions.
-- AI outputs are advisory only. Final scores can only originate from a human review or resolved moderation case.

begin;

create table public.rubrics (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  rubric_code text not null,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, rubric_code)
);

create table public.rubric_versions (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid not null references public.rubrics(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  instructions text,
  reference_answer text,
  moderation_threshold_points numeric(8,3) check (moderation_threshold_points is null or moderation_threshold_points >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (rubric_id, version_number)
);

create table public.rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  rubric_version_id uuid not null references public.rubric_versions(id) on delete cascade,
  criterion_code text not null,
  title text not null,
  description text,
  scoring_guidance text,
  max_score numeric(8,3) not null check (max_score > 0),
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique (rubric_version_id, criterion_code),
  unique (rubric_version_id, position)
);

create table public.question_rubrics (
  question_version_id uuid primary key references public.question_versions(id) on delete cascade,
  rubric_version_id uuid not null references public.rubric_versions(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.ai_grading_runs (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.student_responses(id) on delete cascade,
  rubric_version_id uuid not null references public.rubric_versions(id),
  requested_by uuid not null references auth.users(id),
  provider text not null,
  model text not null,
  prompt_version text not null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  proposed_total_score numeric(8,3),
  max_score numeric(8,3) not null check (max_score > 0),
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  summary text,
  uncertainty text,
  provider_response_id text,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  raw_output jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (proposed_total_score is null or (proposed_total_score >= 0 and proposed_total_score <= max_score))
);

create table public.ai_criterion_scores (
  id uuid primary key default gen_random_uuid(),
  grading_run_id uuid not null references public.ai_grading_runs(id) on delete cascade,
  criterion_id uuid not null references public.rubric_criteria(id),
  proposed_score numeric(8,3) not null check (proposed_score >= 0),
  rationale text not null,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  missing_concepts text[] not null default '{}',
  errors text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (grading_run_id, criterion_id)
);

create table public.human_reviews (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.student_responses(id) on delete cascade,
  rubric_version_id uuid not null references public.rubric_versions(id),
  ai_grading_run_id uuid references public.ai_grading_runs(id) on delete set null,
  reviewer_id uuid not null references auth.users(id),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'superseded')),
  total_score numeric(8,3) not null check (total_score >= 0),
  max_score numeric(8,3) not null check (max_score > 0),
  general_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (response_id, reviewer_id),
  check (total_score <= max_score)
);

create table public.human_criterion_scores (
  human_review_id uuid not null references public.human_reviews(id) on delete cascade,
  criterion_id uuid not null references public.rubric_criteria(id),
  score numeric(8,3) not null check (score >= 0),
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (human_review_id, criterion_id)
);

create table public.moderation_cases (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.student_responses(id) on delete cascade,
  ai_grading_run_id uuid references public.ai_grading_runs(id) on delete set null,
  human_review_id uuid references public.human_reviews(id) on delete set null,
  trigger_type text not null check (trigger_type in ('manual', 'ai_human_disagreement', 'quality_control')),
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'dismissed')),
  reason text not null,
  opened_by uuid not null references auth.users(id),
  assigned_to uuid references auth.users(id),
  resolved_by uuid references auth.users(id),
  resolved_score numeric(8,3) check (resolved_score is null or resolved_score >= 0),
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.final_score_decisions (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null unique references public.student_responses(id) on delete cascade,
  decision_source text not null check (decision_source in ('human_review', 'moderation')),
  human_review_id uuid references public.human_reviews(id),
  moderation_case_id uuid references public.moderation_cases(id),
  final_score numeric(8,3) not null check (final_score >= 0),
  max_score numeric(8,3) not null check (max_score > 0),
  rationale text,
  decided_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (final_score <= max_score),
  check (
    (decision_source = 'human_review' and human_review_id is not null and moderation_case_id is null)
    or (decision_source = 'moderation' and moderation_case_id is not null)
  )
);

create index rubrics_program_status_idx on public.rubrics (program_id, status);
create index rubric_versions_rubric_idx on public.rubric_versions (rubric_id, version_number desc);
create index rubric_criteria_version_idx on public.rubric_criteria (rubric_version_id, position);
create index question_rubrics_rubric_idx on public.question_rubrics (rubric_version_id);
create index ai_grading_runs_response_idx on public.ai_grading_runs (response_id, created_at desc);
create index ai_grading_runs_rubric_idx on public.ai_grading_runs (rubric_version_id);
create index ai_criterion_scores_criterion_idx on public.ai_criterion_scores (criterion_id);
create index human_reviews_response_idx on public.human_reviews (response_id, created_at desc);
create index human_reviews_rubric_idx on public.human_reviews (rubric_version_id);
create index human_reviews_ai_run_idx on public.human_reviews (ai_grading_run_id);
create index human_criterion_scores_criterion_idx on public.human_criterion_scores (criterion_id);
create index moderation_cases_response_status_idx on public.moderation_cases (response_id, status, created_at desc);
create index moderation_cases_ai_run_idx on public.moderation_cases (ai_grading_run_id);
create index moderation_cases_human_review_idx on public.moderation_cases (human_review_id);
create index moderation_cases_assigned_idx on public.moderation_cases (assigned_to, status);
create index final_score_decisions_human_review_idx on public.final_score_decisions (human_review_id);
create index final_score_decisions_moderation_idx on public.final_score_decisions (moderation_case_id);

create trigger rubrics_set_updated_at before update on public.rubrics
for each row execute function private.set_updated_at();
create trigger human_reviews_set_updated_at before update on public.human_reviews
for each row execute function private.set_updated_at();
create trigger human_criterion_scores_set_updated_at before update on public.human_criterion_scores
for each row execute function private.set_updated_at();
create trigger moderation_cases_set_updated_at before update on public.moderation_cases
for each row execute function private.set_updated_at();
create trigger final_score_decisions_set_updated_at before update on public.final_score_decisions
for each row execute function private.set_updated_at();

create or replace function private.validate_rubric_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'draft' and new.status not in ('draft', 'approved') then
    raise exception 'Draft rubric can only remain draft or become approved';
  end if;
  if old.status = 'draft' and new.status = 'approved' and not exists (
    select 1
    from public.rubric_versions rv
    join public.rubric_criteria rc on rc.rubric_version_id = rv.id
    where rv.rubric_id = old.id
  ) then
    raise exception 'Rubric requires a version with scored criteria before approval';
  end if;
  if old.status = 'approved' and new.status not in ('approved', 'retired') then
    raise exception 'Approved rubric cannot return to draft';
  end if;
  if old.status = 'retired' and new.status <> 'retired' then
    raise exception 'Retired rubric cannot be reactivated';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_rubric_status_transition() from public, anon, authenticated;
create trigger rubrics_validate_status
before update on public.rubrics
for each row execute function private.validate_rubric_status_transition();

create or replace function private.response_assessment_id(target_response_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select aa.assessment_id
  from public.student_responses sr
  join public.assessment_attempts aa on aa.id = sr.attempt_id
  where sr.id = target_response_id;
$$;

create or replace function private.response_program_id(target_response_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select private.assessment_program_id(private.response_assessment_id(target_response_id));
$$;

create or replace function private.can_grade_response(target_response_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_program_role(
    private.response_program_id(target_response_id),
    array['program_director', 'assessment_lead', 'reviewer']::text[]
  );
$$;

create or replace function private.can_finalize_response(target_response_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_program_role(
    private.response_program_id(target_response_id),
    array['program_director', 'assessment_lead']::text[]
  );
$$;

revoke all on function private.response_assessment_id(uuid) from public, anon;
revoke all on function private.response_program_id(uuid) from public, anon;
revoke all on function private.can_grade_response(uuid) from public, anon;
revoke all on function private.can_finalize_response(uuid) from public, anon;
grant execute on function private.response_assessment_id(uuid) to authenticated;
grant execute on function private.response_program_id(uuid) to authenticated;
grant execute on function private.can_grade_response(uuid) to authenticated;
grant execute on function private.can_finalize_response(uuid) to authenticated;

create or replace function private.rubric_max_score(target_rubric_version_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(max_score), 0)::numeric
  from public.rubric_criteria
  where rubric_version_id = target_rubric_version_id;
$$;
revoke all on function private.rubric_max_score(uuid) from public, anon;
grant execute on function private.rubric_max_score(uuid) to authenticated;

create or replace function private.validate_question_rubric_program()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  question_program uuid;
  question_type text;
  rubric_program uuid;
  rubric_status text;
  rubric_max numeric;
begin
  select q.program_id, q.question_type into question_program, question_type
  from public.question_versions qv
  join public.questions q on q.id = qv.question_id
  where qv.id = new.question_version_id;

  select r.program_id, r.status into rubric_program, rubric_status
  from public.rubric_versions rv
  join public.rubrics r on r.id = rv.rubric_id
  where rv.id = new.rubric_version_id;

  if question_program is null or rubric_program is null or question_program <> rubric_program then
    raise exception 'Question and rubric must belong to the same program';
  end if;
  if question_type not in ('short_answer', 'structured_written') then
    raise exception 'Rubrics can only be assigned to gradable written question types';
  end if;
  if rubric_status <> 'approved' then
    raise exception 'Rubric must be approved before assignment';
  end if;

  rubric_max := private.rubric_max_score(new.rubric_version_id);
  if rubric_max <= 0 then raise exception 'Rubric must contain scored criteria'; end if;
  if exists (
    select 1 from public.assessment_items ai
    where ai.question_version_id = new.question_version_id
      and ai.marks <> rubric_max
  ) then
    raise exception 'Existing assessment item marks must equal rubric maximum before assignment';
  end if;

  return new;
end;
$$;
revoke all on function private.validate_question_rubric_program() from public, anon, authenticated;
create trigger question_rubrics_same_program
before insert or update on public.question_rubrics
for each row execute function private.validate_question_rubric_program();

create or replace function private.lock_question_rubric_after_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_question_version uuid;
begin
  target_question_version := case when tg_op = 'DELETE' then old.question_version_id else old.question_version_id end;
  if exists (select 1 from public.student_responses sr where sr.question_version_id = target_question_version) then
    raise exception 'Rubric assignment is locked after learner responses exist';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.lock_question_rubric_after_response() from public, anon, authenticated;
create trigger question_rubrics_lock_after_response
before update or delete on public.question_rubrics
for each row execute function private.lock_question_rubric_after_response();

create or replace function private.validate_assessment_item_rubric_marks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_rubric uuid;
  rubric_max numeric;
begin
  select rubric_version_id into assigned_rubric
  from public.question_rubrics
  where question_version_id = new.question_version_id;

  if assigned_rubric is not null then
    rubric_max := private.rubric_max_score(assigned_rubric);
    if new.marks <> rubric_max then
      raise exception 'Assessment item marks must equal the assigned rubric maximum';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_assessment_item_rubric_marks() from public, anon, authenticated;
create trigger assessment_items_rubric_marks
before insert or update on public.assessment_items
for each row execute function private.validate_assessment_item_rubric_marks();

create or replace function private.validate_response_rubric(target_response_id uuid, target_rubric_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.student_responses sr
    join public.question_rubrics qr on qr.question_version_id = sr.question_version_id
    where sr.id = target_response_id
      and qr.rubric_version_id = target_rubric_version_id
  );
$$;
revoke all on function private.validate_response_rubric(uuid, uuid) from public, anon;
grant execute on function private.validate_response_rubric(uuid, uuid) to authenticated;

create or replace function private.enforce_grading_rubric_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.validate_response_rubric(new.response_id, new.rubric_version_id) then
    raise exception 'Rubric version is not assigned to this response question';
  end if;
  if new.max_score <> private.rubric_max_score(new.rubric_version_id) then
    raise exception 'Grading max score must equal rubric maximum';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_grading_rubric_link() from public, anon, authenticated;
create trigger ai_grading_runs_validate_rubric
before insert or update on public.ai_grading_runs
for each row execute function private.enforce_grading_rubric_link();
create trigger human_reviews_validate_rubric
before insert or update on public.human_reviews
for each row execute function private.enforce_grading_rubric_link();

create or replace function private.validate_criterion_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  criterion_max numeric(8,3);
  expected_rubric uuid;
  actual_rubric uuid;
begin
  select max_score, rubric_version_id into criterion_max, expected_rubric
  from public.rubric_criteria where id = new.criterion_id;

  if tg_table_name = 'ai_criterion_scores' then
    select rubric_version_id into actual_rubric from public.ai_grading_runs where id = new.grading_run_id;
    if new.proposed_score > criterion_max then raise exception 'AI criterion score exceeds rubric maximum'; end if;
  else
    select rubric_version_id into actual_rubric from public.human_reviews where id = new.human_review_id;
    if new.score > criterion_max then raise exception 'Human criterion score exceeds rubric maximum'; end if;
  end if;

  if expected_rubric is null or actual_rubric is null or expected_rubric <> actual_rubric then
    raise exception 'Criterion does not belong to the grading rubric version';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_criterion_score() from public, anon, authenticated;
create trigger ai_criterion_scores_validate before insert or update on public.ai_criterion_scores
for each row execute function private.validate_criterion_score();
create trigger human_criterion_scores_validate before insert or update on public.human_criterion_scores
for each row execute function private.validate_criterion_score();

create or replace function private.validate_moderation_resolution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  review_max numeric;
  review_status text;
  review_total numeric;
  criterion_count integer;
  scored_count integer;
  criterion_sum numeric;
begin
  if new.status = 'resolved' then
    if new.human_review_id is null or new.resolved_score is null or new.resolved_by is null or new.resolved_at is null or nullif(trim(new.resolution_note), '') is null then
      raise exception 'Resolved moderation requires a linked human review, score, resolver, timestamp, and resolution note';
    end if;
    select max_score, status, total_score into review_max, review_status, review_total from public.human_reviews where id = new.human_review_id;
    if review_status <> 'submitted' then raise exception 'Moderation requires a submitted human review'; end if;
    if review_max is null or new.resolved_score > review_max then
      raise exception 'Moderation score exceeds the human-review rubric maximum';
    end if;
    select count(*), coalesce(sum(hcs.score), 0) into scored_count, criterion_sum
    from public.human_criterion_scores hcs where hcs.human_review_id = new.human_review_id;
    select count(*) into criterion_count
    from public.rubric_criteria rc
    join public.human_reviews hr on hr.rubric_version_id = rc.rubric_version_id
    where hr.id = new.human_review_id;
    if scored_count <> criterion_count or criterion_sum <> review_total then
      raise exception 'Moderation source human review is incomplete or internally inconsistent';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_moderation_resolution() from public, anon, authenticated;
create trigger moderation_cases_validate_resolution
before insert or update on public.moderation_cases
for each row execute function private.validate_moderation_resolution();

create or replace function private.validate_final_score_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_response uuid;
  source_score numeric(8,3);
  source_max numeric(8,3);
  source_status text;
  criterion_count integer;
  scored_count integer;
  criterion_sum numeric;
begin
  if new.decision_source = 'human_review' then
    select response_id, total_score, max_score, status
      into source_response, source_score, source_max, source_status
    from public.human_reviews where id = new.human_review_id;

    if source_status <> 'submitted' then raise exception 'Human review must be submitted before final approval'; end if;
    select count(*), coalesce(sum(hcs.score), 0)
      into scored_count, criterion_sum
    from public.human_criterion_scores hcs where hcs.human_review_id = new.human_review_id;
    select count(*) into criterion_count
    from public.rubric_criteria rc
    join public.human_reviews hr on hr.rubric_version_id = rc.rubric_version_id
    where hr.id = new.human_review_id;
    if scored_count <> criterion_count or criterion_sum <> source_score then
      raise exception 'Human review criterion scores are incomplete or do not match the review total';
    end if;
    if exists (select 1 from public.moderation_cases mc where mc.response_id = new.response_id and mc.status in ('open', 'in_review')) then
      raise exception 'Open moderation case must be resolved before final approval';
    end if;
  else
    select response_id, resolved_score,
           (select sum(rc.max_score) from public.rubric_criteria rc join public.human_reviews hr on hr.rubric_version_id = rc.rubric_version_id where hr.id = mc.human_review_id),
           status
      into source_response, source_score, source_max, source_status
    from public.moderation_cases mc where mc.id = new.moderation_case_id;

    if source_status <> 'resolved' or source_score is null then raise exception 'Moderation case must be resolved with a score'; end if;
    if source_max is null then raise exception 'Moderation finalization requires a linked human review'; end if;
  end if;

  if source_response is null or source_response <> new.response_id then raise exception 'Final score source does not match response'; end if;
  if new.final_score <> source_score then raise exception 'Final score must equal the approved human source score'; end if;
  if source_max is not null and new.max_score <> source_max then raise exception 'Final max score must match rubric maximum'; end if;
  return new;
end;
$$;
revoke all on function private.validate_final_score_decision() from public, anon, authenticated;
create trigger final_score_decisions_validate
before insert or update on public.final_score_decisions
for each row execute function private.validate_final_score_decision();

create or replace function private.lock_finalized_grading_source()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'human_reviews' and exists (
    select 1 from public.final_score_decisions fsd where fsd.human_review_id = old.id
  ) then
    raise exception 'Human review is locked because it is the source of a final score decision';
  end if;
  if tg_table_name = 'moderation_cases' and exists (
    select 1 from public.final_score_decisions fsd where fsd.moderation_case_id = old.id
  ) then
    raise exception 'Moderation case is locked because it is the source of a final score decision';
  end if;
  return new;
end;
$$;
revoke all on function private.lock_finalized_grading_source() from public, anon, authenticated;
create trigger human_reviews_lock_finalized
before update on public.human_reviews
for each row execute function private.lock_finalized_grading_source();
create trigger moderation_cases_lock_finalized
before update on public.moderation_cases
for each row execute function private.lock_finalized_grading_source();

create or replace function private.lock_finalized_human_criterion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_review uuid;
begin
  target_review := case when tg_op = 'DELETE' then old.human_review_id else new.human_review_id end;
  if exists (select 1 from public.final_score_decisions fsd where fsd.human_review_id = target_review) then
    raise exception 'Human criterion scores are locked because the review is part of a final score decision';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.lock_finalized_human_criterion() from public, anon, authenticated;
create trigger human_criterion_scores_lock_finalized
before insert or update or delete on public.human_criterion_scores
for each row execute function private.lock_finalized_human_criterion();

create or replace function private.audit_grading_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_response uuid;
  actor uuid;
  program uuid;
begin
  actor := auth.uid();
  if tg_table_name = 'ai_grading_runs' then target_response := coalesce(new.response_id, old.response_id);
  elsif tg_table_name = 'human_reviews' then target_response := coalesce(new.response_id, old.response_id);
  elsif tg_table_name = 'moderation_cases' then target_response := coalesce(new.response_id, old.response_id);
  elsif tg_table_name = 'final_score_decisions' then target_response := coalesce(new.response_id, old.response_id);
  end if;
  program := private.response_program_id(target_response);

  insert into public.audit_events (program_id, actor_user_id, event_type, entity_type, entity_id, old_value, new_value)
  values (
    program,
    actor,
    lower(tg_table_name || '_' || tg_op),
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, target_response::text),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.audit_grading_change() from public, anon, authenticated;
create trigger ai_grading_runs_audit after insert or update on public.ai_grading_runs
for each row execute function private.audit_grading_change();
create trigger human_reviews_audit after insert or update on public.human_reviews
for each row execute function private.audit_grading_change();
create trigger moderation_cases_audit after insert or update on public.moderation_cases
for each row execute function private.audit_grading_change();
create trigger final_score_decisions_audit after insert or update on public.final_score_decisions
for each row execute function private.audit_grading_change();

alter table public.rubrics enable row level security;
alter table public.rubric_versions enable row level security;
alter table public.rubric_criteria enable row level security;
alter table public.question_rubrics enable row level security;
alter table public.ai_grading_runs enable row level security;
alter table public.ai_criterion_scores enable row level security;
alter table public.human_reviews enable row level security;
alter table public.human_criterion_scores enable row level security;
alter table public.moderation_cases enable row level security;
alter table public.final_score_decisions enable row level security;

create policy rubrics_select on public.rubrics for select to authenticated
using (private.has_program_role(program_id, array['program_director', 'assessment_lead', 'reviewer']::text[]));
create policy rubrics_insert on public.rubrics for insert to authenticated
with check (created_by = (select auth.uid()) and private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[]));
create policy rubrics_update on public.rubrics for update to authenticated
using (private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[]))
with check (private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[]));
create policy rubrics_delete on public.rubrics for delete to authenticated
using (private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[]));

create policy rubric_versions_select on public.rubric_versions for select to authenticated
using (exists (select 1 from public.rubrics r where r.id = rubric_id and private.has_program_role(r.program_id, array['program_director', 'assessment_lead', 'reviewer']::text[])));
create policy rubric_versions_insert on public.rubric_versions for insert to authenticated
with check (created_by = (select auth.uid()) and exists (select 1 from public.rubrics r where r.id = rubric_id and r.status = 'draft' and private.has_program_role(r.program_id, array['program_director', 'assessment_lead']::text[])));

create policy rubric_criteria_select on public.rubric_criteria for select to authenticated
using (exists (select 1 from public.rubric_versions rv join public.rubrics r on r.id = rv.rubric_id where rv.id = rubric_version_id and private.has_program_role(r.program_id, array['program_director', 'assessment_lead', 'reviewer']::text[])));
create policy rubric_criteria_insert on public.rubric_criteria for insert to authenticated
with check (exists (select 1 from public.rubric_versions rv join public.rubrics r on r.id = rv.rubric_id where rv.id = rubric_version_id and r.status = 'draft' and private.has_program_role(r.program_id, array['program_director', 'assessment_lead']::text[])));
create policy rubric_criteria_update on public.rubric_criteria for update to authenticated
using (exists (select 1 from public.rubric_versions rv join public.rubrics r on r.id = rv.rubric_id where rv.id = rubric_version_id and r.status = 'draft' and private.has_program_role(r.program_id, array['program_director', 'assessment_lead']::text[])))
with check (exists (select 1 from public.rubric_versions rv join public.rubrics r on r.id = rv.rubric_id where rv.id = rubric_version_id and r.status = 'draft' and private.has_program_role(r.program_id, array['program_director', 'assessment_lead']::text[])));
create policy rubric_criteria_delete on public.rubric_criteria for delete to authenticated
using (exists (select 1 from public.rubric_versions rv join public.rubrics r on r.id = rv.rubric_id where rv.id = rubric_version_id and r.status = 'draft' and private.has_program_role(r.program_id, array['program_director', 'assessment_lead']::text[])));

create policy question_rubrics_select on public.question_rubrics for select to authenticated
using (exists (select 1 from public.question_versions qv join public.questions q on q.id = qv.question_id where qv.id = question_version_id and private.has_program_role(q.program_id, array['program_director', 'assessment_lead', 'reviewer']::text[])));
create policy question_rubrics_insert on public.question_rubrics for insert to authenticated
with check (created_by = (select auth.uid()) and exists (select 1 from public.question_versions qv join public.questions q on q.id = qv.question_id where qv.id = question_version_id and private.has_program_role(q.program_id, array['program_director', 'assessment_lead']::text[])));
create policy question_rubrics_update on public.question_rubrics for update to authenticated
using (exists (select 1 from public.question_versions qv join public.questions q on q.id = qv.question_id where qv.id = question_version_id and private.has_program_role(q.program_id, array['program_director', 'assessment_lead']::text[])))
with check (exists (select 1 from public.question_versions qv join public.questions q on q.id = qv.question_id where qv.id = question_version_id and private.has_program_role(q.program_id, array['program_director', 'assessment_lead']::text[])));
create policy question_rubrics_delete on public.question_rubrics for delete to authenticated
using (exists (select 1 from public.question_versions qv join public.questions q on q.id = qv.question_id where qv.id = question_version_id and private.has_program_role(q.program_id, array['program_director', 'assessment_lead']::text[])));

create policy ai_grading_runs_select on public.ai_grading_runs for select to authenticated
using (private.can_grade_response(response_id));
create policy ai_grading_runs_insert on public.ai_grading_runs for insert to authenticated
with check (requested_by = (select auth.uid()) and private.can_grade_response(response_id));
create policy ai_grading_runs_update on public.ai_grading_runs for update to authenticated
using (requested_by = (select auth.uid()) and private.can_grade_response(response_id))
with check (requested_by = (select auth.uid()) and private.can_grade_response(response_id));

create policy ai_criterion_scores_select on public.ai_criterion_scores for select to authenticated
using (exists (select 1 from public.ai_grading_runs agr where agr.id = grading_run_id and private.can_grade_response(agr.response_id)));
create policy ai_criterion_scores_insert on public.ai_criterion_scores for insert to authenticated
with check (exists (select 1 from public.ai_grading_runs agr where agr.id = grading_run_id and agr.requested_by = (select auth.uid()) and private.can_grade_response(agr.response_id)));
create policy ai_criterion_scores_update on public.ai_criterion_scores for update to authenticated
using (exists (select 1 from public.ai_grading_runs agr where agr.id = grading_run_id and agr.requested_by = (select auth.uid()) and private.can_grade_response(agr.response_id)))
with check (exists (select 1 from public.ai_grading_runs agr where agr.id = grading_run_id and agr.requested_by = (select auth.uid()) and private.can_grade_response(agr.response_id)));

create policy human_reviews_select on public.human_reviews for select to authenticated
using (private.can_grade_response(response_id));
create policy human_reviews_insert on public.human_reviews for insert to authenticated
with check (reviewer_id = (select auth.uid()) and private.can_grade_response(response_id));
create policy human_reviews_update on public.human_reviews for update to authenticated
using ((reviewer_id = (select auth.uid()) and private.can_grade_response(response_id)) or private.can_finalize_response(response_id))
with check ((reviewer_id = (select auth.uid()) and private.can_grade_response(response_id)) or private.can_finalize_response(response_id));

create policy human_criterion_scores_select on public.human_criterion_scores for select to authenticated
using (exists (select 1 from public.human_reviews hr where hr.id = human_review_id and private.can_grade_response(hr.response_id)));
create policy human_criterion_scores_insert on public.human_criterion_scores for insert to authenticated
with check (exists (select 1 from public.human_reviews hr where hr.id = human_review_id and hr.reviewer_id = (select auth.uid()) and private.can_grade_response(hr.response_id)));
create policy human_criterion_scores_update on public.human_criterion_scores for update to authenticated
using (exists (select 1 from public.human_reviews hr where hr.id = human_review_id and hr.reviewer_id = (select auth.uid()) and private.can_grade_response(hr.response_id)))
with check (exists (select 1 from public.human_reviews hr where hr.id = human_review_id and hr.reviewer_id = (select auth.uid()) and private.can_grade_response(hr.response_id)));
create policy human_criterion_scores_delete on public.human_criterion_scores for delete to authenticated
using (exists (select 1 from public.human_reviews hr where hr.id = human_review_id and hr.reviewer_id = (select auth.uid()) and private.can_grade_response(hr.response_id)));

create policy moderation_cases_select on public.moderation_cases for select to authenticated
using (private.can_grade_response(response_id));
create policy moderation_cases_insert on public.moderation_cases for insert to authenticated
with check (opened_by = (select auth.uid()) and private.can_grade_response(response_id));
create policy moderation_cases_update on public.moderation_cases for update to authenticated
using (private.can_finalize_response(response_id))
with check (private.can_finalize_response(response_id));

create policy final_score_decisions_select on public.final_score_decisions for select to authenticated
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
);
create policy final_score_decisions_insert on public.final_score_decisions for insert to authenticated
with check (decided_by = (select auth.uid()) and private.can_finalize_response(response_id));
create policy final_score_decisions_update on public.final_score_decisions for update to authenticated
using (private.can_finalize_response(response_id))
with check (decided_by = (select auth.uid()) and private.can_finalize_response(response_id));

revoke all on public.rubrics, public.rubric_versions, public.rubric_criteria, public.question_rubrics,
  public.ai_grading_runs, public.ai_criterion_scores, public.human_reviews, public.human_criterion_scores,
  public.moderation_cases, public.final_score_decisions from anon;

grant select, insert, update, delete on public.rubrics to authenticated;
grant select, insert on public.rubric_versions to authenticated;
grant select, insert, update, delete on public.rubric_criteria to authenticated;
grant select, insert, update, delete on public.question_rubrics to authenticated;
grant select, insert, update on public.ai_grading_runs to authenticated;
grant select, insert, update on public.ai_criterion_scores to authenticated;
grant select, insert, update on public.human_reviews to authenticated;
grant select, insert, update, delete on public.human_criterion_scores to authenticated;
grant select, insert, update on public.moderation_cases to authenticated;
grant select, insert, update on public.final_score_decisions to authenticated;

commit;
