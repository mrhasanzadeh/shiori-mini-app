-- مهاجرت از admin_portal_accounts / admin_portal_sessions به telegram_users
-- پیش‌نیاز: sql/bootstrap/admin-portal-auth.sql (نسخه یکپارچه) اجرا شده باشد.
-- اگر admin_portal_* هرگز نساخته‌اید، این فایل لازم نیست.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 1) انتقال حساب‌های portal به telegram_users ───
DO $$
DECLARE
  r record;
  v_tid bigint := -1000000;
  v_updated int;
BEGIN
  IF to_regclass('public.admin_portal_accounts') IS NULL THEN
    RAISE NOTICE 'admin_portal_accounts not found — skip migration';
    RETURN;
  END IF;

  FOR r IN SELECT * FROM admin_portal_accounts ORDER BY created_at
  LOOP
    UPDATE telegram_users tu
    SET
      email = r.email,
      password_hash = r.password_hash,
      app_role = r.app_role,
      first_name = coalesce(nullif(trim(r.display_name), ''), tu.first_name),
      portal_login_enabled = coalesce(r.is_active, true)
    WHERE lower(trim(tu.email)) = lower(trim(r.email));

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_updated = 0 THEN
      LOOP
        EXIT WHEN NOT EXISTS (SELECT 1 FROM telegram_users WHERE telegram_user_id = v_tid);
        v_tid := v_tid - 1;
      END LOOP;

      INSERT INTO telegram_users (
        telegram_user_id,
        first_name,
        email,
        password_hash,
        app_role,
        portal_login_enabled
      )
      VALUES (
        v_tid,
        coalesce(nullif(trim(r.display_name), ''), split_part(r.email, '@', 1)),
        r.email,
        r.password_hash,
        r.app_role,
        coalesce(r.is_active, true)
      );

      v_tid := v_tid - 1;
    END IF;
  END LOOP;
END $$;

-- ─── 2) انتقال sessionهای فعال ───
DO $$
BEGIN
  IF to_regclass('public.admin_portal_sessions') IS NULL THEN
    RAISE NOTICE 'admin_portal_sessions not found — skip session migration';
    RETURN;
  END IF;

  INSERT INTO user_portal_sessions (token, telegram_user_id, expires_at, created_at)
  SELECT s.token, tu.telegram_user_id, s.expires_at, s.created_at
  FROM admin_portal_sessions s
  JOIN admin_portal_accounts a ON a.id = s.account_id
  JOIN telegram_users tu ON lower(trim(tu.email)) = lower(trim(a.email))
  WHERE s.expires_at > now()
  ON CONFLICT (token) DO NOTHING;
END $$;

-- ─── 3) view ادمین — اضافه کردن email ───
DROP VIEW IF EXISTS public.telegram_users_admin;

CREATE VIEW public.telegram_users_admin AS
SELECT
  tu.telegram_user_id,
  tu.first_name,
  tu.last_name,
  tu.username,
  tu.email,
  tu.language_code,
  tu.photo_url,
  tu.is_premium,
  tu.app_role,
  tu.admin_notes,
  tu.portal_login_enabled,
  tu.first_seen_at,
  tu.last_seen_at,
  tu.visit_count,
  COALESCE(fav.favorites_count, 0)::int AS favorites_count
FROM telegram_users tu
LEFT JOIN (
  SELECT telegram_user_id, COUNT(*)::int AS favorites_count
  FROM user_anime_list
  GROUP BY telegram_user_id
) fav ON fav.telegram_user_id = tu.telegram_user_id;

GRANT SELECT ON public.telegram_users_admin TO anon, authenticated;

-- ─── 4) حذف جداول قدیمی ───
DROP TABLE IF EXISTS admin_portal_sessions;
DROP TABLE IF EXISTS admin_portal_accounts;
