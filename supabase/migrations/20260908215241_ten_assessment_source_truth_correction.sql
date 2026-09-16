do $$
declare
  pid uuid;
  creator uuid;
  item jsonb;
  qid uuid;
  qvid uuid;
  opt text;
  pos integer;
  items jsonb := $json$
  [
    {"code":"TEN-CR-01","stem":"A 29-year-old with sudden maximal-intensity headache during exercise and normal neuro exam. Best next step?","options":["Treat as migraine","Urgent evaluation for secondary cause","Routine follow-up","No imaging because neuro exam normal"],"correct_index":1,"rationale":"Thunderclap/exertional red flag changes urgency."},
    {"code":"TEN-CR-02","stem":"Which Problem Representation is strongest?","options":["Headache in a man","32-year-old with headache and vomiting","32-year-old with abrupt exertional thunderclap headache, vomiting and neck stiffness","Migraine patient with pain"],"correct_index":2,"rationale":"Strong representations use discriminating features and tempo."},
    {"code":"TEN-CR-03","stem":"A normal first ECG in suspected ACS means:","options":["ACS excluded","No STEMI shown, but ACS may remain","Troponin not needed","Patient can be discharged"],"correct_index":1,"rationale":"Initial nondiagnostic ECG does not exclude ACS."},
    {"code":"TEN-CR-04","stem":"An early hs-cTn within reference range 45 minutes after symptom onset should be interpreted as:","options":["Definitive rule-out","Nondiagnostic; serial testing may be required","Proof of reflux","Proof of unstable angina"],"correct_index":1,"rationale":"Timing and serial change matter."},
    {"code":"TEN-CR-05","stem":"The reasoning error in accepting reflux after an initial normal ECG and early troponin is most consistent with:","options":["Premature closure","Search satisfaction from CT","Hindsight bias","Base-rate neglect only"],"correct_index":0,"rationale":"The diagnostic process was closed before adequate evidence."},
    {"code":"TEN-CR-06","stem":"In suspected PE with low clinical suspicion, PERC is useful when:","options":["Any one criterion is negative","All criteria are negative and context is appropriate","D-dimer is positive","CTPA is unavailable"],"correct_index":1,"rationale":"PERC is a rule-out aid only in appropriate low-suspicion patients."},
    {"code":"TEN-CR-07","stem":"A positive D-dimer in a PE-unlikely pathway means:","options":["PE confirmed","Further evaluation/imaging is needed","No further testing","Thrombolysis"],"correct_index":1,"rationale":"D-dimer is nonspecific and not a rule-in test."},
    {"code":"TEN-CR-08","stem":"The best question before ordering a diagnostic test is:","options":["Which test is newest?","What is my pretest probability and how will the result change management?","Which test gives the most data?","Which test is most expensive?"],"correct_index":1,"rationale":"Testing should answer a defined clinical question."},
    {"code":"TEN-CR-09","stem":"After an intervention in an acutely deteriorating patient, the next reasoning step is often:","options":["Repeat the same intervention automatically","Reassess physiology and update the plan","Stop monitoring","Wait for discharge"],"correct_index":1,"rationale":"Management is iterative and response becomes new evidence."},
    {"code":"TEN-CR-10","stem":"An undocumented “penicillin allergy” label should prompt:","options":["Automatic lifelong avoidance without questions","Clarification of reaction phenotype and medication reconciliation","Ignoring the label","Delay of all urgent therapy indefinitely"],"correct_index":1,"rationale":"Allergy verification is a patient-safety step."},
    {"code":"TEN-CR-11","stem":"Which is the best example of confidence calibration?","options":["Confidence never changes","Confidence is recorded before and after new evidence and compared with correctness","Higher confidence earns more points","Only correct learners report confidence"],"correct_index":1,"rationale":"Calibration is about matching certainty to evidence."},
    {"code":"TEN-CR-12","stem":"Which statement best captures the program’s goal?","options":["Memorize four diseases","Use four cases to practice transferable reasoning habits","Compete for fastest diagnosis","Collect character rewards"],"correct_index":1,"rationale":"The disease is the vehicle; transferable reasoning is the target."}
  ]
  $json$::jsonb;
begin
  select id, created_by into pid, creator from public.programs where code='SEIP26' limit 1;
  if pid is null then raise exception 'SEIP26 program not found'; end if;

  for item in select value from jsonb_array_elements(items)
  loop
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
    else
      update public.question_versions
      set stem=item->>'stem', explanation=item->>'rationale', difficulty_target='moderate', marks=1
      where id=qvid;
    end if;

    delete from public.question_options where question_version_id=qvid;
    pos := 0;
    for opt in select jsonb_array_elements_text(item->'options')
    loop
      pos := pos + 1;
      insert into public.question_options(question_version_id,option_text,is_correct,position)
      values(qvid,opt,pos=((item->>'correct_index')::integer + 1),pos);
    end loop;
  end loop;
end $$;