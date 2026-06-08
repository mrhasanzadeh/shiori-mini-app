# Admin authentication

Admin routes (`/admin/*`) use **`AdminGate`** + **`/admin/login`**.

## Flow (web-only)

1. User opens `/admin` (or any admin sub-route)
2. If not logged in → redirect to **`/admin/login?next=...`**
3. Login with **email + password** (stored in Supabase, verified server-side)
4. Redirect to `next` with role-based access:
   - **`admin`** → full panel including `/admin/users`
   - **`moderator`** → content sections only (no user management)

Sidebar and admin chrome appear **only after** successful login.

## Setup

### 1. SQL (Supabase SQL Editor)

Run **`supabase-admin-portal-auth.sql`**, then create the first account:

```sql
INSERT INTO admin_portal_accounts (email, password_hash, display_name, app_role)
VALUES (
  'admin@shiori.app',
  crypt('YOUR_STRONG_PASSWORD', gen_salt('bf')),
  'مدیر اصلی',
  'admin'
);
```

Add moderators with `app_role = 'moderator'`.

### 2. Vercel env

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ADMIN_WEB_ONLY=true
```

Redeploy after changes.

`VITE_ADMIN_WEB_PASSWORD` is optional legacy fallback (single shared password in bundle). Prefer portal accounts.

## Telegram Mini App

With `VITE_ADMIN_WEB_ONLY=true`, admin is **blocked** inside Telegram. Users see a link to open `/admin/login` in the browser.

## Logout

Sidebar → **خروج** (clears session in DB + localStorage).

## Security

- Passwords hashed with `pgcrypt` / bcrypt in Postgres
- Session tokens in `admin_portal_sessions` (7-day expiry)
- UI gate only — protect writes with **RLS** ([rls.md](./rls.md))
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend

## Related

- [rls.md](./rls.md)
- [DEPLOY.md](./DEPLOY.md)
