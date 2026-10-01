create or replace function public.activate_micro_assessments(target_cohort_id uuid,confirm_activation boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare pid uuid; form_a uuid; form_b uuid; old_a uuid; old_b uuid; rid uuid; configured_count integer; preserved integer; already_active boolean; result jsonb;
begin
 if auth.uid() is null or not private.managed_account_access_allowed() then raise exception 'Sign in required' using errcode='42501'; end if;
 select program_id into pid from public.cohorts where id=target_cohort_id;
 if pid is null or not private.has_program_role(pid,array['program_director','assessment_lead']) then raise exception 'Assessment lead or program director required' using errcode='42501'; end if;
 select count(*) into configured_count from private.micro_assessment_versions m join public.assessments a on a.id=m.assessment_id where a.cohort_id=target_cohort_id and m.instrument_version='micro-1.0.0';
 if configured_count<>2 then raise exception 'Exactly two prepared micro forms are required'; end if;
 select m.assessment_id,m.source_assessment_id,b.release_id into strict form_a,old_a,rid from private.micro_assessment_versions m join public.assessments a on a.id=m.assessment_id join private.scientific_assessments b on b.assessment_id=a.id where a.cohort_id=target_cohort_id and m.instrument_version='micro-1.0.0' and b.form_code='A';
 select m.assessment_id,m.source_assessment_id into strict form_b,old_b from private.micro_assessment_versions m join public.assessments a on a.id=m.assessment_id join private.scientific_assessments b on b.assessment_id=a.id where a.cohort_id=target_cohort_id and m.instrument_version='micro-1.0.0' and b.form_code='B';
 if exists(select 1 from public.assessments a where a.id in(form_a,form_b) and (a.duration_minutes<>5 or a.assessment_type<>'progress')) then raise exception 'Micro forms must be five-minute progress assessments'; end if;
 if exists(select 1 from (select a.id,count(ai.question_version_id) n,count(*) filter(where q.question_type='single_best_answer') mcq,count(*) filter(where q.question_type='short_answer') vsaq,sum(ai.marks) marks,count(h.question_version_id) hints from public.assessments a left join public.assessment_items ai on ai.assessment_id=a.id left join public.question_versions v on v.id=ai.question_version_id left join public.questions q on q.id=v.question_id left join private.assessment_task_hints h on h.question_version_id=v.id and h.language_code='ar' where a.id in(form_a,form_b) group by a.id) x where n<>4 or mcq<>3 or vsaq<>1 or marks<>4 or hints<>4) then raise exception 'Micro form content validation failed'; end if;
 if exists(select 1 from public.assessment_items ai join public.question_versions v on v.id=ai.question_version_id join public.questions q on q.id=v.question_id where ai.assessment_id in(form_a,form_b) and q.question_type='single_best_answer' and (select count(*) from public.question_options o where o.question_version_id=v.id and o.is_correct)<>1) then raise exception 'Each MCQ must have one correct option'; end if;
 select count(distinct learner_id) into preserved from public.assessment_attempts where assessment_id in(old_a,old_b);
 already_active:=(select count(*)=2 from public.assessments where id in(form_a,form_b) and status='live') and exists(select 1 from public.program_assessment_sequences where cohort_id=target_cohort_id and active) and not exists(select 1 from public.program_assessment_sequences where cohort_id=target_cohort_id and active and (pre_assessment_id<>case sequence_code when 'AB' then form_a else form_b end or post_assessment_id<>case sequence_code when 'AB' then form_b else form_a end));
 result:=jsonb_build_object('form_a',form_a,'form_b',form_b,'active',already_active,'duration_seconds',300,'questions',4,'mcq',3,'vsaq',1,'preserved_legacy_learners',preserved,'empirically_equated',false);
 if not confirm_activation or already_active then return result; end if;
 if not exists(select 1 from public.program_assessment_sequences where cohort_id=target_cohort_id and active) then raise exception 'Assessment sequence configuration is required'; end if;
 lock table public.assessment_attempts in share row exclusive mode;
 lock table public.program_assessment_sequences in share row exclusive mode;
 if exists(select 1 from public.program_assessment_sequences where cohort_id=target_cohort_id and active and (pre_assessment_id not in(old_a,old_b) or post_assessment_id not in(old_a,old_b))) then raise exception 'Assessment mappings changed; review before activation'; end if;
 insert into private.scientific_learner_assessment_pins(cohort_id,learner_id,release_id,pre_assessment_id,post_assessment_id,sequence_code,attempted_assessment_ids,requires_decision,reason,pinned_at)
 select target_cohort_id,x.learner_id,rid,p.pre_assessment_id,p.post_assessment_id,p.sequence_code,x.attempted_ids,false,'Retain complete original pre/post instrument after a prior attempt; micro-1.0.0 applies only to learners who have not started.',clock_timestamp()
 from (select learner_id,array_agg(distinct assessment_id) attempted_ids from public.assessment_attempts where assessment_id in(old_a,old_b) group by learner_id) x
 cross join lateral private.assigned_assessment_pair(target_cohort_id,x.learner_id) p
 on conflict(cohort_id,learner_id) do nothing;
 if exists(select 1 from public.assessment_attempts aa where aa.assessment_id in(old_a,old_b) and not exists(select 1 from private.scientific_learner_assessment_pins p where p.cohort_id=target_cohort_id and p.learner_id=aa.learner_id and p.pre_assessment_id in(old_a,old_b) and p.post_assessment_id in(old_a,old_b))) then raise exception 'A prior learner could not be safely pinned'; end if;
 update public.assessments set status='live' where id in(form_a,form_b);
 update public.program_assessment_sequences set pre_assessment_id=case sequence_code when 'AB' then form_a else form_b end,post_assessment_id=case sequence_code when 'AB' then form_b else form_a end,updated_at=now() where cohort_id=target_cohort_id and active;
 update public.program_journey_settings set pre_assessment_id=case pre_assessment_id when old_a then form_a when old_b then form_b else pre_assessment_id end,post_assessment_id=case post_assessment_id when old_a then form_a when old_b then form_b else post_assessment_id end where program_id=pid and active;
 update private.micro_assessment_versions set metadata=metadata||jsonb_build_object('status','active','activated_at',clock_timestamp(),'activated_by',auth.uid()) where assessment_id in(form_a,form_b);
 insert into public.audit_events(program_id,actor_user_id,event_type,entity_type,entity_id,new_value) values(pid,auth.uid(),'assessment.micro_activated','assessment_instrument','micro-1.0.0',result||jsonb_build_object('active',true,'legacy_attempts_retained',true));
 return result||jsonb_build_object('active',true);
end $$;
revoke all on function public.activate_micro_assessments(uuid,boolean) from public,anon;
grant execute on function public.activate_micro_assessments(uuid,boolean) to authenticated;
