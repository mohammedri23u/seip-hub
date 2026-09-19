alter function public.ten_pilot_readiness(uuid) rename to ten_pilot_readiness_base;

create or replace function public.ten_pilot_readiness(target_program_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  payload jsonb;
  quality jsonb;
  education_ready boolean;
begin
  payload := public.ten_pilot_readiness_base(target_program_id);
  quality := payload->'quality';
  education_ready := coalesce((payload->>'education_ready')::boolean,false);

  if quality is null then
    education_ready := false;
  elsif coalesce((quality->>'double_rating_required')::boolean,false) then
    if quality->>'double_rating_target_count' is null or coalesce(trim(quality->>'double_rating_selection_rule'),'')='' then
      education_ready := false;
    end if;
  end if;

  return jsonb_set(payload,'{education_ready}',to_jsonb(education_ready),true);
end;
$$;

revoke all on function public.ten_pilot_readiness_base(uuid) from public;
revoke all on function public.ten_pilot_readiness(uuid) from public;
grant execute on function public.ten_pilot_readiness(uuid) to authenticated;
