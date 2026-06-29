# SQL migrations — ترتیب اجرا

## ساختار پوشه‌ها

| مسیر | کاربرد |
| --- | --- |
| **`consolidated-reapply.sql`** (root) | تنها فایل SQL پایه — به‌روزرسانی دیتابیس |
| **`sql/notifications.sql`** | اعلان‌ها |
| **`sql/security-hardening.sql`** | hardening امنیتی |
| **`sql/bootstrap/`** | نصب اولیه #1–#21 (دیتابیس تازه) |
| **`sql/archive/`** | patchهای قدیمی، تکراری، یک‌بار — **اجرا نکنید** |
| **`sql/optional/`** | راهنمای Cron (بدون SQL اجرایی) |

## کدام مسیر را بروید؟

| وضعیت | کار |
| --- | --- |
| **دیتابیس تازه** | `sql/bootstrap/` #1–#21 → سپس **`consolidated-reapply.sql`** |
| **دیتابیس موجود** | فقط **`consolidated-reapply.sql`** |
| **patchهای قدیمی** | `sql/archive/` — اجرا نکنید |

> **`consolidated-reapply.sql`** idempotent است — **بدون** `TRUNCATE` / `DROP TABLE` روی جداول داده.

---

## ۱. Bootstrap — هسته کاتالوگ و کاربر (`sql/bootstrap/`)

| #   | فایل                                             | توضیح                              |
| --- | ------------------------------------------------ | ---------------------------------- |
| 1   | `user-anime-list.sql`                   | لیست شخصی + `shiori_score` trigger |
| 2   | `anime-favorite-counts.sql`             | RPC تعداد favorite                 |
| 3   | `telegram-users.sql`                    | جدول کاربران + register RPC        |
| 4   | `telegram-users-roles.sql`              | نقش‌ها + view ادمین                |
| 5   | `telegram-users-fix-username.sql`       | حفظ یوزرنیم در revisit             |
| 6   | `telegram-users-protect-last-admin.sql` | جلوگیری از demote آخرین ادمین      |
| 7   | `telegram-users-admin-username.sql`     | ویرایش دستی یوزرنیم از پنل         |

## ۲. امتیاز خارجی (`sql/bootstrap/`)

| #   | فایل                                     | توضیح                              |
| --- | ---------------------------------------- | ---------------------------------- |
| 8   | `add-external-ids-scores.sql`   | ستون‌های MAL/IMDB                  |
| 9   | `cache-external-scores.sql`     | cache اولیه                        |
| 10  | `sync-external-scores-cron.sql` | RPC `update_anime_external_scores` |

## ۳. امنیت و production (`sql/bootstrap/`)

| #   | فایل                          | توضیح                          |
| --- | ----------------------------- | ------------------------------ |
| 11  | `rls-production.sql` | RLS خواندن عمومی + user tables |

> بخش write کاتالوگ در همان فایل **comment** شده — فقط اگر پنل با anon می‌نویسد uncomment کنید.

## ۴. Cron · Portal · Security

| #   | فایل / action                                         | مسیر / توضیح                                                   |
| --- | ----------------------------------------------------- | -------------------------------------------------------------- |
| 12  | Shiori API cron `sync-external-scores`                | `api.shiori.cloud` — `CRON_SECRET`, `OMDB_API_KEY`             |
| 14  | `cron-sync-external-scores.sql`              | **`sql/optional/`** — راهنمای Cron                             |
| 16  | `admin-portal-auth.sql`                      | **`sql/bootstrap/`** — ورود وب                                 |
| 17  | `sql/archive/unify-portal-users.sql`         | فقط DB قدیمی با `admin_portal_*`                               |
| 18  | `rls-security-phase1.sql`                    | **`sql/bootstrap/`** — portal token RLS                        |
| 19  | Vault: `telegram_bot_token`                           | Dashboard — قبل از فاز ۲                                       |
| 20  | `rls-security-phase2.sql`                    | **`sql/bootstrap/`** — initData برای `user_anime_list`         |
| 21  | `rls-security-phase2-list-rpc.sql`           | **`sql/bootstrap/`** — RPC لیست + register                     |
| 22  | **`consolidated-reapply.sql`**               | **root** — patch نهایی + #24–#26 (به‌جای فایل‌های جدا)         |
| 23  | `TELEGRAM_BOT_TOKEN` در API                           | ثبت کاربر Telegram از مینی‌اپ                                  |

> **دیتابیس موجود:** فقط **`consolidated-reapply.sql`**.  
> فایل‌های #22–#26 جدا در **`sql/archive/`** هستند (تکراری — اجرا نکنید).

---

## آرشیو (`sql/archive/`)

جزئیات: [sql/archive/README.md](../sql/archive/README.md)

---

## ۷. اعلان‌ها (بعد از consolidated)

| فایل / action | توضیح |
| --- | --- |
| **`sql/notifications.sql`** | inbox + کمپین + RPC |
| `notify-episode-release` Edge | پیام Telegram + فراخوانی RPC |
| [notifications.md](./notifications.md) | راهنمای ادمین و کاربر |

## ۸. Hardening امنیتی (قبل از لانچ عمومی)

| فایل / action | توضیح |
| --- | --- |
| **`sql/security-hardening.sql`** | بستن RPC امتیاز، debug، role enumeration، rate limit login |
| redeploy `sync-external-scores` + `telegram-user-list` | CRON_SECRET اجباری؛ debug Edge غیرفعال |
| [security-hardening.md](./security-hardening.md) | چک‌لیست کامل |

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
