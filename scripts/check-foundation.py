from pathlib import Path
import re

sql = Path('supabase/migrations/0001_foundation.sql').read_text()
public_tables = re.findall(r'create table public\.([a-z_]+)', sql, flags=re.I)
rls_tables = set(re.findall(r'alter table public\.([a-z_]+) enable row level security', sql, flags=re.I))
missing = [t for t in public_tables if t not in rls_tables]

assert not missing, f'RLS missing on: {missing}'
assert 'service_role' not in sql.lower(), 'Migration must not grant or embed service_role access'
assert 'auth.role()' not in sql.lower(), 'Deprecated auth.role() usage found'
assert 'raw_user_meta_data' not in re.sub(r"new\.raw_user_meta_data ->> 'full_name'", '', sql), 'User metadata must not be used for authorization'
print(f'PASS: {len(public_tables)} public tables all enable RLS')
print('PASS: no service_role grants/secrets in migration')
print('PASS: no deprecated auth.role() policies')
