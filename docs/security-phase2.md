# Security — RLS phase 2 (Telegram initData)

Apply after [`supabase-rls-security-phase1.sql`](../supabase-rls-security-phase1.sql).

**File:** [`supabase-rls-security-phase2.sql`](../supabase-rls-security-phase2.sql)

## What changes

| Before | After |
|--------|--------|
| Anyone with anon key can read/write any `user_anime_list` row | Only rows where `telegram_user_id` matches **verified** `initData` |
| `register_telegram_user_visit` trusts client ID | Requires valid signed `initData` header |
| Favorite count via direct table SELECT | RPC `get_anime_favorite_count` (public aggregates only) |
| Admin `/admin/users` favorite counts | Portal staff can SELECT all lists (read-only) |

## One-time setup: Bot token in Vault

In Supabase SQL Editor (**as postgres**, not anon):

```sql
SELECT vault.create_secret(
  'YOUR_BOT_TOKEN_FROM_BOTFATHER',
  'telegram_bot_token',
  'Telegram bot token for Mini App initData HMAC'
);
```

To rotate: create a new secret with the same name in Dashboard → **Vault**, or update via SQL.

> Token is **never** stored in the frontend or `.env` committed to git.

## Frontend

The Supabase client sends header `x-telegram-init-data` from `WebApp.initData` (see `src/lib/telegramRequestHeaders.ts`).

Deploy frontend **before or with** SQL phase 2 so Mini App requests include the header.

## Verify

**SQL Editor as anon** (should return 0 rows / fail write):

```sql
SELECT * FROM user_anime_list LIMIT 1;
INSERT INTO user_anime_list (telegram_user_id, anime_id)
VALUES (90344148, '00000000-0000-0000-0000-000000000001'::uuid);
```

**In Telegram Mini App:**

- [ ] Favorite add/remove
- [ ] My List sync
- [ ] Profile registers user (no `invalid telegram init data` in console)
- [ ] Home popular slider (favorite counts RPC)

**Admin panel (browser, logged in):**

- [ ] `/admin/users` loads (staff read policy on lists)

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `invalid telegram init data` on every action | Vault secret missing/wrong bot token |
| Favorite works in app but counts show 0 | Run phase 2 SQL; redeploy frontend |
| Admin users page empty favorites | Login admin first (`x-portal-token` header) |

## Related

- [security-phase1.md](./security-phase1.md)
- [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md)
