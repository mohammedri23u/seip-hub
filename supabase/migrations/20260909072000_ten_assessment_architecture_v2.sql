do $$
declare
  v_program uuid;
  v_author uuid;
  v_cohort uuid;
  v_pre uuid;
  v_post uuid;
begin
  select id into v_program from public.programs where code = 'SEIP26' limit 1;
  if v_program is null then raise exception 'SEIP26 program not found'; end if;

  select user_id into v_author
  from public.program_memberships
  where program_id = v_program and role = 'program_director' and status = 'active'
  order by created_at
  limit 1;
  if v_author is null then raise exception 'Active program director not found'; end if;

  select id into v_cohort from public.cohorts where program_id = v_program and name = 'PEER BRIDGE' order by created_at limit 1;
  if v_cohort is null then raise exception 'PEER BRIDGE cohort not found'; end if;

  select id into v_pre from public.assessments where cohort_id = v_cohort and title = 'THE TEN — Entry Baseline' limit 1;
  select id into v_post from public.assessments where cohort_id = v_cohort and title = 'THE TEN — Exit Transfer Check' limit 1;
  if v_pre is null or v_post is null then raise exception 'THE TEN baseline/post assessments not found'; end if;

  if exists (select 1 from public.assessment_attempts where assessment_id in (v_pre, v_post)) then
    raise exception 'Cannot change THE TEN baseline/post blueprint after learner attempts exist';
  end if;

  insert into public.learning_objectives(program_id, code, title, description, domain, competency, status, created_by)
  values
    (v_program,'TEN-LO-01','Construct a discriminating Problem Representation','Synthesize age/context, tempo, key positives and relevant negatives into a concise problem representation that foregrounds features that change urgency.','Clinical Reasoning','Problem Representation','active',v_author),
    (v_program,'TEN-LO-02','Prioritize a Differential and Red Flags','Rank plausible diagnoses using Most Likely / Must Not Miss / Less Likely reasoning and identify red flags that change urgency despite reassuring features.','Clinical Reasoning','Differential Diagnosis','active',v_author),
    (v_program,'TEN-LO-03','Interpret Evidence With Its Limits','State what a diagnostic result supports and what it cannot exclude, accounting for timing, sensitivity, specificity and clinical context where relevant.','Clinical Reasoning','Evidence Interpretation','active',v_author),
    (v_program,'TEN-LO-04','Update Probability and Resist Cognitive Bias','Revise diagnostic probability when serial evidence changes and recognize framing, anchoring and premature closure that distort interpretation.','Clinical Reasoning','Diagnostic Updating','active',v_author),
    (v_program,'TEN-LO-05','Set Pretest Probability Before Testing','Estimate or categorize clinical probability before selecting a diagnostic test and use that probability to choose an appropriate pathway.','Clinical Reasoning','Pretest Probability','active',v_author),
    (v_program,'TEN-LO-06','Sequence and Interpret Diagnostic Tests','Choose and sequence tests according to the clinical question and distinguish rule-out aids, nonspecific triggers and confirmatory evidence.','Clinical Reasoning','Investigation Strategy','active',v_author),
    (v_program,'TEN-LO-07','Prioritize Management and Patient Safety','Integrate immediate management priorities with medication safety, comorbidity, communication and escalation risks in an evolving patient.','Clinical Reasoning','Management and Patient Safety','active',v_author),
    (v_program,'TEN-LO-08','Reassess and Update After Intervention','Treat response to intervention as new evidence, reassess physiology and update the management plan rather than applying a one-time checklist.','Clinical Reasoning','Reassessment','active',v_author),
    (v_program,'TEN-LO-09','Calibrate Confidence Under Uncertainty','Align confidence with the strength and limitations of available evidence and revise certainty appropriately as information changes.','Clinical Reasoning','Confidence Calibration','active',v_author),
    (v_program,'TEN-LO-10','Transfer the Reasoning Framework','Apply the program reasoning lenses to a novel clinical problem with progressively less scaffolding, integrating representation, evidence, testing, safety and reassessment.','Clinical Reasoning','Transfer','active',v_author)
  on conflict (program_id, code) do update set
    title=excluded.title, description=excluded.description, domain=excluded.domain,
    competency=excluded.competency, status='active', updated_at=now();

  insert into public.session_learning_objectives(session_id, learning_objective_id, weight)
  select s.id, lo.id, x.weight
  from (values
    ('TEN-M01','TEN-LO-01',40::numeric),('TEN-M01','TEN-LO-02',40::numeric),('TEN-M01','TEN-LO-10',20::numeric),
    ('TEN-M02','TEN-LO-03',40::numeric),('TEN-M02','TEN-LO-04',30::numeric),('TEN-M02','TEN-LO-09',10::numeric),('TEN-M02','TEN-LO-10',20::numeric),
    ('TEN-M03','TEN-LO-05',40::numeric),('TEN-M03','TEN-LO-06',40::numeric),('TEN-M03','TEN-LO-09',10::numeric),('TEN-M03','TEN-LO-10',10::numeric),
    ('TEN-M04','TEN-LO-07',40::numeric),('TEN-M04','TEN-LO-08',30::numeric),('TEN-M04','TEN-LO-09',10::numeric),('TEN-M04','TEN-LO-10',20::numeric)
  ) as x(join_code, lo_code, weight)
  join public.sessions s on s.cohort_id=v_cohort and s.join_code=x.join_code
  join public.learning_objectives lo on lo.program_id=v_program and lo.code=x.lo_code
  on conflict (session_id, learning_objective_id) do update set weight=excluded.weight;

  insert into public.question_learning_objectives(question_version_id, learning_objective_id, weight)
  select qv.id, lo.id, 100
  from (values
    ('TEN-CR-01','TEN-LO-02'),('TEN-CR-02','TEN-LO-01'),('TEN-CR-03','TEN-LO-03'),('TEN-CR-04','TEN-LO-03'),
    ('TEN-CR-05','TEN-LO-04'),('TEN-CR-06','TEN-LO-05'),('TEN-CR-07','TEN-LO-06'),('TEN-CR-08','TEN-LO-05'),
    ('TEN-CR-09','TEN-LO-08'),('TEN-CR-10','TEN-LO-07'),('TEN-CR-11','TEN-LO-09'),('TEN-CR-12','TEN-LO-10')
  ) as x(question_code, lo_code)
  join public.questions q on q.program_id=v_program and q.question_code=x.question_code
  join lateral (select id from public.question_versions where question_id=q.id order by version_number desc limit 1) qv on true
  join public.learning_objectives lo on lo.program_id=v_program and lo.code=x.lo_code
  on conflict (question_version_id, learning_objective_id) do update set weight=excluded.weight;

  insert into public.rubrics(program_id, rubric_code, title, description, status, created_by)
  values
    (v_program,'TEN-RUB-REP','Representation & Prioritization','Analytic rubric for concise problem representation and urgency-focused prioritization.','approved',v_author),
    (v_program,'TEN-RUB-EVID','Evidence Interpretation & Updating','Analytic rubric for interpreting what evidence shows, its limits, probability updating and next evidence needs.','approved',v_author),
    (v_program,'TEN-RUB-TEST','Probability & Test Strategy','Analytic rubric for pretest probability, test selection, result meaning and diagnostic sequencing.','approved',v_author),
    (v_program,'TEN-RUB-SAFE','Management, Safety & Reassessment','Analytic rubric for immediate priorities, parallel diagnosis/safety work, patient-specific safety and reassessment.','approved',v_author)
  on conflict (program_id, rubric_code) do update set title=excluded.title, description=excluded.description, status='approved', updated_at=now();

  insert into public.rubric_versions(rubric_id, version_number, instructions, reference_answer, moderation_threshold_points, created_by)
  select r.id, 1, x.instructions, x.reference_answer, 1.0, v_author
  from (values
    ('TEN-RUB-REP','Score each criterion independently from 0 to 1. Half-points are allowed when the element is present but incomplete. Do not award credit for concepts not expressed by the learner.','A strong response compresses discriminating features and tempo into a concise neutral representation, explicitly foregrounds the feature(s) that change urgency, and avoids premature diagnostic closure.'),
    ('TEN-RUB-EVID','Score each criterion independently from 0 to 1. Half-points are allowed. Judge reasoning from the supplied case only; do not infer unstated clinical decisions.','A strong response states what the current evidence supports, what it cannot exclude and why, updates probability in the appropriate direction, and identifies the next evidence or action needed to resolve remaining uncertainty.'),
    ('TEN-RUB-TEST','Score each criterion independently from 0 to 1. Half-points are allowed. Credit the reasoning sequence, not memorized test names alone.','A strong response starts with clinical probability, chooses a test/pathway appropriate to that probability, interprets each result according to its role, and gives a coherent next step without treating a nonspecific result as diagnostic.'),
    ('TEN-RUB-SAFE','Score each criterion independently from 0 to 1. Half-points are allowed. Credit integrated prioritization and explicit reassessment rather than isolated checklist items.','A strong response prioritizes immediate stabilization, advances diagnosis and safety work in parallel, adapts to patient-specific risks, and defines reassessment/escalation based on response to intervention.')
  ) as x(rubric_code, instructions, reference_answer)
  join public.rubrics r on r.program_id=v_program and r.rubric_code=x.rubric_code
  on conflict (rubric_id, version_number) do update set instructions=excluded.instructions, reference_answer=excluded.reference_answer, moderation_threshold_points=excluded.moderation_threshold_points;

  insert into public.rubric_criteria(rubric_version_id, criterion_code, title, description, scoring_guidance, max_score, position)
  select rv.id, x.criterion_code, x.title, x.description, x.guidance, 1, x.position
  from (values
    ('TEN-RUB-REP','REP-1','Discriminating features','Includes the clinically discriminating patient/context features rather than generic descriptors.','1 = key discriminating features are explicit; 0.5 = partially specified; 0 = absent or generic.',1),
    ('TEN-RUB-REP','REP-2','Tempo and context','Accurately captures onset/time course and the context that changes interpretation.','1 = tempo/context clearly represented; 0.5 = incomplete; 0 = missing or materially wrong.',2),
    ('TEN-RUB-REP','REP-3','Urgency-focused prioritization','Identifies the feature(s) that should change urgency and avoids benign anchoring.','1 = urgency-changing feature and its significance are explicit; 0.5 = implied/incomplete; 0 = absent.',3),
    ('TEN-RUB-REP','REP-4','Precision and concision','Uses a concise neutral representation without unsupported diagnostic labeling.','1 = concise, precise, neutral; 0.5 = understandable but cluttered/partly labeled; 0 = misleading.',4),
    ('TEN-RUB-EVID','EVID-1','What the evidence supports','States the appropriate positive inference from the current result(s).','1 = accurate supported inference; 0.5 = partly accurate; 0 = unsupported or incorrect.',1),
    ('TEN-RUB-EVID','EVID-2','What the evidence cannot exclude','Identifies the important limitation of the current result(s), including timing/context where relevant.','1 = limitation explicitly and accurately stated; 0.5 = incomplete; 0 = treats result as definitive when it is not.',2),
    ('TEN-RUB-EVID','EVID-3','Probability update','Updates diagnostic probability in a direction proportionate to the new evidence without premature closure.','1 = calibrated update; 0.5 = direction correct but poorly qualified; 0 = no update or inappropriate closure.',3),
    ('TEN-RUB-EVID','EVID-4','Next evidence or action','Identifies the next evidence/action required to address remaining uncertainty.','1 = coherent next step linked to uncertainty; 0.5 = reasonable but weakly linked; 0 = absent/inappropriate.',4),
    ('TEN-RUB-TEST','TEST-1','Pretest probability first','Establishes or explicitly acknowledges clinical probability before selecting the next test.','1 = probability drives the plan; 0.5 = probability mentioned but not used; 0 = test chosen without probability framing.',1),
    ('TEN-RUB-TEST','TEST-2','Appropriate test/pathway selection','Chooses a test or rule appropriate to the stated probability and clinical context.','1 = appropriate pathway; 0.5 = partly appropriate/underspecified; 0 = inappropriate sequence.',2),
    ('TEN-RUB-TEST','TEST-3','Result meaning','Distinguishes rule-out aids, nonspecific positive results and confirmatory evidence.','1 = role of result accurately interpreted; 0.5 = incomplete; 0 = treats nonspecific evidence as diagnostic.',3),
    ('TEN-RUB-TEST','TEST-4','Diagnostic sequence','Provides a coherent next step based on the preceding probability/result rather than jumping directly to a definitive test without justification.','1 = sequence coherent; 0.5 = mostly coherent; 0 = sequence unsafe/incoherent.',4),
    ('TEN-RUB-SAFE','SAFE-1','Immediate priorities','Identifies the most urgent stabilization/management priorities before lower-priority tasks.','1 = priorities appropriate and ordered; 0.5 = key action present but poorly prioritized; 0 = misses urgent priorities.',1),
    ('TEN-RUB-SAFE','SAFE-2','Parallel diagnosis and safety work','Advances diagnostic clarification while addressing immediate safety needs rather than treating them as sequential silos.','1 = parallel approach explicit; 0.5 = both present but disconnected; 0 = one dimension ignored.',2),
    ('TEN-RUB-SAFE','SAFE-3','Patient-specific safety','Adapts decisions to allergy history, comorbidity, medications, renal/cardiac context, communication or escalation risks as supplied.','1 = relevant safety modifiers explicitly integrated; 0.5 = mentioned but not integrated; 0 = ignored.',3),
    ('TEN-RUB-SAFE','SAFE-4','Reassessment and escalation','Defines reassessment after intervention and updates/escalates according to response.','1 = explicit reassessment plus update/escalation trigger; 0.5 = reassessment without clear consequence; 0 = one-time checklist only.',4)
  ) as x(rubric_code, criterion_code, title, description, guidance, position)
  join public.rubrics r on r.program_id=v_program and r.rubric_code=x.rubric_code
  join public.rubric_versions rv on rv.rubric_id=r.id and rv.version_number=1
  on conflict (rubric_version_id, criterion_code) do update set title=excluded.title, description=excluded.description, scoring_guidance=excluded.scoring_guidance, max_score=excluded.max_score, position=excluded.position;

  insert into public.questions(program_id, question_code, question_type, status, author_id)
  select v_program, x.question_code, 'short_answer', 'approved', v_author
  from (values
    ('TEN-CRQ-PRE-01'),('TEN-CRQ-PRE-02'),('TEN-CRQ-PRE-03'),('TEN-CRQ-PRE-04'),
    ('TEN-CRQ-POST-01'),('TEN-CRQ-POST-02'),('TEN-CRQ-POST-03'),('TEN-CRQ-POST-04')
  ) as x(question_code)
  on conflict (program_id, question_code) do update set question_type='short_answer', status='approved', updated_at=now();

  insert into public.question_versions(question_id, version_number, stem, explanation, difficulty_target, marks, created_by)
  select q.id, 1, x.stem, x.explanation, 'moderate', 4, v_author
  from (values
    ('TEN-CRQ-PRE-01','A 68-year-old woman has a new unilateral temporal headache for 2 weeks, jaw pain while chewing and two brief episodes of blurred vision. Neurological examination is normal. Write one sentence that represents the problem, then state the feature or features that make this presentation urgent.','A strong response compresses age, new headache, subacute tempo, jaw claudication and visual symptoms into a neutral representation and explicitly recognizes the visual symptoms/new pattern as urgency-changing despite a normal neurological examination.'),
    ('TEN-CRQ-PRE-02','A 61-year-old develops central chest pressure 35 minutes ago. The first ECG is nondiagnostic and the first high-sensitivity troponin is within the reference range. In 2–3 sentences, explain what the current evidence supports, what it does not exclude, and the next reasoning step.','A strong response recognizes that no STEMI/biomarker rise is shown yet, that early nondiagnostic tests do not exclude ACS, and that serial/repeated evidence with ongoing clinical reassessment is needed rather than premature closure.'),
    ('TEN-CRQ-PRE-03','A 29-year-old woman taking an estrogen-containing oral contraceptive presents with pleuritic chest pain. Heart rate is 92/min, oxygen saturation 98%, there are no signs of DVT, and the clinician judges PE probability to be low. Outline the appropriate testing sequence and explain why a positive D-dimer would not by itself diagnose PE.','A strong response starts with low pretest probability, recognizes that estrogen use prevents a fully negative PERC screen, proceeds through an appropriate PE-unlikely pathway such as D-dimer, interprets a positive D-dimer as nonspecific, and proceeds to definitive imaging only when indicated.'),
    ('TEN-CRQ-PRE-04','A 78-year-old with fever, confusion and hypotension has chronic kidney disease, heart failure and an undocumented penicillin-allergy label. In 3–4 sentences, state your immediate priorities, the patient-specific safety checks that matter, and what you would reassess after the first intervention.','A strong response prioritizes stabilization and time-critical sepsis evaluation/treatment, works diagnosis and safety in parallel, clarifies allergy/medication/comorbidity context, and explicitly reassesses physiology and response before continuing or escalating.'),
    ('TEN-CRQ-POST-01','A 58-year-old man with no previous headache history develops a new severe headache over several days that is worse with coughing and is accompanied by early-morning vomiting. Neurological examination is currently normal. Write one sentence that represents the problem, then state the feature or features that make the presentation urgent.','A strong response compresses age/context, new severe headache, subacute course, cough-provocation and morning vomiting into a concise neutral representation and highlights the new pattern/raised-pressure red flags despite a normal examination.'),
    ('TEN-CRQ-POST-02','A 64-year-old with recurrent exertional chest tightness arrives symptom-free. The initial ECG shows no acute ischemic change and the first high-sensitivity troponin, drawn 50 minutes after the last pain, is normal. In 2–3 sentences, explain what these findings change, what they cannot rule out, and what evidence you would seek next.','A strong response interprets the tests as currently nondiagnostic rather than definitive, keeps ACS probability alive in context, and seeks serial ECG/troponin or other appropriate follow-up evidence while reassessing the patient.'),
    ('TEN-CRQ-POST-03','A 35-year-old man with pleuritic chest pain has a heart rate of 104/min, oxygen saturation 97%, no signs of DVT and no previous VTE. The clinician judges PE probability to be low. Describe how pretest probability should guide the next testing steps and what a positive D-dimer would mean.','A strong response begins with clinical probability, recognizes that tachycardia makes PERC positive, uses an appropriate PE-unlikely pathway with D-dimer, treats a positive D-dimer as a trigger for further evaluation rather than proof of PE, and sequences imaging only when indicated.'),
    ('TEN-CRQ-POST-04','A 72-year-old with fever, productive cough, confusion and hypotension has chronic kidney disease, reduced ejection fraction and an undocumented beta-lactam-allergy label. In 3–4 sentences, state your immediate priorities, the patient-specific safety issues you would address, and what you would reassess after the first intervention.','A strong response prioritizes stabilization and time-critical infection management, integrates allergy/comorbidity/medication safety, keeps diagnostic work moving in parallel, and explicitly reassesses perfusion, respiratory status and treatment response before further intervention or escalation.')
  ) as x(question_code, stem, explanation)
  join public.questions q on q.program_id=v_program and q.question_code=x.question_code
  on conflict (question_id, version_number) do update set stem=excluded.stem, explanation=excluded.explanation, difficulty_target=excluded.difficulty_target, marks=excluded.marks;

  insert into public.question_rubrics(question_version_id, rubric_version_id, created_by)
  select qv.id, rv.id, v_author
  from (values
    ('TEN-CRQ-PRE-01','TEN-RUB-REP'),('TEN-CRQ-POST-01','TEN-RUB-REP'),
    ('TEN-CRQ-PRE-02','TEN-RUB-EVID'),('TEN-CRQ-POST-02','TEN-RUB-EVID'),
    ('TEN-CRQ-PRE-03','TEN-RUB-TEST'),('TEN-CRQ-POST-03','TEN-RUB-TEST'),
    ('TEN-CRQ-PRE-04','TEN-RUB-SAFE'),('TEN-CRQ-POST-04','TEN-RUB-SAFE')
  ) as x(question_code, rubric_code)
  join public.questions q on q.program_id=v_program and q.question_code=x.question_code
  join public.question_versions qv on qv.question_id=q.id and qv.version_number=1
  join public.rubrics r on r.program_id=v_program and r.rubric_code=x.rubric_code
  join public.rubric_versions rv on rv.rubric_id=r.id and rv.version_number=1
  on conflict (question_version_id) do update set rubric_version_id=excluded.rubric_version_id, created_by=excluded.created_by;

  insert into public.question_learning_objectives(question_version_id, learning_objective_id, weight)
  select qv.id, lo.id, x.weight
  from (values
    ('TEN-CRQ-PRE-01','TEN-LO-01',60::numeric),('TEN-CRQ-PRE-01','TEN-LO-02',40::numeric),
    ('TEN-CRQ-POST-01','TEN-LO-01',60::numeric),('TEN-CRQ-POST-01','TEN-LO-02',40::numeric),
    ('TEN-CRQ-PRE-02','TEN-LO-03',60::numeric),('TEN-CRQ-PRE-02','TEN-LO-04',40::numeric),
    ('TEN-CRQ-POST-02','TEN-LO-03',60::numeric),('TEN-CRQ-POST-02','TEN-LO-04',40::numeric),
    ('TEN-CRQ-PRE-03','TEN-LO-05',50::numeric),('TEN-CRQ-PRE-03','TEN-LO-06',50::numeric),
    ('TEN-CRQ-POST-03','TEN-LO-05',50::numeric),('TEN-CRQ-POST-03','TEN-LO-06',50::numeric),
    ('TEN-CRQ-PRE-04','TEN-LO-07',45::numeric),('TEN-CRQ-PRE-04','TEN-LO-08',35::numeric),('TEN-CRQ-PRE-04','TEN-LO-10',20::numeric),
    ('TEN-CRQ-POST-04','TEN-LO-07',45::numeric),('TEN-CRQ-POST-04','TEN-LO-08',35::numeric),('TEN-CRQ-POST-04','TEN-LO-10',20::numeric)
  ) as x(question_code, lo_code, weight)
  join public.questions q on q.program_id=v_program and q.question_code=x.question_code
  join public.question_versions qv on qv.question_id=q.id and qv.version_number=1
  join public.learning_objectives lo on lo.program_id=v_program and lo.code=x.lo_code
  on conflict (question_version_id, learning_objective_id) do update set weight=excluded.weight;

  insert into public.assessment_items(assessment_id, question_version_id, position, marks)
  select case when x.form='pre' then v_pre else v_post end, qv.id, x.position, 4
  from (values
    ('pre','TEN-CRQ-PRE-01',13),('pre','TEN-CRQ-PRE-02',14),('pre','TEN-CRQ-PRE-03',15),('pre','TEN-CRQ-PRE-04',16),
    ('post','TEN-CRQ-POST-01',13),('post','TEN-CRQ-POST-02',14),('post','TEN-CRQ-POST-03',15),('post','TEN-CRQ-POST-04',16)
  ) as x(form, question_code, position)
  join public.questions q on q.program_id=v_program and q.question_code=x.question_code
  join public.question_versions qv on qv.question_id=q.id and qv.version_number=1
  on conflict (assessment_id, question_version_id) do update set position=excluded.position, marks=excluded.marks;

  insert into public.assessment_blueprint(assessment_id, learning_objective_id, target_weight, target_marks)
  select a.assessment_id, lo.id, 10, null
  from (values (v_pre),(v_post)) as a(assessment_id)
  cross join public.learning_objectives lo
  where lo.program_id=v_program and lo.code between 'TEN-LO-01' and 'TEN-LO-10'
  on conflict (assessment_id, learning_objective_id) do update set target_weight=excluded.target_weight, target_marks=excluded.target_marks;

  update public.assessments
  set duration_minutes=30,
      description='Low-stakes formative clinical-reasoning checkpoint: 12 single-best-answer items plus 4 brief constructed-response mini-cases. Written responses use analytic rubrics and human review; optional AI grading is advisory only.',
      updated_at=now()
  where id=v_pre;

  update public.assessments
  set duration_minutes=30,
      description='Matched post-program transfer checkpoint: 12 single-best-answer items plus 4 parallel constructed-response mini-cases. Written responses use analytic rubrics and human review; optional AI grading is advisory only.',
      updated_at=now()
  where id=v_post;
end $$;
