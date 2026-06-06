# Admin authentication

Admin routes (`/admin/*`) are wrapped in **`AdminGate`** (`src/components/AdminGate.tsx`). This is a **UI gate only** — it does not authenticate requests to Supabase.

## How access is granted

| Method | When | Config |
|--------|------|--------|
| Telegram allowlist | User opens Mini App inside Telegram | `VITE_ADMIN_TELEGRAM_IDS` — comma-separated numeric IDs |
| Web password | Browser dev/test, no Telegram user | `VITE_ADMIN_WEB_PASSWORD` + `localStorage.admin_web_authed` |

If neither matches, admin pages show «دسترسی غیرمجاز».

## Production recommendations

1. **Use Telegram allowlist** for real admins. Get IDs from the gate screen («Telegram ID: …») or `@userinfobot`.
2. **Do not rely on web password in production.** The password is embedded in the client bundle (`import.meta.env`) and can be extracted. `localStorage` auth is trivial to forge.
3. **Protect data with RLS** — see [rls.md](./rls.md). Without write policies, anon key + knowledge of table names = full DB access.
4. **Prefer service role or Edge Functions** for admin mutations instead of wide-open anon write policies.

## Environment variables

```env
VITE_ADMIN_TELEGRAM_IDS=123456789,987654321
VITE_ADMIN_WEB_PASSWORD=dev-only-secret   # optional, browser testing
```

Typed in `src/vite-env.d.ts`.

## Security checklist before launch

- [ ] `VITE_ADMIN_WEB_PASSWORD` unset or empty in production build
- [ ] `VITE_ADMIN_TELEGRAM_IDS` lists only trusted IDs
- [ ] RLS enabled; anon key cannot INSERT/UPDATE/DELETE catalog tables
- [ ] Service role key **never** in frontend env or git
- [ ] Supabase dashboard: review API keys and disable unused providers

## Related

- [rls.md](./rls.md)
- [schema.md](./schema.md)
