# Users & roles — نقشه جداول

## خلاصه

| نام | نوع | کاربرد |
|-----|-----|--------|
| **`telegram_users`** | جدول | **همه کاربران** — Telegram + نقش + (اختیاری) ایمیل/رمز ورود وب |
| **`telegram_users_admin`** | view | لیست کاربران در پنل `/admin/users` (+ تعداد favorite) |
| **`user_portal_sessions`** | جدول | tokenهای session ورود وب (موقت، ۷ روز) |

جدول‌های قدیمی **`admin_portal_accounts`** و **`admin_portal_sessions`** حذف شدند — داده‌ها به `telegram_users` منتقل می‌شوند.

---

## `telegram_users`

| ستون | توضیح |
|------|--------|
| `telegram_user_id` | PK — ID واقعی Telegram؛ برای ادمین **فقط وب** عدد **منفی** (مثلاً `-1000001`) |
| `first_name`, `username`, … | از Mini App |
| `app_role` | `user` \| `moderator` \| `admin` — **منبع اصلی سطح دسترسی** |
| `email` | ایمیل ورود وب (اختیاری) |
| `password_hash` | bcrypt — فقط برای ورود `/admin/login` |
| `portal_login_enabled` | `false` = مسدود کردن ورود وب |
| `admin_notes` | یادداشت داخلی ادمین |

### نقش‌ها

| نقش | Mini App | پنل وب |
|-----|----------|--------|
| `user` | کاربر عادی | ❌ |
| `moderator` | (در web-only مسدود) | محتوا (بدون `/admin/users`) |
| `admin` | (در web-only مسدود) | همه بخش‌ها |

---

## ورود وب

1. کاربر ایمیل/رمز را در `/admin/login` می‌زند
2. RPC `admin_portal_login` روی **`telegram_users`** چک می‌کند
3. token در **`user_portal_sessions`** ذخیره می‌شود
4. نقش از **`app_role`** همان ردیف خوانده می‌شود

---

## ست کردن ادمین وب

**کاربر Telegram که قبلاً ثبت شده:**

```sql
UPDATE telegram_users
SET app_role = 'admin',
    email = 'admin@shiori.app',
    password_hash = crypt('YOUR_PASSWORD', gen_salt('bf'))
WHERE telegram_user_id = 90344148;
```

**ادمین فقط وب (بدون Telegram):**

```sql
INSERT INTO telegram_users (telegram_user_id, first_name, email, password_hash, app_role)
VALUES (
  -1000001,
  'مدیر وب',
  'admin@shiori.app',
  crypt('YOUR_PASSWORD', gen_salt('bf')),
  'admin'
);
```

---

## مهاجرت

1. `supabase-admin-portal-auth.sql` (نسخه یکپارچه)
2. اگر قبلاً `admin_portal_*` داشتید → `sql/archive/supabase-unify-portal-users.sql`

---

## Related

- [admin-auth.md](./admin-auth.md)
- [SQL_MIGRATIONS.md](./SQL_MIGRATIONS.md)
