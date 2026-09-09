create or replace function public.ten_api(operation text, payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  if operation = 'command' then
    if jsonb_typeof(payload) is distinct from 'object' then raise exception 'Invalid request'; end if;
    return public.ten_command((payload->>'run_id')::uuid, payload->>'command');
  end if;
  return private.ten_api(operation, payload);
end;
$$;

revoke all on function public.ten_api(text,jsonb) from public, anon;
grant execute on function public.ten_api(text,jsonb) to authenticated;
