# SQL bootstrap — نصب اولیه (#1–#21)

برای **دیتابیس تازه** این فایل‌ها را **به ترتیب** در Postgres SQL Editor اجرا کنید.  
ترتیب کامل: [docs/SQL_MIGRATIONS.md](../../docs/SQL_MIGRATIONS.md)

بعد از #21 → **`consolidated-reapply.sql`** (root) را یک‌جا اجرا کنید.

| # | فایل |
| --- | --- |
| 1 | `user-anime-list.sql` |
| 2 | `anime-favorite-counts.sql` |
| 3–7 | `telegram-users*.sql` |
| 8 | `add-external-ids-scores.sql` |
| 9 | `cache-external-scores.sql` |
| 10 | `sync-external-scores-cron.sql` |
| 11 | `rls-production.sql` |
| 16 | `admin-portal-auth.sql` |
| 18 | `rls-security-phase1.sql` |
| 20 | `rls-security-phase2.sql` |
| 21 | `rls-security-phase2-list-rpc.sql` |

Vault: secret `telegram_bot_token` قبل از فاز ۲.
