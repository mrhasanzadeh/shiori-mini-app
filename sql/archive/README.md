# SQL archive — اجرا نکنید

برای به‌روزرسانی دیتابیس موجود فقط **`consolidated-reapply.sql`** (root) را اجرا کنید.

## patchهای قدیمی (قبل از consolidated)

| فایل | نقش |
| --- | --- |
| `rls-security-phase2-verify-fix.sql` | HMAC verify |
| `fix-telegram-list-init-data.sql` | list RPC |
| `fix-user-anime-list-upsert.sql` | upsert |
| `fix-telegram-init-debug.sql` | debug |
| `fix-telegram-init-decode.sql` | initData decode |
| `fix-vault-token-audit.sql` | Vault trim |
| `rls-security-admin-users-fix.sql` | admin overview |
| `rls-security-phase2-edge.sql` | register internal |
| `admin-portal-auth-fix-crypt.sql` | pgcrypto search_path |

## تکراری consolidated (#22–#26)

| فایل | یادداشت |
| --- | --- |
| `rls-security-phase2-post-migration.sql` | #22 |
| `admin-panel-features.sql` | #24 |
| `translators-is-active.sql` | #25 |
| `anime-title-romaji.sql` | #26 |
| `fix-score-columns.sql` | overflow امتیاز |
| `add-episode-pack.sql` | ستون‌های episode pack |

## یک‌بار / اختیاری (دیگر لازم نیست اگر انجام شده)

| فایل | یادداشت |
| --- | --- |
| `unify-portal-users.sql` | مهاجرت `admin_portal_*` → `telegram_users` — فقط DBهای قدیمی |
| `cron-job-sync-external-scores.sql` | قالب pg_cron — بعد از اجرا job در DB می‌ماند؛ فایل مرجع |
