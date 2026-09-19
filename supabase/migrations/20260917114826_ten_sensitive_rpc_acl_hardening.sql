revoke execute on function public.ten_governance_status(uuid) from anon;
revoke execute on function public.ten_review_queue(uuid) from anon;
revoke execute on function public.ten_review_detail(uuid) from anon;
revoke execute on function public.ten_save_human_review(uuid,jsonb,text,boolean) from anon;
revoke execute on function public.ten_finalize_human_review(uuid,text) from anon;
revoke execute on function public.set_research_consent(uuid,text) from anon;

grant execute on function public.ten_governance_status(uuid) to authenticated;
grant execute on function public.ten_review_queue(uuid) to authenticated;
grant execute on function public.ten_review_detail(uuid) to authenticated;
grant execute on function public.ten_save_human_review(uuid,jsonb,text,boolean) to authenticated;
grant execute on function public.ten_finalize_human_review(uuid,text) to authenticated;
grant execute on function public.set_research_consent(uuid,text) to authenticated;
