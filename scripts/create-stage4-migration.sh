#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f supabase/templates/grading_core.sql ]]; then
  echo "Run this from the SEIP Hub repository root." >&2
  exit 1
fi

npx supabase migration new grading_core >/tmp/seip-stage4-migration.txt
migration_file=$(find supabase/migrations -maxdepth 1 -type f -name '*_grading_core.sql' | sort | tail -1)
if [[ -z "${migration_file}" ]]; then
  echo "Could not locate the newly created grading_core migration." >&2
  exit 1
fi

cp supabase/templates/grading_core.sql "${migration_file}"
echo "Created ${migration_file}"
