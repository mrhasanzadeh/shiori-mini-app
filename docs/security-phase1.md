# Security — RLS phase 1

Apply after [`supabase-rls-production.sql`](../supabase-rls-production.sql) and admin portal auth SQL.

**File:** [`supabase-rls-security-phase1.sql`](../supabase-rls-security-phase1.sql)

## What changes

| Before | After |
|--------|--------|
| `telegram_users` public SELECT (includes `password_hash`) | SELECT only with valid `x-portal-token` header; `password_hash` column not granted to anon |
| Catalog write via open anon policies (phase 2) | Write only with valid portal session header |
| `update_telegram_user_admin` callable by anyone | Requires portal token + **full admin** role |
| Role lookup via direct table SELECT | RPC `get_telegram_user_role` |

## Frontend requirement

The Supabase client sends `x-portal-token` from `admin_portal_session` in localStorage on every request (see `src/lib/supabase.ts`).

Admin panel must be used **after `/admin/login`** in the browser.

## Verify in Supabase SQL Editor (as anon)

```sql
-- Should NOT return password_hash (column privilege denied)
SELECT password_hash FROM telegram_users LIMIT 1;

-- Should return ok:false (not function missing)
SELECT admin_portal_login('wrong@x.com', 'wrong');

-- Role lookup without exposing table
SELECT get_telegram_user_role(90344148);
```

## Verify in browser (logged out)

DevTools → Network → any `telegram_users` request should fail (403 / RLS).

## Verify in admin panel (logged in)

- Save anime / genre
- `/admin/users` list + edit role
- Logout → saves should fail again

## Known remaining gaps (phase 2 — see security-phase2.md)

- ~~`user_anime_list` still trusts client `telegram_user_id`~~ → fixed in phase 2 SQL
- Staff with session can read `email` on `telegram_users` (not password hash)

## Related

- [rls.md](./rls.md)
- [admin-auth.md](./admin-auth.md)
- [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md)
