do $$
declare pid uuid; cid uuid; creator uuid;
begin
  select p.id,c.id,p.created_by into pid,cid,creator
  from public.programs p join public.cohorts c on c.program_id=p.id
  where p.code='SEIP26' and c.status='active' order by c.created_at limit 1;
  if pid is null then raise exception 'SEIP26 active cohort not found'; end if;

  insert into public.sessions(cohort_id,title,description,duration_minutes,status,join_code,created_by)
  select cid,'M01 — SEE THE PATTERN','THE TEN First Activation · Ibn Sina · Problem Representation + Differential Diagnosis + Red-Flag Recognition',90,'scheduled','TEN-M01',creator
  where not exists(select 1 from public.sessions where cohort_id=cid and join_code='TEN-M01');

  insert into public.sessions(cohort_id,title,description,duration_minutes,status,join_code,created_by)
  select cid,'M02 — QUESTION THE EVIDENCE','THE TEN First Activation · Al-Razi · Evidence Interpretation + Diagnostic Updating + Cognitive Bias',90,'scheduled','TEN-M02',creator
  where not exists(select 1 from public.sessions where cohort_id=cid and join_code='TEN-M02');

  insert into public.sessions(cohort_id,title,description,duration_minutes,status,join_code,created_by)
  select cid,'M03 — TEST THE HYPOTHESIS','THE TEN First Activation · Jabir ibn Hayyan · Investigation Selection + Pretest Probability',90,'scheduled','TEN-M03',creator
  where not exists(select 1 from public.sessions where cohort_id=cid and join_code='TEN-M03');

  insert into public.sessions(cohort_id,title,description,duration_minutes,status,join_code,created_by)
  select cid,'M04 — TREAT THE PATIENT','THE TEN First Activation · Hippocrates · Integration + Patient Safety + Reassessment',90,'scheduled','TEN-M04',creator
  where not exists(select 1 from public.sessions where cohort_id=cid and join_code='TEN-M04');
end $$;
