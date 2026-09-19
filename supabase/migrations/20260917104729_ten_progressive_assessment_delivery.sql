create or replace function private.can_submit_response(target_attempt_id uuid, target_question_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assessment_attempts aa
    join public.assessments a on a.id = aa.assessment_id
    where aa.id = target_attempt_id
      and aa.learner_id = auth.uid()
      and aa.status = 'in_progress'
      and private.can_take_assessment(aa.assessment_id)
      and exists (
        select 1 from public.assessment_items ai
        where ai.assessment_id = aa.assessment_id
          and ai.question_version_id = target_question_version_id
          and (
            a.assessment_type <> 'progress'
            or ai.position = (
              select count(*) + 1
              from public.student_responses sr
              where sr.attempt_id = aa.id
            )
          )
      )
  );
$$;

alter policy responses_insert on public.student_responses
  with check (private.can_submit_response(attempt_id, question_version_id));

alter policy responses_update on public.student_responses
  using (
    exists (
      select 1
      from public.assessment_attempts aa
      join public.assessments a on a.id = aa.assessment_id
      where aa.id = student_responses.attempt_id
        and aa.learner_id = auth.uid()
        and aa.status = 'in_progress'
        and a.assessment_type <> 'progress'
        and private.can_take_assessment(aa.assessment_id)
    )
  )
  with check (
    exists (
      select 1
      from public.assessment_attempts aa
      join public.assessments a on a.id = aa.assessment_id
      where aa.id = student_responses.attempt_id
        and aa.learner_id = auth.uid()
        and aa.status = 'in_progress'
        and a.assessment_type <> 'progress'
        and private.can_take_assessment(aa.assessment_id)
    )
  );

create or replace function public.get_progressive_assessment_step(target_assessment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  aid uuid;
  responded integer;
  total_items integer;
  next_position integer;
  payload jsonb;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not private.can_take_assessment(target_assessment_id) then
    raise exception 'Assessment is not available to this learner' using errcode='42501';
  end if;
  if not exists (select 1 from public.assessments a where a.id=target_assessment_id and a.assessment_type='progress') then
    raise exception 'Assessment is not progressive';
  end if;

  select aa.id into aid
  from public.assessment_attempts aa
  where aa.assessment_id=target_assessment_id and aa.learner_id=uid and aa.status='in_progress'
  limit 1;
  if aid is null then raise exception 'No active attempt'; end if;

  select count(*)::integer into responded from public.student_responses sr where sr.attempt_id=aid;
  select count(*)::integer into total_items from public.assessment_items ai where ai.assessment_id=target_assessment_id;
  next_position := responded + 1;

  if next_position > total_items then
    return jsonb_build_object('assessment_id',target_assessment_id,'attempt_id',aid,'completed',true,'answered',responded,'total',total_items);
  end if;

  select jsonb_build_object(
    'assessment_id',a.id,
    'attempt_id',aid,
    'title',a.title,
    'description',a.description,
    'duration_minutes',a.duration_minutes,
    'answered',responded,
    'total',total_items,
    'position',ai.position,
    'item',jsonb_build_object(
      'question_version_id',qv.id,
      'position',ai.position,
      'marks',ai.marks,
      'question_type',q.question_type,
      'stem',qv.stem,
      'options',coalesce((
        select jsonb_agg(jsonb_build_object('id',qo.id,'text',qo.option_text,'position',qo.position) order by qo.position)
        from public.question_options qo where qo.question_version_id=qv.id
      ),'[]'::jsonb)
    )
  ) into payload
  from public.assessments a
  join public.assessment_items ai on ai.assessment_id=a.id and ai.position=next_position
  join public.question_versions qv on qv.id=ai.question_version_id
  join public.questions q on q.id=qv.question_id
  where a.id=target_assessment_id;

  return payload;
end;
$$;

create or replace function public.submit_progressive_assessment_step(
  target_assessment_id uuid,
  target_attempt_id uuid,
  target_question_version_id uuid,
  response_text text default null,
  response_option_id uuid default null,
  response_option_ids uuid[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  expected_qv uuid;
  qtype text;
  next_position integer;
  total_items integer;
  completed boolean := false;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not private.can_take_assessment(target_assessment_id) then
    raise exception 'Assessment is not available to this learner' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.assessment_attempts aa join public.assessments a on a.id=aa.assessment_id
    where aa.id=target_attempt_id and aa.assessment_id=target_assessment_id and aa.learner_id=uid and aa.status='in_progress' and a.assessment_type='progress'
  ) then raise exception 'Invalid progressive attempt' using errcode='42501'; end if;

  select count(*)::integer + 1 into next_position from public.student_responses sr where sr.attempt_id=target_attempt_id;
  select ai.question_version_id,q.question_type into expected_qv,qtype
  from public.assessment_items ai
  join public.question_versions qv on qv.id=ai.question_version_id
  join public.questions q on q.id=qv.question_id
  where ai.assessment_id=target_assessment_id and ai.position=next_position;

  if expected_qv is null then raise exception 'No next assessment item'; end if;
  if expected_qv <> target_question_version_id then raise exception 'Out-of-sequence assessment submission' using errcode='42501'; end if;

  if qtype in ('structured_written','short_answer','reflection') then
    if response_text is null or char_length(trim(response_text))=0 then raise exception 'A response is required'; end if;
  elsif qtype in ('single_best_answer','true_false') then
    if response_option_id is null or not exists (
      select 1 from public.question_options qo where qo.id=response_option_id and qo.question_version_id=target_question_version_id
    ) then raise exception 'A valid option is required'; end if;
  elsif qtype='multiple_response' then
    if response_option_ids is null or cardinality(response_option_ids)=0 or exists (
      select 1 from unnest(response_option_ids) x(id)
      where not exists (select 1 from public.question_options qo where qo.id=x.id and qo.question_version_id=target_question_version_id)
    ) then raise exception 'Valid options are required'; end if;
  end if;

  insert into public.student_responses(attempt_id,question_version_id,selected_option_id,selected_option_ids,text_response)
  values(target_attempt_id,target_question_version_id,response_option_id,response_option_ids,response_text);

  select count(*)::integer into total_items from public.assessment_items ai where ai.assessment_id=target_assessment_id;
  if next_position >= total_items then
    update public.assessment_attempts
    set status='submitted',submitted_at=now(),updated_at=now()
    where id=target_attempt_id and learner_id=uid and status='in_progress';
    completed := true;
  end if;

  return jsonb_build_object('completed',completed,'committed_position',next_position,'next_position',case when completed then null else next_position+1 end,'total',total_items);
end;
$$;

create or replace function public.get_assessment_delivery(target_assessment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  payload jsonb;
  atype text;
begin
  if not private.can_take_assessment(target_assessment_id) then
    raise exception 'Assessment is not available to this learner';
  end if;
  select assessment_type into atype from public.assessments where id=target_assessment_id;
  if atype='progress' then
    raise exception 'Progressive assessment requires sequential delivery';
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
            select jsonb_agg(jsonb_build_object('id',qo.id,'text',qo.option_text,'position',qo.position) order by qo.position)
            from public.question_options qo where qo.question_version_id=qv.id
          ), '[]'::jsonb)
        ) order by ai.position
      )
      from public.assessment_items ai
      join public.question_versions qv on qv.id=ai.question_version_id
      join public.questions q on q.id=qv.question_id
      where ai.assessment_id=a.id
    ), '[]'::jsonb)
  ) into payload
  from public.assessments a where a.id=target_assessment_id;

  return payload;
end;
$$;

revoke all on function public.get_progressive_assessment_step(uuid) from public;
grant execute on function public.get_progressive_assessment_step(uuid) to authenticated;
revoke all on function public.submit_progressive_assessment_step(uuid,uuid,uuid,text,uuid,uuid[]) from public;
grant execute on function public.submit_progressive_assessment_step(uuid,uuid,uuid,text,uuid,uuid[]) to authenticated;
