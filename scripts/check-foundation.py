from pathlib import Path
import re

migration_files = sorted(Path('supabase/migrations').glob('*.sql'))
sql = '\n'.join(path.read_text() for path in migration_files)
public_tables = re.findall(r'create table public\.([a-z_]+)', sql, flags=re.I)
rls_tables = set(re.findall(r'alter table public\.([a-z_]+) enable row level security', sql, flags=re.I))
missing = [t for t in public_tables if t not in rls_tables]

assert not missing, f'RLS missing on: {missing}'
assert 'service_role' not in sql.lower(), 'Migrations must not grant or embed service_role access'
assert 'auth.role()' not in sql.lower(), 'Deprecated auth.role() usage found'

# raw_user_meta_data is allowed only for non-authorization profile hydration in handle_new_user().
metadata_uses = [line.strip() for line in sql.splitlines() if 'raw_user_meta_data' in line]
assert metadata_uses == ["values (new.id, new.raw_user_meta_data ->> 'full_name', new.email)"], 'User metadata must not be used for authorization'

# The learner-delivery RPC must exist once assessment tables are present and must not expose correctness flags.
if 'create table public.assessments' in sql.lower():
    delivery_match = re.search(r'create or replace function public\.get_assessment_delivery.*?\$\$;', sql, flags=re.I | re.S)
    assert delivery_match, 'Secure learner assessment delivery RPC is missing'
    delivery_sql = delivery_match.group(0).lower()
    assert "'is_correct'" not in delivery_sql, 'Learner delivery must not expose correct-answer flags'
    assert "'explanation'" not in delivery_sql, 'Learner delivery must not expose explanations/model answers'

print(f'PASS: {len(public_tables)} public tables all enable RLS across {len(migration_files)} migrations')
print('PASS: no service_role grants/secrets in migrations')
print('PASS: no deprecated auth.role() policies')
print('PASS: learner assessment delivery does not expose answer keys')


# Stage 4: AI may propose scores, but final decisions must remain human-governed.
if 'create table public.final_score_decisions' in sql.lower():
    normalized_sql = ' '.join(sql.lower().split())
    assert "decision_source in ('human_review', 'moderation')" in normalized_sql, 'Final score source must be human review or moderation only'
    assert "decision_source in ('ai" not in normalized_sql, 'AI must never be a final score source'

    grading_code = Path('src/lib/ai/grading.ts').read_text()
    assert 'store: false' in grading_code, 'AI grading requests must disable provider-side response storage by default'
    assert 'NEXT_PUBLIC_OPENAI_API_KEY' not in grading_code and 'NEXT_PUBLIC_OPENAI_API_KEY' not in Path('.env.example').read_text(), 'OpenAI API key must stay server-only'
    print('PASS: AI grading is advisory; final score authority remains human')
    print('PASS: AI provider key is server-only and Responses API storage is disabled')
