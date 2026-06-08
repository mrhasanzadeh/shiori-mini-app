-- کاربران تلگرام که مینی‌اپ را باز کرده‌اند
-- این فایل را در Supabase SQL Editor اجرا کنید.

CREATE TABLE IF NOT EXISTS telegram_users (
  telegram_user_id BIGINT PRIMARY KEY,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT,
  username TEXT,
  language_code TEXT,
  photo_url TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  app_role TEXT NOT NULL DEFAULT 'user'
    CHECK (app_role IN ('user', 'moderator', 'admin')),
  admin_notes TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  visit_count INT NOT NULL DEFAULT 1 CHECK (visit_count >= 1)
);

CREATE INDEX IF NOT EXISTS idx_telegram_users_last_seen_at
  ON telegram_users (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_telegram_users_username
  ON telegram_users (lower(username))
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_telegram_users_app_role
  ON telegram_users (app_role);

COMMENT ON COLUMN telegram_users.app_role IS 'App access role: user | moderator | admin';
COMMENT ON COLUMN telegram_users.admin_notes IS 'Internal admin notes (not shown to user)';

COMMENT ON TABLE telegram_users IS 'Telegram Mini App users (registered on each app open)';

-- ثبت / به‌روزرسانی کاربر هنگام ورود به مینی‌اپ
CREATE OR REPLACE FUNCTION public.register_telegram_user_visit(
  p_telegram_user_id BIGINT,
  p_first_name TEXT DEFAULT '',
  p_last_name TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL,
  p_language_code TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL,
  p_is_premium BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_telegram_user_id IS NULL OR p_telegram_user_id <= 0 THEN
    RAISE EXCEPTION 'invalid telegram_user_id';
  END IF;

  INSERT INTO telegram_users (
    telegram_user_id,
    first_name,
    last_name,
    username,
    language_code,
    photo_url,
    is_premium,
    first_seen_at,
    last_seen_at,
    visit_count
  )
  VALUES (
    p_telegram_user_id,
    COALESCE(NULLIF(trim(p_first_name), ''), 'کاربر'),
    NULLIF(trim(p_last_name), ''),
    NULLIF(regexp_replace(trim(p_username), '^@+', ''), ''),
    NULLIF(trim(p_language_code), ''),
    NULLIF(trim(p_photo_url), ''),
    COALESCE(p_is_premium, false),
    now(),
    now(),
    1
  )
  ON CONFLICT (telegram_user_id) DO UPDATE SET
    first_name = COALESCE(NULLIF(trim(EXCLUDED.first_name), ''), telegram_users.first_name),
    last_name = COALESCE(NULLIF(trim(EXCLUDED.last_name), ''), telegram_users.last_name),
    username = COALESCE(
      NULLIF(regexp_replace(trim(EXCLUDED.username), '^@+', ''), ''),
      telegram_users.username
    ),
    language_code = COALESCE(NULLIF(trim(EXCLUDED.language_code), ''), telegram_users.language_code),
    photo_url = COALESCE(NULLIF(trim(EXCLUDED.photo_url), ''), telegram_users.photo_url),
    is_premium = EXCLUDED.is_premium,
    last_seen_at = now(),
    visit_count = telegram_users.visit_count + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_telegram_user_visit(
  BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_telegram_user_admin(
  p_telegram_user_id BIGINT,
  p_app_role TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_telegram_user_id IS NULL OR p_telegram_user_id <= 0 THEN
    RAISE EXCEPTION 'invalid telegram_user_id';
  END IF;

  IF p_app_role IS NULL OR p_app_role NOT IN ('user', 'moderator', 'admin') THEN
    RAISE EXCEPTION 'invalid app_role';
  END IF;

  UPDATE telegram_users
  SET
    app_role = p_app_role,
    admin_notes = NULLIF(trim(p_admin_notes), '')
  WHERE telegram_user_id = p_telegram_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_telegram_user_admin(BIGINT, TEXT, TEXT)
  TO anon, authenticated;

-- نمای ادمین با تعداد علاقه‌مندی
DROP VIEW IF EXISTS public.telegram_users_admin;

CREATE VIEW public.telegram_users_admin AS
SELECT
  tu.telegram_user_id,
  tu.first_name,
  tu.last_name,
  tu.username,
  tu.language_code,
  tu.photo_url,
  tu.is_premium,
  tu.app_role,
  tu.admin_notes,
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

-- backfill از user_anime_list (کاربرانی که قبلاً favorite داشتند)
INSERT INTO telegram_users (telegram_user_id, first_name)
SELECT DISTINCT telegram_user_id, 'کاربر'
FROM user_anime_list
WHERE telegram_user_id IS NOT NULL
ON CONFLICT (telegram_user_id) DO NOTHING;

-- ─── RLS ───
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read telegram_users" ON telegram_users;
CREATE POLICY "Public read telegram_users"
  ON telegram_users FOR SELECT
  USING (true);
