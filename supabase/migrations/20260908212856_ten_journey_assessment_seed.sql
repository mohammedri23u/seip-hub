
do $$
declare
  pid uuid;
  cid uuid;
  creator uuid;
  pre_id uuid;
  post_id uuid;
  qid uuid;
  qvid uuid;
  item jsonb;
  opt text;
  pos integer;
  idx integer := 0;
  items jsonb := $json$[{"code": "TEN-CR-01", "stem": "A 29-year-old with sudden maximal-intensity headache during exercise and normal neurological examination. Best next step?", "options": ["Treat as migraine", "Urgent evaluation for a secondary cause", "Routine follow-up", "No imaging because the neurological examination is normal"], "correct": 2, "rationale": "Thunderclap/exertional red flags change urgency even with a normal neurological examination."}, {"code": "TEN-CR-02", "stem": "Which Problem Representation is strongest?", "options": ["Headache in a man", "32-year-old with headache and vomiting", "32-year-old with abrupt exertional thunderclap headache, vomiting and neck stiffness", "Migraine patient with pain"], "correct": 3, "rationale": "Strong problem representations use discriminating features and tempo."}, {"code": "TEN-CR-03", "stem": "A normal first ECG in suspected acute coronary syndrome means:", "options": ["ACS is excluded", "No STEMI is demonstrated, but ACS may remain possible", "Troponin is not needed", "The patient can be discharged"], "correct": 2, "rationale": "An initially nondiagnostic ECG does not exclude ACS."}, {"code": "TEN-CR-04", "stem": "An early high-sensitivity cardiac troponin within the reference range 45 minutes after symptom onset should be interpreted as:", "options": ["Definitive rule-out", "Nondiagnostic this early; serial testing may be required", "Proof of reflux", "Proof of unstable angina"], "correct": 2, "rationale": "Timing and serial change matter when interpreting hs-cTn."}, {"code": "TEN-CR-05", "stem": "Accepting reflux after an initial normal ECG and an early normal troponin is most consistent with which reasoning error?", "options": ["Premature closure", "Search satisfaction from CT", "Hindsight bias", "Base-rate neglect only"], "correct": 1, "rationale": "The diagnostic process was closed before adequate serial evidence was obtained."}, {"code": "TEN-CR-06", "stem": "In suspected pulmonary embolism with low clinical suspicion, PERC is useful when:", "options": ["Any one criterion is negative", "All criteria are negative and the clinical context is appropriate", "D-dimer is positive", "CTPA is unavailable"], "correct": 2, "rationale": "PERC is a rule-out aid only in an appropriate low-suspicion context."}, {"code": "TEN-CR-07", "stem": "A positive D-dimer in a PE-unlikely pathway means:", "options": ["Pulmonary embolism is confirmed", "Further evaluation or imaging is needed", "No further testing is required", "Thrombolysis should be given"], "correct": 2, "rationale": "D-dimer is nonspecific and is not a rule-in test."}, {"code": "TEN-CR-08", "stem": "The best question before ordering a diagnostic test is:", "options": ["Which test is newest?", "What is my pretest probability and how will the result change management?", "Which test gives the most data?", "Which test is most expensive?"], "correct": 2, "rationale": "Diagnostic testing should answer a defined clinical question and change a decision."}, {"code": "TEN-CR-09", "stem": "After an intervention in an acutely deteriorating patient, the next reasoning step is often:", "options": ["Repeat the same intervention automatically", "Reassess physiology and update the plan", "Stop monitoring", "Wait for discharge"], "correct": 2, "rationale": "Management is iterative; the response to treatment becomes new evidence."}, {"code": "TEN-CR-10", "stem": "An undocumented 'penicillin allergy' label should prompt:", "options": ["Automatic lifelong avoidance without questions", "Clarification of the reaction phenotype and medication reconciliation", "Ignoring the label", "Delay of all urgent therapy indefinitely"], "correct": 2, "rationale": "Allergy verification and medication reconciliation are patient-safety steps."}, {"code": "TEN-CR-11", "stem": "Which is the best example of confidence calibration?", "options": ["Confidence never changes", "Confidence is recorded before and after new evidence and compared with correctness", "Higher confidence earns more points", "Only correct learners report confidence"], "correct": 2, "rationale": "Calibration is about matching certainty to evidence, not rewarding confidence."}, {"code": "TEN-CR-12", "stem": "Which statement best captures THE TEN First Activation's educational goal?", "options": ["Memorize four diseases", "Use four cases to practice transferable clinical-reasoning habits", "Compete for the fastest diagnosis", "Collect character rewards"], "correct": 2, "rationale": "The diseases are vehicles; transferable reasoning is the target."}]$json$::jsonb;
begin
  select p.id, c.id, p.created_by
    into pid, cid, creator
  from public.programs p
  join public.cohorts c on c.program_id = p.id
  where p.code = 'SEIP26' and c.status = 'active'
  order by c.created_at
  limit 1;

  if pid is null or cid is null then
    raise exception 'SEIP26 active cohort not found';
  end if;

  select id into pre_id from public.assessments
   where cohort_id=cid and assessment_type='diagnostic' and title='THE TEN — Entry Baseline'
   order by created_at limit 1;
  if pre_id is null then
    insert into public.assessments(cohort_id,title,description,assessment_type,status,opens_at,closes_at,duration_minutes,created_by)
    values(cid,'THE TEN — Entry Baseline','12-item low-stakes clinical reasoning baseline. Complete this gate before entering Baghdad Nexus.','diagnostic','live',now()-interval '1 day',now()+interval '365 days',20,creator)
    returning id into pre_id;
  end if;

  select id into post_id from public.assessments
   where cohort_id=cid and assessment_type='final' and title='THE TEN — Exit Transfer Check'
   order by created_at limit 1;
  if post_id is null then
    insert into public.assessments(cohort_id,title,description,assessment_type,status,opens_at,closes_at,duration_minutes,created_by)
    values(cid,'THE TEN — Exit Transfer Check','Matched 12-item low-stakes transfer check after all four missions.','final','live',now()-interval '1 day',now()+interval '365 days',20,creator)
    returning id into post_id;
  end if;

  for item in select value from jsonb_array_elements(items)
  loop
    idx := idx + 1;
    select id into qid from public.questions where program_id=pid and question_code=item->>'code';
    if qid is null then
      insert into public.questions(program_id,question_code,question_type,status,author_id)
      values(pid,item->>'code','single_best_answer','approved',creator)
      returning id into qid;
    end if;

    select id into qvid from public.question_versions where question_id=qid and version_number=1;
    if qvid is null then
      insert into public.question_versions(question_id,version_number,stem,explanation,difficulty_target,marks,created_by)
      values(qid,1,item->>'stem',item->>'rationale','moderate',1,creator)
      returning id into qvid;
    end if;

    if not exists(select 1 from public.question_options where question_version_id=qvid) then
      pos := 0;
      for opt in select jsonb_array_elements_text(item->'options')
      loop
        pos := pos + 1;
        insert into public.question_options(question_version_id,option_text,is_correct,position)
        values(qvid,opt,pos=(item->>'correct')::integer,pos);
      end loop;
    end if;

    insert into public.assessment_items(assessment_id,question_version_id,position,marks)
    values(pre_id,qvid,idx,1)
    on conflict do nothing;

    insert into public.assessment_items(assessment_id,question_version_id,position,marks)
    values(post_id,qvid,idx,1)
    on conflict do nothing;
  end loop;

  insert into public.program_journey_settings(program_id,pre_assessment_id,post_assessment_id,required_mission_ids,minimum_attended_sessions,require_feedback,certificate_title,active)
  values(pid,pre_id,post_id,array['M01','M02','M03','M04']::text[],0,true,'THE TEN — BAGHDAD NEXUS: First Activation',true)
  on conflict(program_id) do update set
    pre_assessment_id=excluded.pre_assessment_id,
    post_assessment_id=excluded.post_assessment_id,
    required_mission_ids=excluded.required_mission_ids,
    certificate_title=excluded.certificate_title,
    active=true,
    updated_at=now();
end $$;

create or replace function private.journey_posttest_unlocked(target_assessment_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.assessments a
    join public.cohorts c on c.id = a.cohort_id
    join public.program_journey_settings s on s.program_id = c.program_id and s.active
    where a.id = target_assessment_id and s.post_assessment_id = a.id
  )
  or exists (
    select 1
    from public.assessments a
    join public.cohorts c on c.id = a.cohort_id
    join public.program_journey_settings s on s.program_id = c.program_id and s.active
    where a.id = target_assessment_id
      and s.post_assessment_id = a.id
      and (
        select count(distinct r.mission_id)
        from public.ten_codex tc
        join public.ten_runs r on r.id = tc.run_id
        join public.sessions se on se.id = r.session_id
        where tc.user_id = target_user_id
          and se.cohort_id = a.cohort_id
          and r.mission_id = any(s.required_mission_ids)
      ) >= cardinality(s.required_mission_ids)
  );
$$;

create or replace function private.journey_pretest_unlocked(target_assessment_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.assessments a
    join public.cohorts c on c.id = a.cohort_id
    join public.program_journey_settings s on s.program_id = c.program_id and s.active
    where a.id = target_assessment_id and s.pre_assessment_id = a.id
  )
  or exists (
    select 1
    from public.assessments a
    join public.cohorts c on c.id = a.cohort_id
    join public.program_journey_settings s on s.program_id = c.program_id and s.active
    join public.learner_journey_onboarding o on o.program_id = c.program_id and o.learner_id = target_user_id
    where a.id = target_assessment_id
      and s.pre_assessment_id = a.id
      and o.orientation_completed_at is not null
  );
$$;

create or replace function private.can_take_assessment(target_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.assessments a
       join public.cohort_memberships cm on cm.cohort_id = a.cohort_id
       where a.id = target_assessment_id
         and cm.user_id = auth.uid()
         and cm.member_type = 'learner'
         and cm.status = 'active'
         and a.status = 'live'
         and (a.opens_at is null or now() >= a.opens_at)
         and (a.closes_at is null or now() <= a.closes_at)
         and private.journey_pretest_unlocked(a.id, auth.uid())
         and private.journey_posttest_unlocked(a.id, auth.uid())
     );
$$;

revoke all on function private.journey_posttest_unlocked(uuid,uuid) from public, anon;
revoke all on function private.journey_pretest_unlocked(uuid,uuid) from public, anon;
grant execute on function private.journey_posttest_unlocked(uuid,uuid) to authenticated;
grant execute on function private.journey_pretest_unlocked(uuid,uuid) to authenticated;
