create or replace function private.ten_codex_completion_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_phase text;
begin
  select r.phase into run_phase
  from public.ten_runs r
  where r.id = new.run_id;

  if run_phase <> 'completed' then
    return null;
  end if;

  if not private.ten_completion_ready(new.run_id, new.user_id) then
    return null;
  end if;

  return new;
end;
$$;
