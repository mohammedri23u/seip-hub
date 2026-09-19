create or replace function private.ten_topic_access(topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  run_id_text text;
begin
  if topic !~ '^ten(-tool)?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  run_id_text := regexp_replace(topic, '^ten(-tool)?:', '');
  return private.ten_can_view(run_id_text::uuid);
end;
$$;

create or replace function private.ten_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  state_payload jsonb;
begin
  if new.phase is distinct from old.phase
     or new.stage_index is distinct from old.stage_index
     or new.completed_at is distinct from old.completed_at then
    state_payload := jsonb_build_object('revision', new.revision, 'phase', new.phase, 'stage_index', new.stage_index);
    perform realtime.send(state_payload, 'state', 'ten:' || new.id::text, true);
    perform realtime.send(state_payload, 'state', 'ten-tool:' || new.id::text, true);
  end if;
  return new;
end;
$$;
