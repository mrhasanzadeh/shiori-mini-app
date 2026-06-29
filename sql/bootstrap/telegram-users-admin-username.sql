-- ویرایش دستی یوزرنیم از پنل ادمین
-- این فایل را در Postgres اجرا کنید.

DROP FUNCTION IF EXISTS public.update_telegram_user_admin(BIGINT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.update_telegram_user_admin(
  p_telegram_user_id BIGINT,
  p_app_role TEXT,
  p_admin_notes TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_role TEXT;
  admin_count INT;
BEGIN
  IF p_telegram_user_id IS NULL OR p_telegram_user_id <= 0 THEN
    RAISE EXCEPTION 'invalid telegram_user_id';
  END IF;

  IF p_app_role IS NULL OR p_app_role NOT IN ('user', 'moderator', 'admin') THEN
    RAISE EXCEPTION 'invalid app_role';
  END IF;

  SELECT app_role INTO current_role
  FROM telegram_users
  WHERE telegram_user_id = p_telegram_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  IF current_role = 'admin' AND p_app_role <> 'admin' THEN
    SELECT COUNT(*)::int INTO admin_count
    FROM telegram_users
    WHERE app_role = 'admin';

    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'cannot demote last admin';
    END IF;
  END IF;

  UPDATE telegram_users
  SET
    app_role = p_app_role,
    admin_notes = NULLIF(trim(p_admin_notes), ''),
    username = CASE
      WHEN p_username IS NOT NULL THEN NULLIF(regexp_replace(trim(p_username), '^@+', ''), '')
      ELSE telegram_users.username
    END
  WHERE telegram_user_id = p_telegram_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_telegram_user_admin(BIGINT, TEXT, TEXT, TEXT)
  TO anon, authenticated;
