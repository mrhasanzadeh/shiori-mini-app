# Security — RLS phase 2 (Telegram initData)

Apply after [`supabase-rls-security-phase1.sql`](../supabase-rls-security-phase1.sql).

| Step | File |
|------|------|
| 1 | [`supabase-rls-security-phase2.sql`](../supabase-rls-security-phase2.sql) |
| 2 | [`supabase-rls-security-phase2-list-rpc.sql`](../supabase-rls-security-phase2-list-rpc.sql) |
| 3 | [`supabase-rls-security-phase2-post-migration.sql`](../supabase-rls-security-phase2-post-migration.sql) |
| 4 | Edge Function — [telegram-user-list-edge.md](./telegram-user-list-edge.md) |

## What changes

| Before | After |
|--------|--------|
| Anyone with anon key can read/write any `user_anime_list` row | Only rows where `telegram_user_id` matches **verified** `initData` |
| `register_telegram_user_visit` trusts client ID | Requires valid signed `initData` |
| Favorite count via direct table SELECT | RPC `get_anime_favorite_count` (public aggregates only) |
| Admin `/admin/users` favorite counts | Portal staff can SELECT all lists (read-only) |

## One-time setup: Bot token in Vault

In Supabase Dashboard → **Vault** (or SQL as postgres):

```sql
SELECT vault.create_secret(
  'YOUR_BOT_TOKEN_FROM_BOTFATHER',
  'telegram_bot_token',
  'Telegram bot token for Mini App initData HMAC'
);
```

- Token = **همان bot** که Mini App URL در BotFather روی آن است.
- فقط **یک** secret با نام `telegram_bot_token` (duplicate باعث verify اشتباه می‌شود).
- چک: `SELECT * FROM public.telegram_vault_token_audit;` (service role)

> Token is **never** stored in frontend `.env`.

## Edge Function (توصیه‌شده)

مینی‌اپ از **direct link / startapp** فیلد `signature` در initData دارد. Edge با Web Crypto + Ed25519 این حالت را پوشش می‌دهد.

1. SQL: [`supabase-rls-security-phase2-edge.sql`](../supabase-rls-security-phase2-edge.sql) (یا داخل post-migration)
2. Secret `TELEGRAM_BOT_TOKEN` = همان BotFather token
3. `npx supabase functions deploy telegram-user-list --project-ref YOUR_REF`

جزئیات: [telegram-user-list-edge.md](./telegram-user-list-edge.md)

## Frontend

- Header `x-telegram-init-data` برای RPC/RLS (`src/lib/telegramRequestHeaders.ts`)
- درخواست‌های `/functions/v1/` header سفارشی نمی‌فرستند (CORS) — initData در JSON body است (`src/lib/supabase.ts`)
- ذخیره favorite: Edge اول، بعد RPC، بعد RLS (`src/services/supabaseUserList.ts`)

## Verify

**In Telegram Mini App:**

- [ ] Favorite add/remove
- [ ] Progress + rating (bottom sheet)
- [ ] My List sync
- [ ] Profile registers user
- [ ] Home favorite counts

**Debug (Console در Telegram):**

```javascript
const initData = window.Telegram.WebApp.initData
const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/debug_telegram_init_status`, {
  method: 'POST',
  headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_init_data: initData }),
})
console.log(await res.json()) // failure_reason: "ok"
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `invalid telegram init data` / `hash_mismatch` | Vault token = bot بازکنندهٔ مینی‌اپ؛ اجرای post-migration SQL |
| `init_data_keys` شامل `signature` | طبیعی برای startapp — Edge deploy کنید |
| `Failed to send a request to the Edge Function` + CORS | Edge redeploy + فرانت با `supabase.ts` جدید (بدون header روی Edge) |
| Admin users «خطای ناشناخته» | post-migration (RPC `admin_telegram_users_overview`) |
| Favorite فقط local | verify fail — دیباگ RPC بالا |

## Related

- [security-phase1.md](./security-phase1.md)
- [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md)
- [telegram-user-list-edge.md](./telegram-user-list-edge.md)
