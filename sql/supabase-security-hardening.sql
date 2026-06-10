-- Security hardening — بعد از consolidated + notifications
-- idempotent — یک‌بار در SQL Editor اجرا کنید.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1) امتیاز خارجی — فقط service_role + staff با portal token
-- ═══════════════════════════════════════════════════════════════════════════

REVOKE ALL ON FUNCTION public.update_anime_external_scores(UUID, NUMERIC, NUMERIC, NUMERIC)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_anime_external_scores(UUID, NUMERIC, NUMERIC, NUMERIC)
  TO service_role;

REVOKE ALL ON FUNCTION public.cache_anime_external_scores(UUID, NUMERIC, NUMERIC, NUMERIC)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cache_anime_external_scores(UUID, NUMERIC, NUMERIC, NUMERIC)
  TO service_role;

CREATE OR REPLACE FUNCTION public.admin_update_anime_external_scores(
  p_portal_token uuid,
  p_anime_id uuid,
  p_average_score numeric DEFAULT NULL,
  p_mal_score numeric DEFAULT NULL,
  p_imdb_score numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.verify_portal_session_token(p_portal_token, false) THEN
    RAISE EXCEPTION 'invalid portal session';
  END IF;

  PERFORM public.update_anime_external_scores(
    p_anime_id,
    p_average_score,
    p_mal_score,
    p_imdb_score
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_anime_external_scores(uuid, uuid, numeric, numeric, numeric)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_anime_external_scores(uuid, uuid, numeric, numeric, numeric)
  TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2) نقش کاربر — فقط initData خود کاربر (نه enumeration)
-- ═══════════════════════════════════════════════════════════════════════════

REVOKE ALL ON FUNCTION public.get_telegram_user_role(bigint) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_telegram_app_role(p_init_data text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id bigint;
  v_role text;
BEGIN
  v_user_id := public.verify_telegram_init_data(p_init_data);
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT app_role INTO v_role
  FROM public.telegram_users
  WHERE telegram_user_id = v_user_id;

  RETURN v_role;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_telegram_app_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_telegram_app_role(text) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3) debug RPC — فقط service_role
-- ═══════════════════════════════════════════════════════════════════════════

REVOKE ALL ON FUNCTION public.debug_telegram_init_status(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.debug_telegram_init_status(text) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4) rate limit ورود portal (۱۵ تلاش / ۱۵ دقیقه per email)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.portal_login_attempts (
  id bigserial PRIMARY KEY,
  email_key text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_login_attempts_email_time
  ON public.portal_login_attempts (email_key, attempted_at DESC);

ALTER TABLE public.portal_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.admin_portal_login(p_email text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user telegram_users%ROWTYPE;
  v_token uuid;
  v_expires timestamptz;
  v_email_key text;
  v_fail_count int;
  v_display_name text;
BEGIN
  IF coalesce(trim(p_email), '') = '' OR coalesce(p_password, '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  END IF;

  v_email_key := lower(trim(p_email));

  SELECT COUNT(*)::int INTO v_fail_count
  FROM public.portal_login_attempts
  WHERE email_key = v_email_key
    AND attempted_at > now() - interval '15 minutes';

  IF v_fail_count >= 15 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  END IF;

  SELECT * INTO v_user
  FROM public.telegram_users
  WHERE lower(trim(email)) = v_email_key
    AND portal_login_enabled = true
    AND password_hash IS NOT NULL
    AND app_role IN ('admin', 'moderator');

  IF NOT FOUND THEN
    INSERT INTO public.portal_login_attempts (email_key) VALUES (v_email_key);
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  END IF;

  IF v_user.password_hash <> crypt(p_password, v_user.password_hash) THEN
    INSERT INTO public.portal_login_attempts (email_key) VALUES (v_email_key);
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  END IF;

  DELETE FROM public.portal_login_attempts WHERE email_key = v_email_key;

  DELETE FROM public.user_portal_sessions
  WHERE telegram_user_id = v_user.telegram_user_id
    AND expires_at < now();

  v_token := gen_random_uuid();
  v_expires := now() + interval '7 days';

  INSERT INTO public.user_portal_sessions (token, telegram_user_id, expires_at)
  VALUES (v_token, v_user.telegram_user_id, v_expires);

  v_display_name := nullif(
    trim(concat_ws(' ', nullif(trim(v_user.first_name), ''), nullif(trim(v_user.last_name), ''))),
    ''
  );

  RETURN jsonb_build_object(
    'ok', true,
    'token', v_token,
    'role', v_user.app_role,
    'display_name', coalesce(v_display_name, nullif(trim(v_user.email), ''), 'ادمین'),
    'photo_url', nullif(trim(v_user.photo_url), ''),
    'expires_at', v_expires
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_portal_login(text, text) TO anon, authenticated;

-- پاک‌سازی دوره‌ای (اختیاری — pg_cron)
-- DELETE FROM public.portal_login_attempts WHERE attempted_at < now() - interval '7 days';
