# SQL bootstrap — نصب اولیه (#1–#21)

برای **دیتابیس تازه** این فایل‌ها را **به ترتیب** در Supabase SQL Editor اجرا کنید.  
ترتیب کامل: [docs/SQL_MIGRATIONS.md](../../docs/SQL_MIGRATIONS.md)

بعد از #21 → **`supabase-consolidated-reapply.sql`** (root) را یک‌جا اجرا کنید.

| # | فایل |
| --- | --- |
| 1 | `supabase-user-anime-list.sql` |
| 2 | `supabase-anime-favorite-counts.sql` |
| 3–7 | `supabase-telegram-users*.sql` |
| 8 | `supabase-add-external-ids-scores.sql` |
| 9 | `supabase-cache-external-scores.sql` |
| 10 | `supabase-sync-external-scores-cron.sql` |
| 11 | `supabase-rls-production.sql` |
| 16 | `supabase-admin-portal-auth.sql` |
| 18 | `supabase-rls-security-phase1.sql` |
| 20 | `supabase-rls-security-phase2.sql` |
| 21 | `supabase-rls-security-phase2-list-rpc.sql` |

Vault: secret `telegram_bot_token` قبل از فاز ۲.
