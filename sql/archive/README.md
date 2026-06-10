# SQL archive — اجرا نکنید

برای به‌روزرسانی دیتابیس موجود فقط **`supabase-consolidated-reapply.sql`** (root) را اجرا کنید.

## patchهای قدیمی (قبل از consolidated)

| فایل | نقش |
| --- | --- |
| `supabase-rls-security-phase2-verify-fix.sql` | HMAC verify |
| `supabase-fix-telegram-list-init-data.sql` | list RPC |
| `supabase-fix-user-anime-list-upsert.sql` | upsert |
| `supabase-fix-telegram-init-debug.sql` | debug |
| `supabase-fix-telegram-init-decode.sql` | initData decode |
| `supabase-fix-vault-token-audit.sql` | Vault trim |
| `supabase-rls-security-admin-users-fix.sql` | admin overview |
| `supabase-rls-security-phase2-edge.sql` | register internal |
| `supabase-admin-portal-auth-fix-crypt.sql` | pgcrypto search_path |

## تکراری consolidated (#22–#26)

| فایل | یادداشت |
| --- | --- |
| `supabase-rls-security-phase2-post-migration.sql` | #22 |
| `supabase-admin-panel-features.sql` | #24 |
| `supabase-translators-is-active.sql` | #25 |
| `supabase-anime-title-romaji.sql` | #26 |
| `supabase-fix-score-columns.sql` | overflow امتیاز |
| `supabase-add-episode-pack.sql` | ستون‌های episode pack |

## یک‌بار / اختیاری (دیگر لازم نیست اگر انجام شده)

| فایل | یادداشت |
| --- | --- |
| `supabase-unify-portal-users.sql` | مهاجرت `admin_portal_*` → `telegram_users` — فقط DBهای قدیمی |
| `supabase-cron-job-sync-external-scores.sql` | قالب pg_cron — بعد از اجرا job در DB می‌ماند؛ فایل مرجع |
