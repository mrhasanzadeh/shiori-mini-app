# Edge Function: telegram-user-list

Validates Telegram `initData` (HMAC + Ed25519 برای direct link / `signature`) and reads/writes `user_anime_list` with service role.

## Deploy checklist

### 1. SQL

[`supabase-consolidated-reapply.sql`](../supabase-consolidated-reapply.sql)  
(شامل post-migration و `register_telegram_user_visit_internal`)

### 2. Secret

Dashboard → **Edge Functions** → **Secrets**:

| Name | Value |
|------|--------|
| `TELEGRAM_BOT_TOKEN` | BotFather API token (**همان bot** مینی‌اپ) |

```bash
npx supabase secrets set TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN" --project-ref YOUR_PROJECT_REF
```

### 3. Deploy function

```bash
npx supabase functions deploy telegram-user-list --project-ref YOUR_PROJECT_REF
```

CORS در function اجازه می‌دهد:  
`authorization, x-client-info, apikey, content-type, x-telegram-init-data, x-portal-token`

### 4. Deploy frontend

Vercel redeploy — `src/lib/supabase.ts` برای Edge درخواست header سفارشی نمی‌فرستد (initData در body).

## Debug (Telegram Desktop console)

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co'
const ANON_KEY = 'YOUR_ANON_KEY'
const initData = window.Telegram.WebApp.initData

const res = await fetch(`${SUPABASE_URL}/functions/v1/telegram-user-list`, {
  method: 'POST',
  headers: {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ action: 'debug', initData }),
})
console.log(await res.json())
```

Expected: `{ reason: 'ok', verified_user_id: YOUR_ID, verify_method: '...', edge_bot_username: '...' }`

## Architecture

| Path | Verify | Write |
|------|--------|-------|
| Edge (primary) | `TELEGRAM_BOT_TOKEN` secret + Web Crypto | service role |
| SQL RPC | Vault `telegram_bot_token` | SECURITY DEFINER |
| RLS direct | header `x-telegram-init-data` | policy |

## Related

- [security-phase2.md](./security-phase2.md)
- [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md)
