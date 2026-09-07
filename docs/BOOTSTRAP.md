# Bootstrap

## 1. Create a dedicated Supabase project

Use a new project for SEIP Hub. Do not reuse another production project.

Recommended region for Iraq: choose the lowest-latency available region after a quick latency check. Existing projects in the account use AP regions, but the SEIP project should be selected deliberately.

## 2. Apply migration

Run `supabase/migrations/0001_foundation.sql` through the Supabase migration workflow.

## 3. Configure environment

Copy `.env.example` to `.env.local` and insert the project URL and the modern `sb_publishable_...` key.

## 4. Create the first user

Create/invite the initial user in Supabase Auth. The auth trigger creates the `profiles` row automatically.

## 5. Bootstrap platform admin

From the protected SQL editor, after replacing the email:

```sql
insert into public.platform_admins (user_id)
select id from auth.users where email = 'YOUR_ADMIN_EMAIL'
on conflict (user_id) do nothing;
```

There is intentionally no client-side policy that allows a user to promote themselves to platform administrator.

## 6. Create a program

Once the platform admin signs in, program creation can be implemented as the next server action. RLS already permits platform administrators to insert programs.
