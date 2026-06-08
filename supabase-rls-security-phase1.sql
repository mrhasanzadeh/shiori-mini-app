-- امنیت فاز ۱ — بعد از supabase-rls-production.sql و admin portal auth
-- 1) password_hash از anon مخفی می‌شود
-- 2) read/write ادمین فقط با header x-portal-token (session معتبر)
-- 3) write کاتالوگ دیگر با anon آزاد نیست — فقط staff با portal token
--
-- ⚠️ بعد از اجرا، پنل ادمین باید با login وب استفاده شود (فرانت header را می‌فرستد).

-- ─── Helpers ───

CREATE OR REPLACE FUNCTION public.portal_token_from_request()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_raw text;
BEGIN
  BEGIN
    v_raw := current_setting('request.headers', true)::json ->> 'x-portal-token';
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  IF v_raw IS NULL OR trim(v_raw) = '' THEN
    RETURN NULL;
  END IF;

  RETURN trim(v_raw)::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_portal_session_token(
  p_token uuid,
  p_require_full_admin boolean DEFAULT false
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_portal_sessions s
    JOIN telegram_users u ON u.telegram_user_id = s.telegram_user_id
    WHERE s.token = p_token
      AND s.expires_at > now()
      AND u.portal_login_enabled = true
      AND (
        CASE
          WHEN p_require_full_admin THEN u.app_role = 'admin'
          ELSE u.app_role IN ('admin', 'moderator')
        END
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.portal_token_is_staff(p_require_full_admin boolean DEFAULT false)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.verify_portal_session_token(public.portal_token_from_request(), p_require_full_admin);
$$;

CREATE OR REPLACE FUNCTION public.get_telegram_user_role(p_telegram_user_id bigint)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT app_role
  FROM telegram_users
  WHERE telegram_user_id = p_telegram_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_telegram_user_role(bigint) TO anon, authenticated;

-- ─── telegram_users: hide password_hash + staff-only read ───

DROP POLICY IF EXISTS "Public read telegram_users" ON telegram_users;

REVOKE ALL ON TABLE public.telegram_users FROM anon, authenticated;

GRANT SELECT (
  telegram_user_id,
  first_name,
  last_name,
  username,
  language_code,
  photo_url,
  is_premium,
  app_role,
  admin_notes,
  email,
  portal_login_enabled,
  first_seen_at,
  last_seen_at,
  visit_count
) ON TABLE public.telegram_users TO anon, authenticated;

CREATE POLICY "Portal staff read telegram_users"
  ON public.telegram_users
  FOR SELECT
  TO anon, authenticated
  USING (public.portal_token_is_staff(false));

-- ─── user_portal_sessions: فقط از RPC ───

REVOKE ALL ON TABLE public.user_portal_sessions FROM anon, authenticated;

-- ─── update_telegram_user_admin: نیاز به token ادمین کامل ───

DROP FUNCTION IF EXISTS public.update_telegram_user_admin(bigint, text, text, text);

CREATE OR REPLACE FUNCTION public.update_telegram_user_admin(
  p_portal_token uuid,
  p_telegram_user_id bigint,
  p_app_role text,
  p_admin_notes text DEFAULT NULL,
  p_username text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_role text;
  admin_count int;
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

GRANT EXECUTE ON FUNCTION public.update_telegram_user_admin(uuid, bigint, text, text, text)
  TO anon, authenticated;

-- ─── Catalog writes: portal staff (admin + moderator) ───

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'anime', 'genres', 'anime_genres', 'studios', 'anime_studios',
    'episodes', 'subtitles', 'subtitle_packs', 'translators', 'translator_anime',
    'files', 'file_packs', 'file_pack_items'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Anon admin write %I" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Portal staff write %I" ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY "Portal staff write %I" ON %I FOR ALL TO anon, authenticated USING (public.portal_token_is_staff(false)) WITH CHECK (public.portal_token_is_staff(false))',
      t, t
    );
  END LOOP;
END $$;
