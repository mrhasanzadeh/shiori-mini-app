-- Admin panel features — بعد از supabase-rls-security-phase1.sql
-- 1) تنظیم ایمیل/رمز ورود وب از پنل کاربران
-- 2) ثبت آخرین ویرایش‌گر انیمه (با x-portal-token)

-- ─── 1) view کاربران: email + وضعیت رمز ───

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
  (tu.password_hash IS NOT NULL) AS has_portal_password,
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

-- ─── 2) update_telegram_user_admin: ایمیل + رمز + portal_login ───

DROP FUNCTION IF EXISTS public.update_telegram_user_admin(uuid, bigint, text, text, text);

CREATE OR REPLACE FUNCTION public.update_telegram_user_admin(
  p_portal_token uuid,
  p_telegram_user_id bigint,
  p_app_role text,
  p_admin_notes text DEFAULT NULL,
  p_username text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_password text DEFAULT NULL,
  p_portal_login_enabled boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  current_role text;
  admin_count int;
  v_email text;
BEGIN
  IF NOT public.verify_portal_session_token(p_portal_token, true) THEN
    RAISE EXCEPTION 'invalid portal session';
  END IF;

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

  IF p_email IS NOT NULL THEN
    v_email := NULLIF(lower(trim(p_email)), '');

    IF v_email IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM telegram_users
         WHERE lower(trim(email)) = v_email
           AND telegram_user_id <> p_telegram_user_id
       ) THEN
      RAISE EXCEPTION 'email already in use';
    END IF;
  END IF;

  UPDATE telegram_users
  SET
    app_role = p_app_role,
    admin_notes = NULLIF(trim(p_admin_notes), ''),
    username = CASE
      WHEN p_username IS NOT NULL THEN NULLIF(regexp_replace(trim(p_username), '^@+', ''), '')
      ELSE telegram_users.username
    END,
    email = CASE
      WHEN p_email IS NOT NULL THEN NULLIF(lower(trim(p_email)), '')
      ELSE telegram_users.email
    END,
    password_hash = CASE
      WHEN p_password IS NOT NULL AND trim(p_password) <> '' THEN
        crypt(trim(p_password), gen_salt('bf'))
      ELSE telegram_users.password_hash
    END,
    portal_login_enabled = COALESCE(p_portal_login_enabled, telegram_users.portal_login_enabled)
  WHERE telegram_user_id = p_telegram_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_telegram_user_admin(
  uuid, bigint, text, text, text, text, text, boolean
) TO anon, authenticated;

-- ─── 3) audit ویرایش انیمه ───

ALTER TABLE public.anime
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_edited_by bigint REFERENCES public.telegram_users (telegram_user_id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.portal_telegram_user_id_from_request()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.telegram_user_id
  FROM user_portal_sessions s
  JOIN telegram_users u ON u.telegram_user_id = s.telegram_user_id
  WHERE s.token = public.portal_token_from_request()
    AND s.expires_at > now()
    AND u.portal_login_enabled = true
    AND u.app_role IN ('admin', 'moderator')
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.touch_anime_edit_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_editor bigint;
BEGIN
  NEW.updated_at := now();
  v_editor := public.portal_telegram_user_id_from_request();
  IF v_editor IS NOT NULL THEN
    NEW.last_edited_by := v_editor;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_anime_edit_audit ON public.anime;

CREATE TRIGGER trg_anime_edit_audit
  BEFORE INSERT OR UPDATE ON public.anime
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_anime_edit_audit();
