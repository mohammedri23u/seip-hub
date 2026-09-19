revoke execute on function public.join_live_session(text) from public, anon;
revoke execute on function public.advance_live_activity(uuid, text) from public, anon;
grant execute on function public.join_live_session(text) to authenticated;
grant execute on function public.advance_live_activity(uuid, text) to authenticated;
