create index if not exists learner_certificates_program_idx on public.learner_certificates(program_id);
create index if not exists learner_journey_onboarding_learner_idx on public.learner_journey_onboarding(learner_id);
create index if not exists learner_program_feedback_learner_idx on public.learner_program_feedback(learner_id);
create index if not exists program_journey_settings_pre_assessment_idx on public.program_journey_settings(pre_assessment_id) where pre_assessment_id is not null;
create index if not exists program_journey_settings_post_assessment_idx on public.program_journey_settings(post_assessment_id) where post_assessment_id is not null;
create index if not exists ten_events_actor_idx on public.ten_events(actor_id);
create index if not exists ten_runs_created_by_idx on public.ten_runs(created_by);
