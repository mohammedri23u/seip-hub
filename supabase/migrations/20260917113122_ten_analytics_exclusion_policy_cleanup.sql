create index if not exists program_analytics_exclusions_user_idx on public.program_analytics_exclusions(user_id);
create index if not exists program_analytics_exclusions_created_by_idx on public.program_analytics_exclusions(created_by);

drop policy if exists "program analytics exclusions manage" on public.program_analytics_exclusions;

create policy "program analytics exclusions insert" on public.program_analytics_exclusions
for insert with check (private.is_platform_admin() or private.has_program_role(program_id,array['program_director']::text[]));

create policy "program analytics exclusions update" on public.program_analytics_exclusions
for update using (private.is_platform_admin() or private.has_program_role(program_id,array['program_director']::text[]))
with check (private.is_platform_admin() or private.has_program_role(program_id,array['program_director']::text[]));

create policy "program analytics exclusions delete" on public.program_analytics_exclusions
for delete using (private.is_platform_admin() or private.has_program_role(program_id,array['program_director']::text[]));
