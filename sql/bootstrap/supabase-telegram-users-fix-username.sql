-- رفع پاک شدن یوزرنیم در هر بازدید + حفظ فیلدهای خالی
-- این فایل را در Supabase SQL Editor اجرا کنید.

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
