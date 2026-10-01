-- Teacher review assignments and facilitator task queue.
-- Keeps written scoring blinded, distributes work across active peer educators/reviewers,
-- and preserves independent second-rating for quality samples.

create table if not exists public.review_assignments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  response_id uuid not null references public.student_responses(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  assignment_kind text not null check (assignment_kind in ('primary','second')),
  status text not null default 'assigned' check (status in ('assigned','completed','cancelled')),
  assigned_at timestamptz not null default now(),
  completed_at timestamptz null,
  updated_at timestamptz not null default now(),
  unique (response_id, assignment_kind),
  unique (response_id, reviewer_id)
);

create index if not exists review_assignments_reviewer_status_idx
  on public.review_assignments(program_id, reviewer_id, status);

create index if not exists review_assignments_response_idx
  on public.review_assignments(response_id);

alter table public.review_assignments enable row level security;

revoke all on table public.review_assignments from anon;
revoke insert, update, delete on table public.review_assignments from authenticated;
grant select on table public.review_assignments to authenticated;

drop policy if exists review_assignments_select on public.review_assignments;
create policy review_assignments_select
on public.review_assignments
for select
to authenticated
using (
  reviewer_id = (select auth.uid())
  or private.is_platform_admin()
  or private.has_program_role(program_id, array['program_director','assessment_lead']::text[])
);

create or replace function private.refresh_review_assignments(target_program_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  response_row record;
  chosen_reviewer uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('review-assignments:' || target_program_id::text, 0)
  );

  update public.review_assignments ra
  set status='completed', completed_at=coalesce(ra.completed_at, now()), updated_at=now()
  where ra.program_id=target_program_id
    and ra.status='assigned'
    and exists (
      select 1
      from public.human_reviews hr
      where hr.response_id=ra.response_id
        and hr.reviewer_id=ra.reviewer_id
        and hr.status='submitted'
    );

  update public.review_assignments ra
  set status='cancelled', updated_at=now()
  where ra.program_id=target_program_id
    and ra.assignment_kind='second'
    and ra.status='assigned'
    and not exists (
      select 1
      from public.grading_quality_samples gqs
      where gqs.response_id=ra.response_id
        and gqs.program_id=target_program_id
        and gqs.status='assigned'
    );

  for response_row in
    select sr.id
    from public.student_responses sr
    join public.assessment_attempts aa on aa.id=sr.attempt_id
    join public.assessments a on a.id=aa.assessment_id
    join public.cohorts c on c.id=a.cohort_id
    join public.question_rubrics qr on qr.question_version_id=sr.question_version_id
    left join public.final_score_decisions fsd on fsd.response_id=sr.id
    where c.program_id=target_program_id
      and aa.status in ('submitted','late')
      and nullif(trim(sr.text_response),'') is not null
      and fsd.id is null
      and not exists (
        select 1
        from public.review_assignments current_assignment
        where current_assignment.response_id=sr.id
          and current_assignment.assignment_kind='primary'
          and current_assignment.status in ('assigned','completed')
      )
    order by sr.submitted_at, sr.id
  loop
    chosen_reviewer := null;

    select eligible.user_id
    into chosen_reviewer
    from (
      select distinct pm.user_id
      from public.program_memberships pm
      where pm.program_id=target_program_id
        and pm.status='active'
        and pm.role in ('peer_educator','reviewer')
        and not exists (
          select 1
          from public.program_memberships manager_membership
          where manager_membership.program_id=pm.program_id
            and manager_membership.user_id=pm.user_id
            and manager_membership.status='active'
            and manager_membership.role in ('program_director','assessment_lead')
        )
    ) eligible
    where not exists (
      select 1
      from public.human_reviews existing_review
      where existing_review.response_id=response_row.id
        and existing_review.reviewer_id=eligible.user_id
    )
    order by
      (
        select count(*)
        from public.review_assignments workload
        where workload.program_id=target_program_id
          and workload.reviewer_id=eligible.user_id
          and workload.status='assigned'
      ),
      eligible.user_id
    limit 1;

    if chosen_reviewer is not null then
      insert into public.review_assignments(
        program_id, response_id, reviewer_id, assignment_kind, status, assigned_at, completed_at, updated_at
      )
      values(
        target_program_id, response_row.id, chosen_reviewer, 'primary', 'assigned', now(), null, now()
      )
      on conflict (response_id, assignment_kind) do update
      set reviewer_id=excluded.reviewer_id,
          status='assigned',
          assigned_at=now(),
          completed_at=null,
          updated_at=now()
      where public.review_assignments.status='cancelled';
    end if;
  end loop;

  for response_row in
    select gqs.response_id as id
    from public.grading_quality_samples gqs
    join public.student_responses sr on sr.id=gqs.response_id
    join public.assessment_attempts aa on aa.id=sr.attempt_id
    left join public.final_score_decisions fsd on fsd.response_id=sr.id
    where gqs.program_id=target_program_id
      and gqs.status='assigned'
      and gqs.required_reviews >= 2
      and aa.status in ('submitted','late')
      and fsd.id is null
      and not exists (
        select 1
        from public.review_assignments current_assignment
        where current_assignment.response_id=gqs.response_id
          and current_assignment.assignment_kind='second'
          and current_assignment.status in ('assigned','completed')
      )
    order by gqs.created_at, gqs.response_id
  loop
    chosen_reviewer := null;

    select eligible.user_id
    into chosen_reviewer
    from (
      select distinct pm.user_id
      from public.program_memberships pm
      where pm.program_id=target_program_id
        and pm.status='active'
        and pm.role in ('peer_educator','reviewer')
        and not exists (
          select 1
          from public.program_memberships manager_membership
          where manager_membership.program_id=pm.program_id
            and manager_membership.user_id=pm.user_id
            and manager_membership.status='active'
            and manager_membership.role in ('program_director','assessment_lead')
        )
    ) eligible
    where not exists (
      select 1
      from public.review_assignments any_assignment
      where any_assignment.response_id=response_row.id
        and any_assignment.reviewer_id=eligible.user_id
        and any_assignment.status in ('assigned','completed')
    )
      and not exists (
        select 1
        from public.human_reviews existing_review
        where existing_review.response_id=response_row.id
          and existing_review.reviewer_id=eligible.user_id
      )
    order by
      (
        select count(*)
        from public.review_assignments workload
        where workload.program_id=target_program_id
          and workload.reviewer_id=eligible.user_id
          and workload.status='assigned'
      ),
      eligible.user_id
    limit 1;

    if chosen_reviewer is not null then
      insert into public.review_assignments(
        program_id, response_id, reviewer_id, assignment_kind, status, assigned_at, completed_at, updated_at
      )
      values(
        target_program_id, response_row.id, chosen_reviewer, 'second', 'assigned', now(), null, now()
      )
      on conflict (response_id, assignment_kind) do update
      set reviewer_id=excluded.reviewer_id,
          status='assigned',
          assigned_at=now(),
          completed_at=null,
          updated_at=now()
      where public.review_assignments.status='cancelled';
    end if;
  end loop;
end;
$$;

revoke all on function private.refresh_review_assignments(uuid) from public, anon, authenticated;

create or replace function private.can_grade_response(target_response_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select
    private.is_platform_admin()
    or private.has_program_role(
      private.response_program_id(target_response_id),
      array['program_director','assessment_lead']::text[]
    )
    or exists (
      select 1
      from public.review_assignments ra
      join public.program_memberships pm
        on pm.program_id=ra.program_id
       and pm.user_id=ra.reviewer_id
       and pm.status='active'
       and pm.role in ('peer_educator','reviewer')
      where ra.response_id=target_response_id
        and ra.reviewer_id=auth.uid()
        and ra.status in ('assigned','completed')
    );
$$;

create or replace function private.complete_review_assignment()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.status='submitted' then
    update public.review_assignments
    set status='completed',
        completed_at=coalesce(completed_at, now()),
        updated_at=now()
    where response_id=new.response_id
      and reviewer_id=new.reviewer_id
      and status='assigned';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_complete_review_assignment on public.human_reviews;
create trigger trg_complete_review_assignment
after insert or update of status on public.human_reviews
for each row execute function private.complete_review_assignment();

create or replace function public.ten_review_queue(target_program_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  is_manager boolean;
  result jsonb;
begin
  if uid is null then
    raise exception 'Sign in required' using errcode='42501';
  end if;

  is_manager :=
    private.is_platform_admin()
    or private.has_program_role(target_program_id,array['program_director','assessment_lead']::text[]);

  if not is_manager
    and not private.has_program_role(target_program_id,array['peer_educator','reviewer']::text[])
  then
    raise exception 'Reviewer access required' using errcode='42501';
  end if;

  perform private.refresh_review_assignments(target_program_id);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'response_id',sr.id,
        'assessment_title',a.title,
        'question_code',q.question_code,
        'submitted_at',sr.submitted_at,
        'existing_review_id',hr.id,
        'existing_review_status',hr.status,
        'finalized',fsd.id is not null,
        'moderation_required',exists(
          select 1
          from public.moderation_cases m
          where m.response_id=sr.id
            and m.status in ('open','in_review')
        ),
        'sampled',exists(
          select 1
          from public.grading_quality_samples sample
          where sample.response_id=sr.id
            and sample.status in ('assigned','complete')
        ),
        'assignment_kind',ra.assignment_kind,
        'assignment_status',ra.status,
        'assigned_to_me',ra.id is not null
      )
      order by sr.submitted_at,q.question_code
    ),
    '[]'::jsonb
  )
  into result
  from public.student_responses sr
  join public.assessment_attempts aa on aa.id=sr.attempt_id
  join public.assessments a on a.id=aa.assessment_id
  join public.cohorts c on c.id=a.cohort_id
  join public.question_versions qv on qv.id=sr.question_version_id
  join public.questions q on q.id=qv.question_id
  join public.question_rubrics qr on qr.question_version_id=sr.question_version_id
  left join public.human_reviews hr
    on hr.response_id=sr.id
   and hr.reviewer_id=uid
  left join public.final_score_decisions fsd
    on fsd.response_id=sr.id
  left join public.review_assignments ra
    on ra.response_id=sr.id
   and ra.reviewer_id=uid
   and ra.status in ('assigned','completed')
  where c.program_id=target_program_id
    and aa.status in ('submitted','late')
    and nullif(trim(sr.text_response),'') is not null
    and (is_manager or ra.id is not null);

  return result;
end;
$$;

revoke all on function public.ten_review_queue(uuid) from public, anon;
grant execute on function public.ten_review_queue(uuid) to authenticated;

-- Existing Peer Educators become members of the reviewer pool without losing their teaching role.
-- Access to individual responses is still controlled by review_assignments.
insert into public.program_memberships(program_id,user_id,role,status)
select program_id,user_id,'reviewer','active'
from public.program_memberships
where role='peer_educator'
  and status='active'
on conflict(program_id,user_id,role) do update
set status='active', updated_at=now();

-- Existing submitted reviews, if any, are represented as completed primary assignments.
insert into public.review_assignments(
  program_id,response_id,reviewer_id,assignment_kind,status,assigned_at,completed_at,updated_at
)
select
  c.program_id,
  hr.response_id,
  hr.reviewer_id,
  'primary',
  'completed',
  coalesce(hr.submitted_at,hr.updated_at,now()),
  coalesce(hr.submitted_at,hr.updated_at,now()),
  now()
from public.human_reviews hr
join public.student_responses sr on sr.id=hr.response_id
join public.assessment_attempts aa on aa.id=sr.attempt_id
join public.assessments a on a.id=aa.assessment_id
join public.cohorts c on c.id=a.cohort_id
where hr.status='submitted'
on conflict do nothing;
