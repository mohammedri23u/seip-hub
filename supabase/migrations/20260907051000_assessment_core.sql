-- SEIP Hub Stage 3 — Assessment Core
-- Question bank, versioning, blueprints, exam lifecycle, learner attempts, and secure objective scoring.

begin;

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  question_code text not null,
  question_type text not null check (question_type in ('single_best_answer', 'multiple_response', 'true_false', 'short_answer', 'structured_written', 'reflection')),
  status text not null default 'draft' check (status in ('draft', 'review', 'approved', 'retired')),
  author_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, question_code)
);

create table public.question_versions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  stem text not null,
  explanation text,
  difficulty_target text check (difficulty_target is null or difficulty_target in ('easy', 'moderate', 'hard', 'expert')),
  marks numeric(8,3) not null default 1 check (marks > 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (question_id, version_number)
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_version_id uuid not null references public.question_versions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  position integer not null check (position > 0),
  unique (question_version_id, position)
);

create table public.question_learning_objectives (
  question_version_id uuid not null references public.question_versions(id) on delete cascade,
  learning_objective_id uuid not null references public.learning_objectives(id) on delete cascade,
  weight numeric(6,3) check (weight is null or (weight >= 0 and weight <= 100)),
  created_at timestamptz not null default now(),
  primary key (question_version_id, learning_objective_id)
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  title text not null,
  description text,
  assessment_type text not null check (assessment_type in ('diagnostic', 'formative', 'session_quiz', 'progress', 'final')),
  status text not null default 'draft' check (status in ('draft', 'review', 'approved', 'scheduled', 'live', 'closed', 'grading', 'moderation', 'approved_results', 'released')),
  opens_at timestamptz,
  closes_at timestamptz,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at is null or opens_at is null or closes_at > opens_at)
);

create table public.assessment_blueprint (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  learning_objective_id uuid not null references public.learning_objectives(id) on delete cascade,
  target_weight numeric(6,3) check (target_weight is null or (target_weight >= 0 and target_weight <= 100)),
  target_marks numeric(8,3) check (target_marks is null or target_marks >= 0),
  created_at timestamptz not null default now(),
  unique (assessment_id, learning_objective_id)
);

create table public.assessment_items (
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  question_version_id uuid not null references public.question_versions(id),
  position integer not null check (position > 0),
  marks numeric(8,3) not null check (marks > 0),
  created_at timestamptz not null default now(),
  primary key (assessment_id, question_version_id),
  unique (assessment_id, position)
);

create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  learner_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'late', 'invalidated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, learner_id),
  check (submitted_at is null or submitted_at >= started_at)
);

create table public.student_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  question_version_id uuid not null references public.question_versions(id),
  selected_option_id uuid references public.question_options(id),
  selected_option_ids uuid[],
  text_response text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, question_version_id)
);

create table public.machine_scores (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null unique references public.student_responses(id) on delete cascade,
  score numeric(8,3) not null,
  max_score numeric(8,3) not null check (max_score > 0),
  scoring_rule_version text not null default 'objective_v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (score >= 0 and score <= max_score)
);

create index questions_program_status_idx on public.questions (program_id, status);
create index question_versions_question_idx on public.question_versions (question_id, version_number desc);
create index question_options_version_idx on public.question_options (question_version_id, position);
create index question_lo_lo_idx on public.question_learning_objectives (learning_objective_id, question_version_id);
create index assessments_cohort_status_idx on public.assessments (cohort_id, status, opens_at);
create index assessment_blueprint_assessment_idx on public.assessment_blueprint (assessment_id);
create index assessment_items_assessment_idx on public.assessment_items (assessment_id, position);
create index assessment_attempts_learner_idx on public.assessment_attempts (learner_id, assessment_id);
create index student_responses_attempt_idx on public.student_responses (attempt_id);

create trigger questions_set_updated_at before update on public.questions
for each row execute function private.set_updated_at();
create trigger assessments_set_updated_at before update on public.assessments
for each row execute function private.set_updated_at();
create trigger assessment_attempts_set_updated_at before update on public.assessment_attempts
for each row execute function private.set_updated_at();
create trigger student_responses_set_updated_at before update on public.student_responses
for each row execute function private.set_updated_at();
create trigger machine_scores_set_updated_at before update on public.machine_scores
for each row execute function private.set_updated_at();

create or replace function private.assessment_program_id(target_assessment_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.program_id
  from public.assessments a
  join public.cohorts c on c.id = a.cohort_id
  where a.id = target_assessment_id;
$$;

create or replace function private.can_manage_assessment(target_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_program_role(
    private.assessment_program_id(target_assessment_id),
    array['program_director', 'assessment_lead']::text[]
  );
$$;

create or replace function private.can_take_assessment(target_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.assessments a
       join public.cohort_memberships cm on cm.cohort_id = a.cohort_id
       where a.id = target_assessment_id
         and cm.user_id = auth.uid()
         and cm.member_type = 'learner'
         and cm.status = 'active'
         and a.status = 'live'
         and (a.opens_at is null or now() >= a.opens_at)
         and (a.closes_at is null or now() <= a.closes_at)
     );
$$;

revoke all on function private.assessment_program_id(uuid) from public, anon;
revoke all on function private.can_manage_assessment(uuid) from public, anon;
revoke all on function private.can_take_assessment(uuid) from public, anon;
grant execute on function private.assessment_program_id(uuid) to authenticated;
grant execute on function private.can_manage_assessment(uuid) to authenticated;
grant execute on function private.can_take_assessment(uuid) to authenticated;

create or replace function private.validate_assessment_item_program()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assessment_program uuid;
  question_program uuid;
begin
  select c.program_id into assessment_program
  from public.assessments a
  join public.cohorts c on c.id = a.cohort_id
  where a.id = new.assessment_id;

  select q.program_id into question_program
  from public.question_versions qv
  join public.questions q on q.id = qv.question_id
  where qv.id = new.question_version_id;

  if assessment_program is null or question_program is null or assessment_program <> question_program then
    raise exception 'Assessment item and question must belong to the same program';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_assessment_item_program() from public, anon, authenticated;
create trigger assessment_items_same_program
before insert or update on public.assessment_items
for each row execute function private.validate_assessment_item_program();

create or replace function private.validate_blueprint_program()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assessment_program uuid;
  objective_program uuid;
begin
  assessment_program := private.assessment_program_id(new.assessment_id);
  select program_id into objective_program from public.learning_objectives where id = new.learning_objective_id;

  if assessment_program is null or objective_program is null or assessment_program <> objective_program then
    raise exception 'Blueprint objective and assessment must belong to the same program';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_blueprint_program() from public, anon, authenticated;
create trigger assessment_blueprint_same_program
before insert or update on public.assessment_blueprint
for each row execute function private.validate_blueprint_program();

create or replace function private.validate_response_option()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.selected_option_id is not null and not exists (
    select 1 from public.question_options qo
    where qo.id = new.selected_option_id
      and qo.question_version_id = new.question_version_id
  ) then
    raise exception 'Selected option does not belong to the question version';
  end if;

  if new.selected_option_ids is not null and exists (
    select 1 from unnest(new.selected_option_ids) option_id
    where not exists (
      select 1 from public.question_options qo
      where qo.id = option_id
        and qo.question_version_id = new.question_version_id
    )
  ) then
    raise exception 'One or more selected options do not belong to the question version';
  end if;

  if not exists (
    select 1 from public.assessment_attempts aa
    join public.assessment_items ai on ai.assessment_id = aa.assessment_id
    where aa.id = new.attempt_id
      and ai.question_version_id = new.question_version_id
  ) then
    raise exception 'Question is not part of the assessment attempt';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_response_option() from public, anon, authenticated;
create trigger student_responses_validate
before insert or update on public.student_responses
for each row execute function private.validate_response_option();

create or replace function private.score_objective_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  qtype text;
  item_marks numeric(8,3);
  correct_option_id uuid;
  correct_option_ids uuid[];
  computed_score numeric(8,3) := 0;
begin
  select q.question_type, ai.marks
    into qtype, item_marks
  from public.question_versions qv
  join public.questions q on q.id = qv.question_id
  join public.assessment_attempts aa on aa.id = new.attempt_id
  join public.assessment_items ai on ai.assessment_id = aa.assessment_id and ai.question_version_id = new.question_version_id
  where qv.id = new.question_version_id;

  if qtype in ('single_best_answer', 'true_false') then
    select qo.id into correct_option_id
    from public.question_options qo
    where qo.question_version_id = new.question_version_id and qo.is_correct
    order by qo.position
    limit 1;

    if correct_option_id is not null and new.selected_option_id = correct_option_id then
      computed_score := item_marks;
    end if;
  elsif qtype = 'multiple_response' then
    select coalesce(array_agg(qo.id order by qo.id), '{}'::uuid[]) into correct_option_ids
    from public.question_options qo
    where qo.question_version_id = new.question_version_id and qo.is_correct;

    if coalesce((select array_agg(x order by x) from unnest(coalesce(new.selected_option_ids, '{}'::uuid[])) x), '{}'::uuid[])
       = coalesce(correct_option_ids, '{}'::uuid[]) then
      computed_score := item_marks;
    end if;
  else
    delete from public.machine_scores where response_id = new.id;
    return new;
  end if;

  insert into public.machine_scores (response_id, score, max_score, scoring_rule_version)
  values (new.id, computed_score, item_marks, 'objective_v1')
  on conflict (response_id) do update
    set score = excluded.score,
        max_score = excluded.max_score,
        scoring_rule_version = excluded.scoring_rule_version,
        updated_at = now();

  return new;
end;
$$;

revoke all on function private.score_objective_response() from public, anon, authenticated;
create trigger student_responses_score_objective
after insert or update on public.student_responses
for each row execute function private.score_objective_response();


create or replace function public.get_assessment_delivery(target_assessment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  payload jsonb;
begin
  if not private.can_take_assessment(target_assessment_id) then
    raise exception 'Assessment is not available to this learner';
  end if;

  select jsonb_build_object(
    'assessment_id', a.id,
    'title', a.title,
    'description', a.description,
    'duration_minutes', a.duration_minutes,
    'opens_at', a.opens_at,
    'closes_at', a.closes_at,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'question_version_id', qv.id,
          'position', ai.position,
          'marks', ai.marks,
          'question_type', q.question_type,
          'stem', qv.stem,
          'options', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', qo.id,
                'text', qo.option_text,
                'position', qo.position
              ) order by qo.position
            )
            from public.question_options qo
            where qo.question_version_id = qv.id
          ), '[]'::jsonb)
        ) order by ai.position
      )
      from public.assessment_items ai
      join public.question_versions qv on qv.id = ai.question_version_id
      join public.questions q on q.id = qv.question_id
      where ai.assessment_id = a.id
    ), '[]'::jsonb)
  ) into payload
  from public.assessments a
  where a.id = target_assessment_id;

  return payload;
end;
$$;

revoke all on function public.get_assessment_delivery(uuid) from public, anon;
grant execute on function public.get_assessment_delivery(uuid) to authenticated;

alter table public.questions enable row level security;
alter table public.question_versions enable row level security;
alter table public.question_options enable row level security;
alter table public.question_learning_objectives enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_blueprint enable row level security;
alter table public.assessment_items enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.student_responses enable row level security;
alter table public.machine_scores enable row level security;

create policy questions_select on public.questions for select to authenticated
using (private.has_program_role(program_id, array['program_director', 'assessment_lead', 'reviewer']::text[]));
create policy questions_insert on public.questions for insert to authenticated
with check (
  author_id = (select auth.uid())
  and private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[])
);
create policy questions_update on public.questions for update to authenticated
using (private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[]))
with check (private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[]));
create policy questions_delete on public.questions for delete to authenticated
using (private.has_program_role(program_id, array['program_director', 'assessment_lead']::text[]));

create policy question_versions_select on public.question_versions for select to authenticated
using (
  exists (
    select 1 from public.questions q
    where q.id = question_id and private.has_program_role(q.program_id, array['program_director', 'assessment_lead', 'reviewer']::text[])
  )
);
create policy question_versions_insert on public.question_versions for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.questions q
    where q.id = question_id
      and private.has_program_role(q.program_id, array['program_director', 'assessment_lead']::text[])
  )
);

create policy question_options_select on public.question_options for select to authenticated
using (
  exists (
    select 1 from public.question_versions qv
    join public.questions q on q.id = qv.question_id
    where qv.id = question_version_id and private.has_program_role(q.program_id, array['program_director', 'assessment_lead', 'reviewer']::text[])
  )
);
create policy question_options_insert on public.question_options for insert to authenticated
with check (
  exists (
    select 1 from public.question_versions qv
    join public.questions q on q.id = qv.question_id
    where qv.id = question_version_id
      and private.has_program_role(q.program_id, array['program_director', 'assessment_lead']::text[])
  )
);
create policy question_options_update on public.question_options for update to authenticated
using (
  exists (
    select 1 from public.question_versions qv
    join public.questions q on q.id = qv.question_id
    where qv.id = question_version_id
      and private.has_program_role(q.program_id, array['program_director', 'assessment_lead']::text[])
  )
)
with check (
  exists (
    select 1 from public.question_versions qv
    join public.questions q on q.id = qv.question_id
    where qv.id = question_version_id
      and private.has_program_role(q.program_id, array['program_director', 'assessment_lead']::text[])
  )
);
create policy question_options_delete on public.question_options for delete to authenticated
using (
  exists (
    select 1 from public.question_versions qv
    join public.questions q on q.id = qv.question_id
    where qv.id = question_version_id
      and private.has_program_role(q.program_id, array['program_director', 'assessment_lead']::text[])
  )
);

create policy question_lo_select on public.question_learning_objectives for select to authenticated
using (
  exists (
    select 1 from public.question_versions qv
    join public.questions q on q.id = qv.question_id
    where qv.id = question_version_id and private.has_program_role(q.program_id, array['program_director', 'assessment_lead', 'reviewer']::text[])
  )
);
create policy question_lo_insert on public.question_learning_objectives for insert to authenticated
with check (
  exists (
    select 1 from public.question_versions qv
    join public.questions q on q.id = qv.question_id
    join public.learning_objectives lo on lo.id = learning_objective_id
    where qv.id = question_version_id
      and lo.program_id = q.program_id
      and private.has_program_role(q.program_id, array['program_director', 'assessment_lead']::text[])
  )
);
create policy question_lo_delete on public.question_learning_objectives for delete to authenticated
using (
  exists (
    select 1 from public.question_versions qv
    join public.questions q on q.id = qv.question_id
    where qv.id = question_version_id
      and private.has_program_role(q.program_id, array['program_director', 'assessment_lead']::text[])
  )
);

create policy assessments_select on public.assessments for select to authenticated
using (
  private.can_manage_assessment(id)
  or private.is_cohort_member(cohort_id)
  or exists (
    select 1 from public.cohorts c where c.id = cohort_id and private.is_program_member(c.program_id)
  )
);
create policy assessments_insert on public.assessments for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.cohorts c
    where c.id = cohort_id
      and private.has_program_role(c.program_id, array['program_director', 'assessment_lead']::text[])
  )
);
create policy assessments_update on public.assessments for update to authenticated
using (private.can_manage_assessment(id))
with check (private.can_manage_assessment(id));
create policy assessments_delete on public.assessments for delete to authenticated
using (private.can_manage_assessment(id));

create policy assessment_blueprint_select on public.assessment_blueprint for select to authenticated
using (private.can_manage_assessment(assessment_id));
create policy assessment_blueprint_insert on public.assessment_blueprint for insert to authenticated
with check (private.can_manage_assessment(assessment_id));
create policy assessment_blueprint_update on public.assessment_blueprint for update to authenticated
using (private.can_manage_assessment(assessment_id))
with check (private.can_manage_assessment(assessment_id));
create policy assessment_blueprint_delete on public.assessment_blueprint for delete to authenticated
using (private.can_manage_assessment(assessment_id));

create policy assessment_items_select on public.assessment_items for select to authenticated
using (private.can_manage_assessment(assessment_id));
create policy assessment_items_insert on public.assessment_items for insert to authenticated
with check (private.can_manage_assessment(assessment_id));
create policy assessment_items_update on public.assessment_items for update to authenticated
using (private.can_manage_assessment(assessment_id))
with check (private.can_manage_assessment(assessment_id));
create policy assessment_items_delete on public.assessment_items for delete to authenticated
using (private.can_manage_assessment(assessment_id));

create policy attempts_select on public.assessment_attempts for select to authenticated
using (learner_id = (select auth.uid()) or private.can_manage_assessment(assessment_id));
create policy attempts_insert on public.assessment_attempts for insert to authenticated
with check (
  learner_id = (select auth.uid())
  and private.can_take_assessment(assessment_id)
);
create policy attempts_update_own on public.assessment_attempts for update to authenticated
using (learner_id = (select auth.uid()) and status = 'in_progress')
with check (learner_id = (select auth.uid()) and status in ('in_progress', 'submitted', 'late'));
create policy attempts_update_manage on public.assessment_attempts for update to authenticated
using (private.can_manage_assessment(assessment_id))
with check (private.can_manage_assessment(assessment_id));

create policy responses_select on public.student_responses for select to authenticated
using (
  exists (
    select 1 from public.assessment_attempts aa
    where aa.id = attempt_id and (aa.learner_id = (select auth.uid()) or private.can_manage_assessment(aa.assessment_id))
  )
);
create policy responses_insert on public.student_responses for insert to authenticated
with check (
  exists (
    select 1 from public.assessment_attempts aa
    where aa.id = attempt_id
      and aa.learner_id = (select auth.uid())
      and aa.status = 'in_progress'
      and private.can_take_assessment(aa.assessment_id)
  )
);
create policy responses_update on public.student_responses for update to authenticated
using (
  exists (
    select 1 from public.assessment_attempts aa
    where aa.id = attempt_id
      and aa.learner_id = (select auth.uid())
      and aa.status = 'in_progress'
      and private.can_take_assessment(aa.assessment_id)
  )
)
with check (
  exists (
    select 1 from public.assessment_attempts aa
    where aa.id = attempt_id
      and aa.learner_id = (select auth.uid())
      and aa.status = 'in_progress'
      and private.can_take_assessment(aa.assessment_id)
  )
);

create policy machine_scores_select on public.machine_scores for select to authenticated
using (
  exists (
    select 1
    from public.student_responses sr
    join public.assessment_attempts aa on aa.id = sr.attempt_id
    join public.assessments a on a.id = aa.assessment_id
    where sr.id = response_id
      and (
        private.can_manage_assessment(aa.assessment_id)
        or (aa.learner_id = (select auth.uid()) and a.status = 'released')
      )
  )
);

revoke all on public.questions, public.question_versions, public.question_options,
  public.question_learning_objectives, public.assessments, public.assessment_blueprint,
  public.assessment_items, public.assessment_attempts, public.student_responses,
  public.machine_scores from anon;

grant select, insert, update, delete on public.questions to authenticated;
grant select, insert on public.question_versions to authenticated;
grant select, insert, update, delete on public.question_options to authenticated;
grant select, insert, delete on public.question_learning_objectives to authenticated;
grant select, insert, update, delete on public.assessments to authenticated;
grant select, insert, update, delete on public.assessment_blueprint to authenticated;
grant select, insert, update, delete on public.assessment_items to authenticated;
grant select, insert, update on public.assessment_attempts to authenticated;
grant select, insert, update on public.student_responses to authenticated;
grant select on public.machine_scores to authenticated;

commit;
