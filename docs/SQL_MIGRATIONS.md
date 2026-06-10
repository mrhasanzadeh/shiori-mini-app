# SQL migrations — ترتیب اجرا

## ساختار پوشه‌ها

| مسیر | کاربرد |
| --- | --- |
| **`supabase-consolidated-reapply.sql`** (root) | تنها فایل SQL پایه — به‌روزرسانی دیتابیس |
| **`sql/supabase-notifications.sql`** | اعلان‌ها (بعد از consolidated) |
| **`sql/bootstrap/`** | نصب اولیه #1–#21 (دیتابیس تازه) |
| **`sql/archive/`** | patchهای قدیمی، تکراری، یک‌بار — **اجرا نکنید** |
| **`sql/optional/`** | راهنمای Cron (بدون SQL اجرایی) |

## کدام مسیر را بروید؟

| وضعیت | کار |
| --- | --- |
| **دیتابیس تازه** | `sql/bootstrap/` #1–#21 → سپس **`supabase-consolidated-reapply.sql`** |
| **دیتابیس موجود** | فقط **`supabase-consolidated-reapply.sql`** |
| **patchهای قدیمی** | `sql/archive/` — اجرا نکنید |

> **`supabase-consolidated-reapply.sql`** idempotent است — **بدون** `TRUNCATE` / `DROP TABLE` روی جداول داده.

---

## ۱. Bootstrap — هسته کاتالوگ و کاربر (`sql/bootstrap/`)

| #   | فایل                                             | توضیح                              |
| --- | ------------------------------------------------ | ---------------------------------- |
| 1   | `supabase-user-anime-list.sql`                   | لیست شخصی + `shiori_score` trigger |
| 2   | `supabase-anime-favorite-counts.sql`             | RPC تعداد favorite                 |
| 3   | `supabase-telegram-users.sql`                    | جدول کاربران + register RPC        |
| 4   | `supabase-telegram-users-roles.sql`              | نقش‌ها + view ادمین                |
| 5   | `supabase-telegram-users-fix-username.sql`       | حفظ یوزرنیم در revisit             |
| 6   | `supabase-telegram-users-protect-last-admin.sql` | جلوگیری از demote آخرین ادمین      |
| 7   | `supabase-telegram-users-admin-username.sql`     | ویرایش دستی یوزرنیم از پنل         |

## ۲. امتیاز خارجی (`sql/bootstrap/`)

| #   | فایل                                     | توضیح                              |
| --- | ---------------------------------------- | ---------------------------------- |
| 8   | `supabase-add-external-ids-scores.sql`   | ستون‌های MAL/IMDB                  |
| 9   | `supabase-cache-external-scores.sql`     | cache اولیه                        |
| 10  | `supabase-sync-external-scores-cron.sql` | RPC `update_anime_external_scores` |

## ۳. امنیت و production (`sql/bootstrap/`)

| #   | فایل                          | توضیح                          |
| --- | ----------------------------- | ------------------------------ |
| 11  | `supabase-rls-production.sql` | RLS خواندن عمومی + user tables |

> بخش write کاتالوگ در همان فایل **comment** شده — فقط اگر پنل با anon می‌نویسد uncomment کنید.

## ۴. Cron · Portal · Security

| #   | فایل / action                                         | مسیر / توضیح                                                   |
| --- | ----------------------------------------------------- | -------------------------------------------------------------- |
| 12  | `supabase functions deploy sync-external-scores`      | Edge Function                                                  |
| 13  | Secrets: `CRON_SECRET`, `OMDB_API_KEY`                | Dashboard                                                      |
| 14  | `supabase-cron-sync-external-scores.sql`              | **`sql/optional/`** — راهنمای Cron                             |
| 15  | `sql/archive/supabase-cron-job-sync-external-scores.sql` | pg_cron (اختیاری — قالب؛ جایگزین YOUR_*) |
| 16  | `supabase-admin-portal-auth.sql`                      | **`sql/bootstrap/`** — ورود وب                                 |
| 17  | `sql/archive/supabase-unify-portal-users.sql`         | فقط DB قدیمی با `admin_portal_*`                               |
| 18  | `supabase-rls-security-phase1.sql`                    | **`sql/bootstrap/`** — portal token RLS                        |
| 19  | Vault: `telegram_bot_token`                           | Dashboard — قبل از فاز ۲                                       |
| 20  | `supabase-rls-security-phase2.sql`                    | **`sql/bootstrap/`** — initData برای `user_anime_list`         |
| 21  | `supabase-rls-security-phase2-list-rpc.sql`           | **`sql/bootstrap/`** — RPC لیست + register                     |
| 22  | **`supabase-consolidated-reapply.sql`**               | **root** — patch نهایی + #24–#26 (به‌جای فایل‌های جدا)         |
| 23  | Edge: `telegram-user-list` + `TELEGRAM_BOT_TOKEN`     | [telegram-user-list-edge.md](./telegram-user-list-edge.md)     |

> **دیتابیس موجود:** فقط **`supabase-consolidated-reapply.sql`**.  
> فایل‌های #22–#26 جدا در **`sql/archive/`** هستند (تکراری — اجرا نکنید).

---

## آرشیو (`sql/archive/`)

جزئیات: [sql/archive/README.md](../sql/archive/README.md)

---

## ۷. اعلان‌ها (بعد از consolidated)

| فایل / action | توضیح |
| --- | --- |
| **`sql/supabase-notifications.sql`** | inbox + کمپین + RPC |
| `notify-episode-release` Edge | پیام Telegram + فراخوانی RPC |
| [notifications.md](./notifications.md) | راهنمای ادمین و کاربر |

---

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
