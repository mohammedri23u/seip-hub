# Stage 2 bootstrap

The application deliberately has no public signup route yet. Bootstrap the first administrator once through the Supabase Dashboard.

## 1. Create the first Auth user

In Supabase Dashboard → Authentication → Users, create a user with email/password.

The `on_auth_user_created` trigger creates the matching row in `public.profiles` automatically.

## 2. Promote the user to platform administrator

Copy the user's UUID from Authentication → Users, then run this in the SQL editor:

```sql
insert into public.platform_admins (user_id)
values ('PASTE_AUTH_USER_UUID_HERE')
on conflict (user_id) do nothing;
```

## 3. Sign in locally

Open `/login`, sign in with that account, then use **Create program** from the dashboard.

Creating a program also creates an active `program_director` membership for the administrator who created it.

## Security note

The bootstrap SQL is a one-time administrative action. There is intentionally no browser-side route that can promote a user to `platform_admin`.
