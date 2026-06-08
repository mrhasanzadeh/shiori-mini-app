# SQL migrations — ترتیب اجرا

همه فایل‌ها در **Supabase SQL Editor** اجرا می‌شوند (root پروژه).

## ۱. هسته کاتالوگ و کاربر

| # | فایل | توضیح |
|---|------|--------|
| 1 | `supabase-user-anime-list.sql` | لیست شخصی + `shiori_score` trigger |
| 2 | `supabase-anime-favorite-counts.sql` | RPC تعداد favorite |
| 3 | `supabase-telegram-users.sql` | جدول کاربران + register RPC |
| 4 | `supabase-telegram-users-roles.sql` | نقش‌ها + view ادمین |
| 5 | `supabase-telegram-users-fix-username.sql` | حفظ یوزرنیم در revisit |
| 6 | `supabase-telegram-users-protect-last-admin.sql` | جلوگیری از demote آخرین ادمین |
| 7 | `supabase-telegram-users-admin-username.sql` | ویرایش دستی یوزرنیم از پنل |

## ۲. امتیاز خارجی

| # | فایل | توضیح |
|---|------|--------|
| 8 | `supabase-add-external-ids-scores.sql` | ستون‌های MAL/IMDB (اگر ندارید) |
| 9 | `supabase-cache-external-scores.sql` | cache اولیه |
| 10 | `supabase-sync-external-scores-cron.sql` | RPC `update_anime_external_scores` |

## ۳. امنیت و production

| # | فایل | توضیح |
|---|------|--------|
| 11 | `supabase-rls-production.sql` | RLS خواندن عمومی + user tables |

> بخش write کاتالوگ در همان فایل **comment** شده — فقط اگر پنل با anon می‌نویسد uncomment کنید.

## ۴. Cron (بعد از deploy Edge Function)

| # | فایل / action | توضیح |
|---|----------------|--------|
| 12 | `supabase functions deploy sync-external-scores` | Edge Function |
| 13 | Secrets: `CRON_SECRET`, `OMDB_API_KEY` | Dashboard |
| 14 | `supabase-cron-sync-external-scores.sql` | راهنمای Cron (Dashboard → Integrations → Cron) |
| 15 | `supabase-cron-job-sync-external-scores.sql` | SQL آماده pg_cron (جایگزین YOUR_ANON_KEY و YOUR_CRON_SECRET) |

## ۵. اختیاری

| فایل | توضیح |
|------|--------|
| `supabase-add-episode-pack.sql` | پک قسمت‌ها |
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
