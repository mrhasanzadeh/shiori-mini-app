# Admin authentication

Admin routes (`/admin/*`) are wrapped in **`AdminGate`** (`src/components/AdminGate.tsx`). This is a **UI gate only** — it does not authenticate requests to Supabase.

## Modes

### Web-only admin (recommended for your setup)

Set in Vercel / `.env`:

```env
VITE_ADMIN_WEB_ONLY=true
VITE_ADMIN_WEB_PASSWORD=your-strong-password
```

- `/admin` opens in **browser** with password login (works in production after redeploy).
- Inside **Telegram Mini App**, admin is blocked with a link to open the browser.
- `VITE_ADMIN_TELEGRAM_IDS` is ignored in this mode.

### Telegram + optional dev web (default)

| Method | When | Config |
|--------|------|--------|
| Telegram allowlist | Mini App inside Telegram | `VITE_ADMIN_TELEGRAM_IDS` |
| DB role | `telegram_users.app_role` = `admin` / `moderator` | SQL |
| Web password | Browser, **dev only** by default | `VITE_ADMIN_WEB_PASSWORD` |
| Web password in prod | Browser | `VITE_ADMIN_WEB_AUTH=true` + password |

## Production (Vercel)

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ADMIN_WEB_ONLY=true
VITE_ADMIN_WEB_PASSWORD=...
```

Redeploy after changing `VITE_*` variables.

Logout from web admin: clear `localStorage.admin_web_authed` or use private/incognito.

## Security

1. Web password is embedded in the client bundle — use a **strong unique password**; this is convenience, not bank-grade auth.
2. **RLS** must protect data — see [rls.md](./rls.md). Uncomment catalog write policies if admin panel saves with anon key.
3. Never put `SUPABASE_SERVICE_ROLE_KEY` in frontend env.

## Related

- [rls.md](./rls.md)
- [DEPLOY.md](./DEPLOY.md)
