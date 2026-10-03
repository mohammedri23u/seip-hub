do $$ declare definition text; begin
 select pg_get_functiondef('private.validate_assessment_release_integrity()'::regprocedure) into definition;
 if position('micro_assessment_versions' in definition)=0 then
  definition:=replace(definition,'where u.release_id=binding.release_id and u.unit_kind=', 'where u.release_id=binding.release_id and coalesce(u.source_payload->>''instrument_version'',''legacy'') = coalesce((select m.instrument_version from private.micro_assessment_versions m where m.assessment_id=new.id),''legacy'') and u.unit_kind=');
  execute definition;
 end if;
end $$;
