#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f supabase/templates/gamified_learning_core.sql ]]; then
  echo "Run this from the SEIP Hub repository root." >&2
  exit 1
fi

npx supabase migration new gamified_learning_core >/tmp/seip-stage5-migration.txt
migration_file=$(find supabase/migrations -maxdepth 1 -type f -name '*_gamified_learning_core.sql' | sort | tail -1)
if [[ -z "${migration_file}" ]]; then
  echo "Could not locate the newly created gamified_learning_core migration." >&2
  exit 1
fi

cp supabase/templates/gamified_learning_core.sql "${migration_file}"
echo "Created ${migration_file}"
