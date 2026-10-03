create schema if not exists private;

create or replace function private.import_ten_formative_items(payload jsonb)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  qid uuid;
  qvid uuid;
  idx integer;
  opt text;
  outcome_code text;
  outcome_parts text[];
  item_type text;
  imported integer := 0;
begin
  for item in select value from jsonb_array_elements(payload)
  loop
    item_type := item->>'type';
    insert into public.questions(id, program_id, question_code, question_type, status, author_id, created_at, updated_at)
    values (
      gen_random_uuid(),
      '59b70ab9-c29b-499e-893c-07991ef266d0'::uuid,
      item->>'code',
      case when item_type in ('MCQ','Peer Instruction') then 'single_best_answer' else 'short_answer' end,
      'review',
      '13bc2a95-5c3b-4533-b2aa-ff448ba68932'::uuid,
      now(), now()
    )
    on conflict (program_id, question_code) do update set updated_at = excluded.updated_at
    returning id into qid;

    select id into qvid from public.question_versions where question_id=qid and version_number=1;
    if qvid is null then
      insert into public.question_versions(id, question_id, version_number, stem, explanation, difficulty_target, marks, created_by, created_at)
      values (
        gen_random_uuid(), qid, 1,
        '[' || coalesce(item->>'context','') || '] ' || coalesce(item->>'stem',''),
        coalesce(item->>'rationale','') || E'\n\nKey / Anchor: ' || coalesce(item->>'key','') || E'\n\nMisconception target: ' || coalesce(item->>'misconception','') || E'\n\nSource: ' || coalesce(item->>'source','') || E'\n\nSource review status: ' || coalesce(item->>'review','Pending'),
        lower(coalesce(item->>'difficulty','moderate')),
        1,
        '13bc2a95-5c3b-4533-b2aa-ff448ba68932'::uuid,
        now()
      ) returning id into qvid;
    end if;

    if item_type in ('MCQ','Peer Instruction') then
      for idx in 0..3 loop
        opt := item->'opts'->>idx;
        if opt is not null and btrim(opt) <> '' then
          insert into public.question_options(id,question_version_id,option_text,is_correct,position)
          values(gen_random_uuid(),qvid,opt,(upper(coalesce(item->>'key','')) = chr(65+idx)),idx+1)
          on conflict do nothing;
        end if;
      end loop;
    end if;

    outcome_parts := string_to_array(coalesce(item->>'outcome',''), '/');
    if cardinality(outcome_parts) > 0 then
      foreach outcome_code in array outcome_parts loop
        insert into public.question_learning_objectives(question_version_id,learning_objective_id,weight,created_at)
        select qvid, lo.id, 1.0/cardinality(outcome_parts), now()
        from public.learning_objectives lo
        where lo.program_id='59b70ab9-c29b-499e-893c-07991ef266d0'::uuid
          and lo.code='TEN-'||btrim(outcome_code)
        on conflict do nothing;
      end loop;
    end if;
    imported := imported + 1;
  end loop;
  return imported;
end;
$$;
