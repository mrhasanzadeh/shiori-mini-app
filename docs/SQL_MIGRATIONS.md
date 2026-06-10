# SQL migrations — ترتیب اجرا

همه فایل‌های فعال در **root** پروژه هستند و در **Supabase SQL Editor** اجرا می‌شوند.

## کدام مسیر را بروید؟

| وضعیت | کار |
| --- | --- |
| **دیتابیس تازه** | جدول‌های زیر (#1–#26) را به ترتیب اجرا کنید |
| **دیتابیس موجود — فقط به‌روزرسانی** | یک فایل: **`supabase-consolidated-reapply.sql`** |
| **patchهای قدیمی** | `sql/archive/` — **اجرا نکنید** (جایگزین شده با consolidated) |

> **`supabase-consolidated-reapply.sql`** idempotent است: ستون‌های جدید، RPC، view، trigger و RLS patchها — **بدون** `TRUNCATE` / `DROP TABLE` روی `anime`، `user_anime_list`، `telegram_users` و غیره.  
> عمداً شامل **`supabase-unify-portal-users.sql`** نیست (آن فایل `admin_portal_*` را حذف می‌کند — فقط اگر قبلاً آن جداول را داشتید و یک‌بار مهاجرت نکرده‌اید).

## ۱. هسته کاتالوگ و کاربر

| #   | فایل                                             | توضیح                              |
| --- | ------------------------------------------------ | ---------------------------------- |
| 1   | `supabase-user-anime-list.sql`                   | لیست شخصی + `shiori_score` trigger |
| 2   | `supabase-anime-favorite-counts.sql`             | RPC تعداد favorite                 |
| 3   | `supabase-telegram-users.sql`                    | جدول کاربران + register RPC        |
| 4   | `supabase-telegram-users-roles.sql`              | نقش‌ها + view ادمین                |
| 5   | `supabase-telegram-users-fix-username.sql`       | حفظ یوزرنیم در revisit             |
| 6   | `supabase-telegram-users-protect-last-admin.sql` | جلوگیری از demote آخرین ادمین      |
| 7   | `supabase-telegram-users-admin-username.sql`     | ویرایش دستی یوزرنیم از پنل         |

## ۲. امتیاز خارجی

| #   | فایل                                     | توضیح                              |
| --- | ---------------------------------------- | ---------------------------------- |
| 8   | `supabase-add-external-ids-scores.sql`   | ستون‌های MAL/IMDB (اگر ندارید)     |
| 9   | `supabase-cache-external-scores.sql`     | cache اولیه                        |
| 10  | `supabase-sync-external-scores-cron.sql` | RPC `update_anime_external_scores` |

## ۳. امنیت و production

| #   | فایل                          | توضیح                          |
| --- | ----------------------------- | ------------------------------ |
| 11  | `supabase-rls-production.sql` | RLS خواندن عمومی + user tables |

> بخش write کاتالوگ در همان فایل **comment** شده — فقط اگر پنل با anon می‌نویسد uncomment کنید.

## ۴. Cron (بعد از deploy Edge Function)

| #   | فایل / action                                         | توضیح                                                          |
| --- | ----------------------------------------------------- | -------------------------------------------------------------- |
| 12  | `supabase functions deploy sync-external-scores`      | Edge Function                                                  |
| 13  | Secrets: `CRON_SECRET`, `OMDB_API_KEY`                | Dashboard                                                      |
| 14  | `supabase-cron-sync-external-scores.sql`              | راهنمای Cron (Dashboard → Integrations → Cron)                 |
| 15  | `supabase-cron-job-sync-external-scores.sql`          | SQL آماده pg_cron (جایگزین YOUR_ANON_KEY و YOUR_CRON_SECRET)   |
| 16  | `supabase-admin-portal-auth.sql`                      | ورود وب روی `telegram_users` + `user_portal_sessions`          |
| 17  | `supabase-unify-portal-users.sql`                     | مهاجرت از `admin_portal_*` (فقط اگر قبلاً ساخته بودید)         |
| 18  | `supabase-rls-security-phase1.sql`                    | **امنیت:** portal token RLS + قفل `password_hash`              |
| 19  | Vault: `telegram_bot_token`                           | Dashboard → Vault (BotFather token) — قبل از فاز ۲             |
| 20  | `supabase-rls-security-phase2.sql`                    | **امنیت:** initData برای `user_anime_list`                     |
| 21  | `supabase-rls-security-phase2-list-rpc.sql`           | RPC لیست + register با `p_init_data`                           |
| 22  | **`supabase-rls-security-phase2-post-migration.sql`** | **patch نهایی:** verify decode، upsert، admin، edge SQL، debug |
| 23  | Edge: `telegram-user-list` + `TELEGRAM_BOT_TOKEN`     | [telegram-user-list-edge.md](./telegram-user-list-edge.md)     |
| 24  | **`supabase-admin-panel-features.sql`**               | ایمیل/رمز ادمین از پنل + audit آخرین ویرایش انیمه              |
| 25  | **`supabase-translators-is-active.sql`**              | ستون `is_active` برای مترجم‌ها                                 |
| 26  | **`supabase-anime-title-romaji.sql`**                 | ستون `title_romaji` برای جستجو و نمایش عنوان Romaji           |

> **دیتابیس موجود:** به‌جای اجرای جداگانهٔ #22–#26 و `supabase-fix-score-columns.sql`، فقط **`supabase-consolidated-reapply.sql`** را بزنید.

### patchهای قدیمی (آرشیو — اجرا نکنید)

منتقل شده به **`sql/archive/`** — محتوا داخل `post-migration` / `consolidated-reapply` است. جزئیات: [sql/archive/README.md](../sql/archive/README.md).

| فایل (آرشیو) | نقش |
| --- | --- |
| `supabase-rls-security-phase2-verify-fix.sql` | HMAC `convert_to` |
| `supabase-fix-telegram-list-init-data.sql` | header fallback + RPC |
| `supabase-fix-user-anime-list-upsert.sql` | upsert UPDATE + trigger |
| `supabase-fix-telegram-init-debug.sql` | پیام خطا |
| `supabase-fix-telegram-init-decode.sql` | decode + `signature` |
| `supabase-fix-vault-token-audit.sql` | دیباگ Vault |
| `supabase-rls-security-admin-users-fix.sql` | admin overview RPC |
| `supabase-rls-security-phase2-edge.sql` | register internal |
| `supabase-admin-portal-auth-fix-crypt.sql` | pgcrypto search_path (در #24) |

## ۵. به‌روزرسانی یک‌جا (دیتابیس موجود)

| فایل | توضیح |
| --- | --- |
| **`supabase-consolidated-reapply.sql`** | patchهای #22–#26 + ستون‌های MAL/IMDb/episode_pack + fix overflow امتیاز — **بدون حذف داده** |

شامل: `pgcrypto` · schema patches · `admin-panel-features` · `post-migration`

## ۶. اختیاری / جدا

| فایل | توضیح |
| --- | --- |
| `supabase-add-episode-pack.sql` | فقط اگر consolidated را نزده‌اید (در consolidated هم هست) |
| `supabase-fix-score-columns.sql` | فقط اگر consolidated را نزده‌اید (در consolidated هم هست) |
| `supabase-cron-sync-external-scores.sql` | **راهنما** — SQL اجرایی نیست |
| `supabase-unify-portal-users.sql` | **یک‌بار** و فقط اگر `admin_portal_*` قدیمی دارید — DROP TABLE |
| `supabase-final-data.sql` | seed (خارج از repo ممکن است) |

## اولین ادمین

```sql
UPDATE telegram_users
SET app_role = 'admin'
WHERE telegram_user_id = YOUR_TELEGRAM_ID;
```

## Related

- [DEPLOY.md](./DEPLOY.md)
- [schema.md](./schema.md)
- [rls.md](./rls.md)
