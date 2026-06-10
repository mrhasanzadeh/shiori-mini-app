# Admin authentication

Admin routes (`/admin/*`) use **`AdminGate`** + **`/admin/login`**.

See **[users-and-roles.md](./users-and-roles.md)** for the table map (`telegram_users` = single source of truth).

## Flow (web-only)

1. User opens `/admin` → redirect to **`/admin/login?next=...`**
2. Login with **email + password** from row in **`telegram_users`**
3. Role from **`app_role`**: `admin` (full) or `moderator` (content only)

## Setup

### 1. SQL

Run **`sql/bootstrap/supabase-admin-portal-auth.sql`**.

If you previously created `admin_portal_accounts`, also run **`sql/archive/supabase-unify-portal-users.sql`** (one-time legacy migration).

Set web login on an existing Telegram user:

```sql
UPDATE telegram_users
SET app_role = 'admin',
    email = 'admin@shiori.app',
    password_hash = crypt('YOUR_STRONG_PASSWORD', gen_salt('bf'))
WHERE telegram_user_id = YOUR_TELEGRAM_ID;
```

Web-only admin (no Telegram) — use negative `telegram_user_id`:

```sql
INSERT INTO telegram_users (telegram_user_id, first_name, email, password_hash, app_role)
VALUES (-1000001, 'مدیر وب', 'admin@shiori.app', crypt('YOUR_PASSWORD', gen_salt('bf')), 'admin');
```

### 2. Vercel env

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ADMIN_WEB_ONLY=true
```

Redeploy after changes.

## Logout

Sidebar → **خروج** (clears `user_portal_sessions` + localStorage).

## Security

- Passwords: bcrypt in `telegram_users.password_hash`
- Sessions: `user_portal_sessions` (7-day expiry)
- UI gate only — use **RLS** for data ([rls.md](./rls.md))

## Related

- [users-and-roles.md](./users-and-roles.md)
- [rls.md](./rls.md)
- [DEPLOY.md](./DEPLOY.md)
