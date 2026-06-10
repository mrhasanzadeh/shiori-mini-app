# Security hardening

بعد از `supabase-consolidated-reapply.sql` و `sql/supabase-notifications.sql`.

## فایل SQL

**`sql/supabase-security-hardening.sql`** — یک‌بار در SQL Editor:

| تغییر | توضیح |
| --- | --- |
| امتیاز خارجی | `update_*` / `cache_*` فقط `service_role` + RPC جدید `admin_update_anime_external_scores` |
| نقش کاربر | `get_telegram_user_role(id)` بسته → `get_my_telegram_app_role(initData)` |
| debug | `debug_telegram_init_status` فقط `service_role` |
| login | rate limit ۱۵ تلاش / ۱۵ دقیقه per email |

## Edge

```bash
npx supabase functions deploy sync-external-scores --project-ref YOUR_REF
npx supabase functions deploy telegram-user-list --project-ref YOUR_REF
```

**Secrets (الزامی برای cron):**

| Secret | کاربرد |
| --- | --- |
| `CRON_SECRET` | `sync-external-scores` — بدون آن function 503 می‌دهد |
| `TELEGRAM_BOT_TOKEN` | verify initData |
| `ALLOW_TELEGRAM_DEBUG` | فقط `true` در dev — action `debug` در Edge |

## Production env (Vercel)

```env
VITE_ADMIN_WEB_ONLY=true
# بدون VITE_ADMIN_WEB_PASSWORD
```

## فرانت

- سینک امتیاز ادمین → `admin_update_anime_external_scores` (portal token)
- کش امتیاز از AnimeDetail حذف شد (فقط نمایش زنده)
- fallback مستقیم `user_anime_list` حذف شد
- legacy `VITE_ADMIN_WEB_PASSWORD` حذف شد

## Related

- [security-phase1.md](./security-phase1.md)
- [security-phase2.md](./security-phase2.md)
- [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md)
