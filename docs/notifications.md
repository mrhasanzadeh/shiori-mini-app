# Notifications — اعلان‌ها

## دو کانال

| کانال | وقتی دیده می‌شود |
| --- | --- |
| **Inbox** (`/notifications`) | وقتی کاربر مینی‌اپ را باز کند |
| **پیام Telegram** | push سیستم — حتی وقتی مینی‌اپ بسته است |

کاربر در **پروفایل → تنظیمات اعلان** هر کانال را جدا خاموش/روشن می‌کند.

## نصب (یک‌بار)

1. SQL: [`sql/supabase-notifications.sql`](../sql/supabase-notifications.sql)
2. Edge: `npx supabase functions deploy notify-episode-release --project-ref YOUR_REF`
3. Secret `TELEGRAM_BOT_TOKEN` (همان bot مینی‌اپ)

## ارسال از پنل ادمین

1. **ویرایش انیمه** → تب رسانه → قسمت‌ها
2. دکمه **«اعلان»** کنار قسمت
3. تأیید → inbox برای کاربرانی که انیمه در **لیست شخصی** دارند + Telegram (در صورت فعال بودن)

**تاریخچه:** `/admin/notifications`

> broadcast عمومی یا زیرنویس — فاز بعد؛ فعلاً فقط **انتشار قسمت**.

## Related

- [telegram-user-list-edge.md](./telegram-user-list-edge.md)
- [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md)
