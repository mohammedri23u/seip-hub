do $$
declare
  v_program uuid;
  v_cohort uuid;
  v_pre uuid;
  v_post uuid;
begin
  select id into v_program from public.programs where code='SEIP26' limit 1;
  select id into v_cohort from public.cohorts where program_id=v_program and name='PEER BRIDGE' order by created_at limit 1;
  select id into v_pre from public.assessments where cohort_id=v_cohort and title='THE TEN — Entry Baseline' limit 1;
  select id into v_post from public.assessments where cohort_id=v_cohort and title='THE TEN — Exit Transfer Check' limit 1;

  update public.assessment_blueprint ab
  set target_marks=x.target_marks,
      target_weight=round((x.target_marks / 28.0) * 100, 3)
  from (values
    ('TEN-LO-01',3.4::numeric),
    ('TEN-LO-02',2.6::numeric),
    ('TEN-LO-03',4.4::numeric),
    ('TEN-LO-04',2.6::numeric),
    ('TEN-LO-05',4.0::numeric),
    ('TEN-LO-06',3.0::numeric),
    ('TEN-LO-07',2.8::numeric),
    ('TEN-LO-08',2.4::numeric),
    ('TEN-LO-09',1.0::numeric),
    ('TEN-LO-10',1.8::numeric)
  ) as x(lo_code,target_marks)
  join public.learning_objectives lo on lo.program_id=v_program and lo.code=x.lo_code
  where ab.learning_objective_id=lo.id and ab.assessment_id in (v_pre,v_post);
end $$;
