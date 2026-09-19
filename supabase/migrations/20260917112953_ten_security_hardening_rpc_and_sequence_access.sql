drop policy if exists program_assessment_sequences_staff_select on public.program_assessment_sequences;
create policy program_assessment_sequences_staff_select on public.program_assessment_sequences
for select using (
  private.is_platform_admin()
  or private.has_program_role(program_id, array['program_director','assessment_lead','reviewer']::text[])
);

revoke execute on function public.get_progressive_assessment_step(uuid) from public, anon;
grant execute on function public.get_progressive_assessment_step(uuid) to authenticated;

revoke execute on function public.submit_progressive_assessment_step(uuid,uuid,uuid,text,uuid,uuid[]) from public, anon;
grant execute on function public.submit_progressive_assessment_step(uuid,uuid,uuid,text,uuid,uuid[]) to authenticated;

revoke execute on function public.research_consent_state(uuid) from public, anon;
grant execute on function public.research_consent_state(uuid) to authenticated;

revoke execute on function public.record_research_consent(uuid,text) from public, anon;
grant execute on function public.record_research_consent(uuid,text) to authenticated;

revoke execute on function public.withdraw_research_consent(uuid) from public, anon;
grant execute on function public.withdraw_research_consent(uuid) to authenticated;

revoke execute on function public.ten_pilot_readiness(uuid) from public, anon;
grant execute on function public.ten_pilot_readiness(uuid) to authenticated;

revoke execute on function public.ten_pilot_readiness_base(uuid) from public, anon, authenticated;

