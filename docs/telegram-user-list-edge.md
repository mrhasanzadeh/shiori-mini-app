# Edge Function: telegram-user-list

Validates Telegram `initData` with **Web Crypto** (same as official Telegram algorithm) and reads/writes `user_anime_list` with service role.

## Deploy

### 1. SQL

Run **`supabase-rls-security-phase2-edge.sql`** in Supabase SQL Editor.

### 2. Secret

Dashboard → **Edge Functions** → **Secrets**:

| Name | Value |
|------|--------|
| `TELEGRAM_BOT_TOKEN` | BotFather API token (same bot as Mini App) |

Or CLI:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN" --project-ref olscbzxwcddwumxispst
```

### 3. Deploy function

```bash
supabase functions deploy telegram-user-list --project-ref olscbzxwcddwumxispst
```

### 4. Deploy frontend

Vercel redeploy after pulling latest code (uses `supabase.functions.invoke`).

## Debug (inside Telegram Desktop console)

```javascript
const initData = window.Telegram.WebApp.initData
const key = 'YOUR_ANON_KEY'

const { data, error } = await supabase.functions.invoke('telegram-user-list', {
  body: { action: 'debug', initData },
})

console.log(data, error)
```

Or use app's supabase client if available.

Expected: `{ reason: 'ok', verified_user_id: YOUR_ID, ... }`

## Related

- [security-phase2.md](./security-phase2.md)
- Vault `telegram_bot_token` is only for SQL RPC path; Edge uses `TELEGRAM_BOT_TOKEN` secret.
