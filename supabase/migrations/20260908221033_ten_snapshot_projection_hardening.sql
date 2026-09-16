create or replace function public.ten_api(operation text, payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  result jsonb;
begin
  if operation = 'command' then
    if jsonb_typeof(payload) is distinct from 'object' then raise exception 'Invalid request'; end if;
    return public.ten_command((payload->>'run_id')::uuid, payload->>'command');
  end if;

  result := private.ten_api(operation, payload);

  if operation = 'snapshot'
     and coalesce((result->>'manager')::boolean, false) = false
     and result ? 'stage' then
    result := jsonb_set(result, '{stage}', (result->'stage') - 'id');
  end if;

  return result;
end;
$$;

revoke all on function public.ten_api(text,jsonb) from public, anon;
grant execute on function public.ten_api(text,jsonb) to authenticated;
