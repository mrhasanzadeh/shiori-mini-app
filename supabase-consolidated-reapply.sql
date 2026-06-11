-- ═══════════════════════════════════════════════════════════════════════════
-- supabase-consolidated-reapply.sql
--
-- دیتابیس موجود: بعد از migrationهای پایه (#1–#21 در docs/SQL_MIGRATIONS.md)
-- این فایل patchهای اخیر را یک‌جا و idempotent اعمال می‌کند.
--
-- ✅ امن برای اجرای مجدد — بدون TRUNCATE / DROP TABLE روی جداول داده
-- ✅ ADD COLUMN IF NOT EXISTS · CREATE OR REPLACE · DROP POLICY IF EXISTS
--
-- ❌ عمداً شامل نیست:
--    sql/archive/supabase-unify-portal-users.sql · sql/archive/supabase-cron-job-*.sql
--    sql/bootstrap/ (#1–#21)
--
-- پیش‌نیاز: Vault → secret با نام telegram_bot_token
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Extensions ───
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


-- ─── Schema patches (ستون‌های اخیر) ───

-- MAL/IMDb (اگر از قبل ندارید)
ALTER TABLE anime ADD COLUMN IF NOT EXISTS mal_id INTEGER;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS imdb_id TEXT;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS mal_score NUMERIC(4, 2);
ALTER TABLE anime ADD COLUMN IF NOT EXISTS imdb_score NUMERIC(4, 2);

-- پک قسمت‌ها (اختیاری ولی idempotent)
ALTER TABLE anime ADD COLUMN IF NOT EXISTS episode_pack_title text;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS episode_pack_link text;

-- رفع overflow امتیاز AniList (۰–۱۰۰)
ALTER TABLE anime
  ALTER COLUMN average_score TYPE NUMERIC(5, 2)
  USING average_score::numeric;

-- مترجم: is_active
ALTER TABLE public.translators
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.translators.is_active IS 'false = مترجم غیرفعال (نمایش در پروفایل با badge)';

-- عنوان Romaji
ALTER TABLE anime ADD COLUMN IF NOT EXISTS title_romaji text;

-- زنجیره فصل‌ها (legacy prev/next — اختیاری)
ALTER TABLE public.anime
  ADD COLUMN IF NOT EXISTS prev_anime_id uuid REFERENCES public.anime (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_anime_id uuid REFERENCES public.anime (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_anime_prev_anime_id ON public.anime (prev_anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_next_anime_id ON public.anime (next_anime_id);

COMMENT ON COLUMN public.anime.prev_anime_id IS 'انیمه قبلی در زنجیره (مثلاً فصل ۱)';
COMMENT ON COLUMN public.anime.next_anime_id IS 'انیمه بعدی در زنجیره (مثلاً فصل ۲)';

-- گروه فصل‌ها (هر فصل = ردیف جدا در anime)
CREATE TABLE IF NOT EXISTS public.anime_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anime_series_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES public.anime_series (id) ON DELETE CASCADE,
  anime_id uuid NOT NULL REFERENCES public.anime (id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 1,
  label_fa text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT anime_series_members_anime_unique UNIQUE (anime_id),
  CONSTRAINT anime_series_members_series_order_unique UNIQUE (series_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_anime_series_members_series_id
  ON public.anime_series_members (series_id);

CREATE INDEX IF NOT EXISTS idx_anime_series_members_anime_id
  ON public.anime_series_members (anime_id);

COMMENT ON TABLE public.anime_series IS 'گروه چندفصلی (مثلاً Solo Leveling)';
COMMENT ON TABLE public.anime_series_members IS 'هر عضو = یک انیمه/فصل در سری';

ALTER TABLE public.anime_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anime_series_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read anime_series" ON public.anime_series;
CREATE POLICY "Public read anime_series"
  ON public.anime_series FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read anime_series_members" ON public.anime_series_members;
CREATE POLICY "Public read anime_series_members"
  ON public.anime_series_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow anon write anime_series" ON public.anime_series;
CREATE POLICY "Allow anon write anime_series"
  ON public.anime_series FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon write anime_series_members" ON public.anime_series_members;
CREATE POLICY "Allow anon write anime_series_members"
  ON public.anime_series_members FOR ALL
  USING (true)
  WITH CHECK (true);


-- ─── Admin panel features (#24) ───

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

-- ─── 4) portal login/verify: photo_url از telegram_users ───

CREATE OR REPLACE FUNCTION admin_portal_login(p_email text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user telegram_users%ROWTYPE;
  v_token uuid;
  v_expires timestamptz;
  v_display_name text;
BEGIN
  IF coalesce(trim(p_email), '') = '' OR coalesce(p_password, '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  END IF;

  SELECT * INTO v_user
  FROM telegram_users
  WHERE lower(trim(email)) = lower(trim(p_email))
    AND portal_login_enabled = true
    AND password_hash IS NOT NULL
    AND app_role IN ('admin', 'moderator');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  END IF;

  IF v_user.password_hash <> crypt(p_password, v_user.password_hash) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  END IF;

  DELETE FROM user_portal_sessions
  WHERE telegram_user_id = v_user.telegram_user_id
    AND expires_at < now();

  v_token := gen_random_uuid();
  v_expires := now() + interval '7 days';

  INSERT INTO user_portal_sessions (token, telegram_user_id, expires_at)
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

CREATE OR REPLACE FUNCTION admin_portal_verify_session(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row record;
  v_display_name text;
BEGIN
  IF p_token IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_session');
  END IF;

  SELECT
    s.token,
    s.expires_at,
    u.app_role,
    u.first_name,
    u.last_name,
    u.email,
    u.photo_url,
    u.portal_login_enabled
  INTO v_row
  FROM user_portal_sessions s
  JOIN telegram_users u ON u.telegram_user_id = s.telegram_user_id
  WHERE s.token = p_token;

  IF NOT FOUND
     OR NOT v_row.portal_login_enabled
     OR v_row.app_role NOT IN ('admin', 'moderator')
     OR v_row.expires_at <= now() THEN
    DELETE FROM user_portal_sessions WHERE token = p_token;
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_session');
  END IF;

  v_display_name := nullif(
    trim(concat_ws(' ', nullif(trim(v_row.first_name), ''), nullif(trim(v_row.last_name), ''))),
    ''
  );

  RETURN jsonb_build_object(
    'ok', true,
    'token', v_row.token,
    'role', v_row.app_role,
    'display_name', coalesce(v_display_name, nullif(trim(v_row.email), ''), 'ادمین'),
    'photo_url', nullif(trim(v_row.photo_url), ''),
    'expires_at', v_row.expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_portal_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_portal_verify_session(uuid) TO anon, authenticated;

-- ─── Post-migration security patch (#22) ───

-- ═══════════════════════════════════════════════════════════════════════════
-- supabase-rls-security-phase2-post-migration.sql
-- یک‌بار بعد از phase2.sql + phase2-list-rpc.sql اجرا کنید.
--
-- جایگزین patchهای جداگانه:
--   admin-users-fix, phase2-edge, verify-fix, list-init-data,
--   user-anime-list-upsert, init-debug, init-decode, vault-token-audit
--
-- پیش‌نیاز Vault: secret با نام telegram_bot_token (BotFather API token)
-- Edge (اختیاری ولی توصیه‌شده): docs/telegram-user-list-edge.md
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1) Admin users RPC + trim vault token ───
-- بعد از phase1/phase2 اجرا کنید.

CREATE OR REPLACE FUNCTION public.admin_telegram_users_overview(p_portal_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day timestamptz := now() - interval '1 day';
  v_week timestamptz := now() - interval '7 days';
BEGIN
  IF NOT public.verify_portal_session_token(p_portal_token, true) THEN
    RAISE EXCEPTION 'invalid portal session';
  END IF;

  RETURN jsonb_build_object(
    'totalUsers', (SELECT COUNT(*)::int FROM telegram_users),
    'activeLast24h', (SELECT COUNT(*)::int FROM telegram_users WHERE last_seen_at >= v_day),
    'activeLast7d', (SELECT COUNT(*)::int FROM telegram_users WHERE last_seen_at >= v_week),
    'premiumUsers', (SELECT COUNT(*)::int FROM telegram_users WHERE is_premium = true),
    'adminUsers', (SELECT COUNT(*)::int FROM telegram_users WHERE app_role = 'admin')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_telegram_users_overview(uuid) TO anon, authenticated;

-- trim token در verify (اگر هنوز نبود)
CREATE OR REPLACE FUNCTION public.telegram_bot_token_from_vault()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT NULLIF(trim(decrypted_secret), '')
  FROM vault.decrypted_secrets
  WHERE name = 'telegram_bot_token'
  ORDER BY created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.telegram_bot_token_from_vault() FROM PUBLIC;

-- ─── 2) Edge register internal ───
-- بعد از phase2 اجرا کنید.

CREATE OR REPLACE FUNCTION public.register_telegram_user_visit_internal(
  p_telegram_user_id bigint,
  p_first_name text DEFAULT '',
  p_last_name text DEFAULT NULL,
  p_username text DEFAULT NULL,
  p_language_code text DEFAULT NULL,
  p_photo_url text DEFAULT NULL,
  p_is_premium boolean DEFAULT false
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

REVOKE ALL ON FUNCTION public.register_telegram_user_visit_internal(
  bigint, text, text, text, text, text, boolean
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.register_telegram_user_visit_internal(
  bigint, text, text, text, text, text, boolean
) TO service_role;

-- ─── 3) Header initData از request ───
CREATE OR REPLACE FUNCTION public.telegram_init_data_from_request()
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_headers jsonb;
  v_raw text;
BEGIN
  BEGIN
    v_headers := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  v_raw := coalesce(
    v_headers ->> 'x-telegram-init-data',
    v_headers ->> 'X-Telegram-Init-Data'
  );

  IF v_raw IS NULL OR trim(v_raw) = '' THEN
    RETURN NULL;
  END IF;

  RETURN trim(v_raw);
END;
$$;

-- ─── 4) verify_telegram_user_id_from_init + list RPC ───
-- body param → در صورت fail، header x-telegram-init-data (مثل register)
CREATE OR REPLACE FUNCTION public.verify_telegram_user_id_from_init(p_init_data text DEFAULT NULL)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id bigint;
  v_init text;
BEGIN
  v_init := NULLIF(trim(p_init_data), '');
  IF v_init IS NOT NULL THEN
    v_user_id := public.verify_telegram_init_data(v_init);
    IF v_user_id IS NOT NULL THEN
      RETURN v_user_id;
    END IF;
  END IF;

  v_init := public.telegram_init_data_from_request();
  IF v_init IS NOT NULL THEN
    RETURN public.verify_telegram_init_data(v_init);
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_telegram_user_id_from_init(text) TO anon, authenticated;

-- ─── RPC لیست — از verify_telegram_user_id_from_init استفاده کنید ───

CREATE OR REPLACE FUNCTION public.get_user_anime_list_verified(p_init_data text DEFAULT NULL)
RETURNS TABLE(
  anime_id uuid,
  episodes_watched int,
  user_rating numeric,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id bigint;
BEGIN
  v_user_id := public.verify_telegram_user_id_from_init(p_init_data);
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    u.anime_id,
    u.episodes_watched,
    u.user_rating,
    u.updated_at
  FROM user_anime_list u
  WHERE u.telegram_user_id = v_user_id
  ORDER BY u.updated_at DESC;
END;
$$;

-- ─── 5) Verify decode + debug ───
CREATE OR REPLACE FUNCTION public.telegram_init_data_check_strings(p_init_data text)
RETURNS TABLE(mode text, check_string text)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_init text;
  v_part text;
  v_key text;
  v_val text;
  v_decoded text;
  v_parts text[];
  v_pairs_full text[] := ARRAY[]::text[];
  v_pairs_no_sig text[] := ARRAY[]::text[];
  v_i int;
BEGIN
  v_init := NULLIF(trim(p_init_data), '');
  IF v_init IS NULL THEN
    RETURN;
  END IF;

  v_parts := string_to_array(v_init, '&');
  IF v_parts IS NULL THEN
    RETURN;
  END IF;

  FOR v_i IN 1..coalesce(array_length(v_parts, 1), 0) LOOP
    v_part := v_parts[v_i];
    IF v_part IS NULL OR v_part = '' THEN
      CONTINUE;
    END IF;

    v_key := split_part(v_part, '=', 1);
    IF v_key IS NULL OR v_key = '' OR v_key = 'hash' THEN
      CONTINUE;
    END IF;

    v_val := substring(v_part from length(v_key) + 2);
    v_decoded := public.url_decode_component(replace(v_val, '+', ' '));
    v_pairs_full := array_append(v_pairs_full, v_key || '=' || v_decoded);

    IF v_key <> 'signature' THEN
      v_pairs_no_sig := array_append(v_pairs_no_sig, v_key || '=' || v_decoded);
    END IF;
  END LOOP;

  IF coalesce(array_length(v_pairs_full, 1), 0) > 0 THEN
    mode := 'decoded_all';
    check_string := (
      SELECT array_to_string(array_agg(p ORDER BY split_part(p, '=', 1)), E'\n')
      FROM unnest(v_pairs_full) AS p
    );
    RETURN NEXT;
  END IF;

  IF coalesce(array_length(v_pairs_no_sig, 1), 0) > 0 THEN
    mode := 'decoded_no_signature';
    check_string := (
      SELECT array_to_string(array_agg(p ORDER BY split_part(p, '=', 1)), E'\n')
      FROM unnest(v_pairs_no_sig) AS p
    );
    RETURN NEXT;
  END IF;

  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_telegram_init_data(p_init_data text)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_init text;
  v_bot_token text;
  v_hash text;
  v_auth_date text;
  v_auth_ts bigint;
  v_user_encoded text;
  v_user_json jsonb;
  v_user_id bigint;
  v_part text;
  v_key text;
  v_val text;
  v_parts text[];
  v_i int;
  v_secret_key bytea;
  v_calc_hash text;
  v_row record;
BEGIN
  v_init := NULLIF(trim(p_init_data), '');
  IF v_init IS NULL THEN
    RETURN NULL;
  END IF;

  v_bot_token := NULLIF(trim(public.telegram_bot_token_from_vault()), '');
  IF v_bot_token IS NULL THEN
    RETURN NULL;
  END IF;

  v_parts := string_to_array(v_init, '&');
  IF v_parts IS NULL THEN
    RETURN NULL;
  END IF;

  FOR v_i IN 1..coalesce(array_length(v_parts, 1), 0) LOOP
    v_part := v_parts[v_i];
    IF v_part IS NULL OR v_part = '' THEN
      CONTINUE;
    END IF;

    v_key := split_part(v_part, '=', 1);
    v_val := substring(v_part from length(v_key) + 2);

    IF v_key = 'hash' THEN
      v_hash := lower(v_val);
    ELSIF v_key = 'auth_date' THEN
      v_auth_date := v_val;
    ELSIF v_key = 'user' THEN
      v_user_encoded := v_val;
    END IF;
  END LOOP;

  IF v_hash IS NULL OR v_hash = '' OR v_user_encoded IS NULL THEN
    RETURN NULL;
  END IF;

  v_secret_key := extensions.hmac(
    convert_to(v_bot_token, 'UTF8'),
    convert_to('WebAppData', 'UTF8'),
    'sha256'
  );

  FOR v_row IN
    SELECT mode, check_string
    FROM public.telegram_init_data_check_strings(v_init)
  LOOP
    v_calc_hash := encode(
      extensions.hmac(convert_to(v_row.check_string, 'UTF8'), v_secret_key, 'sha256'),
      'hex'
    );

    IF v_calc_hash = v_hash THEN
      EXIT;
    END IF;
  END LOOP;

  IF v_calc_hash IS NULL OR v_calc_hash <> v_hash THEN
    RETURN NULL;
  END IF;

  IF v_auth_date IS NOT NULL AND v_auth_date ~ '^\d+$' THEN
    v_auth_ts := v_auth_date::bigint;
    IF abs(extract(epoch from now())::bigint - v_auth_ts) > 604800 THEN
      RETURN NULL;
    END IF;
  END IF;

  v_user_json := public.url_decode_component(replace(v_user_encoded, '+', ' '))::jsonb;
  v_user_id := (v_user_json ->> 'id')::bigint;

  IF v_user_id IS NULL OR v_user_id <= 0 THEN
    RETURN NULL;
  END IF;

  RETURN v_user_id;
END;
$$;

-- failure_reason + debug (هماهنگ با verify جدید)
CREATE OR REPLACE FUNCTION public.telegram_init_data_failure_reason(p_init_data text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_init text;
  v_header text;
  v_bot_token text;
  v_hash text;
  v_user_encoded text;
  v_auth_date text;
  v_auth_ts bigint;
  v_secret_key bytea;
  v_calc_hash text;
  v_part text;
  v_key text;
  v_val text;
  v_parts text[];
  v_i int;
  v_row record;
  v_has_signature boolean := false;
BEGIN
  v_header := public.telegram_init_data_from_request();
  v_init := COALESCE(NULLIF(trim(p_init_data), ''), v_header);

  IF v_init IS NULL OR v_init = '' THEN
    RETURN 'init_data_empty';
  END IF;

  v_bot_token := NULLIF(trim(public.telegram_bot_token_from_vault()), '');
  IF v_bot_token IS NULL THEN
    RETURN 'vault_token_missing';
  END IF;

  v_parts := string_to_array(v_init, '&');
  IF v_parts IS NULL THEN
    RETURN 'parse_failed';
  END IF;

  FOR v_i IN 1..coalesce(array_length(v_parts, 1), 0) LOOP
    v_part := v_parts[v_i];
    IF v_part IS NULL OR v_part = '' THEN CONTINUE; END IF;
    v_key := split_part(v_part, '=', 1);
    v_val := substring(v_part from length(v_key) + 2);
    IF v_key = 'hash' THEN
      v_hash := lower(v_val);
    ELSIF v_key = 'auth_date' THEN
      v_auth_date := v_val;
    ELSIF v_key = 'user' THEN
      v_user_encoded := v_val;
    ELSIF v_key = 'signature' THEN
      v_has_signature := true;
    END IF;
  END LOOP;

  IF v_hash IS NULL OR v_user_encoded IS NULL THEN
    RETURN 'missing_hash_or_user';
  END IF;

  v_secret_key := extensions.hmac(
    convert_to(v_bot_token, 'UTF8'),
    convert_to('WebAppData', 'UTF8'),
    'sha256'
  );

  v_calc_hash := NULL;

  FOR v_row IN
    SELECT check_string FROM public.telegram_init_data_check_strings(v_init)
  LOOP
    v_calc_hash := encode(
      extensions.hmac(convert_to(v_row.check_string, 'UTF8'), v_secret_key, 'sha256'),
      'hex'
    );
    IF v_calc_hash = v_hash THEN
      IF v_auth_date IS NOT NULL AND v_auth_date ~ '^\d+$' THEN
        v_auth_ts := v_auth_date::bigint;
        IF abs(extract(epoch from now())::bigint - v_auth_ts) > 604800 THEN
          RETURN 'auth_date_expired';
        END IF;
      END IF;
      RETURN 'ok';
    END IF;
  END LOOP;

  IF v_has_signature THEN
    RETURN 'hash_mismatch_try_edge_or_check_token';
  END IF;

  RETURN 'hash_mismatch';
END;
$$;

CREATE OR REPLACE FUNCTION public.debug_telegram_init_status(p_init_data text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_init text;
  v_header text;
  v_bot_token text;
  v_vault_bot_id text;
  v_hash text;
  v_user_encoded text;
  v_auth_date text;
  v_auth_ts bigint;
  v_secret_key bytea;
  v_calc_hash text;
  v_part text;
  v_key text;
  v_val text;
  v_parts text[];
  v_i int;
  v_row record;
  v_failure text := 'ok';
  v_user_id bigint;
  v_has_signature boolean := false;
  v_keys text[] := ARRAY[]::text[];
BEGIN
  v_header := public.telegram_init_data_from_request();
  v_init := COALESCE(NULLIF(trim(p_init_data), ''), v_header);

  v_bot_token := public.telegram_bot_token_from_vault();
  IF v_bot_token IS NULL OR trim(v_bot_token) = '' THEN
    RETURN jsonb_build_object(
      'vault_token_configured', false,
      'failure_reason', 'vault_token_missing',
      'body_init_data_length', coalesce(length(NULLIF(trim(p_init_data), '')), 0),
      'header_init_data_length', coalesce(length(v_header), 0)
    );
  END IF;

  v_vault_bot_id := split_part(trim(v_bot_token), ':', 1);

  IF v_init IS NULL OR v_init = '' THEN
    RETURN jsonb_build_object(
      'vault_token_configured', true,
      'vault_bot_id', v_vault_bot_id,
      'vault_token_length', length(trim(v_bot_token)),
      'failure_reason', 'init_data_empty',
      'body_init_data_length', coalesce(length(NULLIF(trim(p_init_data), '')), 0),
      'header_init_data_length', coalesce(length(v_header), 0)
    );
  END IF;

  v_parts := string_to_array(v_init, '&');

  FOR v_i IN 1..coalesce(array_length(v_parts, 1), 0) LOOP
    v_part := v_parts[v_i];
    IF v_part IS NULL OR v_part = '' THEN CONTINUE; END IF;
    v_key := split_part(v_part, '=', 1);
    v_val := substring(v_part from length(v_key) + 2);
    IF v_key = 'hash' THEN
      v_hash := lower(v_val);
    ELSIF v_key = 'auth_date' THEN
      v_auth_date := v_val;
    ELSIF v_key = 'user' THEN
      v_user_encoded := v_val;
    ELSIF v_key = 'signature' THEN
      v_has_signature := true;
    END IF;
    IF v_key <> 'hash' THEN
      v_keys := array_append(v_keys, v_key);
    END IF;
  END LOOP;

  IF v_hash IS NULL OR v_user_encoded IS NULL THEN
    v_failure := 'missing_hash_or_user';
  ELSE
    v_secret_key := extensions.hmac(
      convert_to(trim(v_bot_token), 'UTF8'),
      convert_to('WebAppData', 'UTF8'),
      'sha256'
    );

    v_calc_hash := NULL;

    FOR v_row IN
      SELECT mode, check_string
      FROM public.telegram_init_data_check_strings(v_init)
    LOOP
      v_calc_hash := encode(
        extensions.hmac(convert_to(v_row.check_string, 'UTF8'), v_secret_key, 'sha256'),
        'hex'
      );
      IF v_calc_hash = v_hash THEN
        v_failure := 'ok';
        EXIT;
      END IF;
    END LOOP;

    IF v_failure <> 'ok' THEN
      v_failure := CASE
        WHEN v_has_signature THEN 'hash_mismatch_try_edge_or_check_token'
        ELSE 'hash_mismatch'
      END;
    ELSIF v_auth_date IS NOT NULL AND v_auth_date ~ '^\d+$' THEN
      v_auth_ts := v_auth_date::bigint;
      IF abs(extract(epoch from now())::bigint - v_auth_ts) > 604800 THEN
        v_failure := 'auth_date_expired';
      END IF;
    END IF;
  END IF;

  v_user_id := public.verify_telegram_user_id_from_init(p_init_data);

  RETURN jsonb_build_object(
    'vault_token_configured', true,
    'vault_bot_id', v_vault_bot_id,
    'vault_token_length', length(trim(v_bot_token)),
    'verified_user_id', v_user_id,
    'failure_reason', CASE WHEN v_user_id IS NULL THEN v_failure ELSE 'ok' END,
    'body_init_data_length', coalesce(length(NULLIF(trim(p_init_data), '')), 0),
    'header_init_data_length', coalesce(length(v_header), 0),
    'init_data_keys', to_jsonb(v_keys),
    'has_signature', v_has_signature,
    'received_hash_prefix', CASE WHEN v_hash IS NOT NULL THEN left(v_hash, 8) ELSE null END,
    'computed_hash_prefix', CASE WHEN v_calc_hash IS NOT NULL THEN left(v_calc_hash, 8) ELSE null END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.telegram_init_data_check_strings(text) TO anon, authenticated;

-- ─── 6) Upsert/remove با پیام خطای دقیق ───
CREATE OR REPLACE FUNCTION public.upsert_user_anime_list_verified(
  p_init_data text DEFAULT NULL,
  p_anime_id uuid DEFAULT NULL,
  p_episodes_watched int DEFAULT NULL,
  p_user_rating numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id bigint;
  v_reason text;
BEGIN
  v_user_id := public.verify_telegram_user_id_from_init(p_init_data);
  IF v_user_id IS NULL THEN
    v_reason := public.telegram_init_data_failure_reason(p_init_data);
    RAISE EXCEPTION 'invalid telegram init data (%)', v_reason;
  END IF;

  IF p_anime_id IS NULL THEN
    RAISE EXCEPTION 'anime_id required';
  END IF;

  UPDATE user_anime_list
  SET
    episodes_watched = GREATEST(
      0,
      COALESCE(p_episodes_watched, user_anime_list.episodes_watched)
    ),
    user_rating = CASE
      WHEN p_user_rating IS NOT NULL THEN p_user_rating
      ELSE user_anime_list.user_rating
    END
  WHERE telegram_user_id = v_user_id
    AND anime_id = p_anime_id;

  IF NOT FOUND THEN
    INSERT INTO user_anime_list (
      telegram_user_id,
      anime_id,
      episodes_watched,
      user_rating
    )
    VALUES (
      v_user_id,
      p_anime_id,
      GREATEST(0, COALESCE(p_episodes_watched, 0)),
      p_user_rating
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_user_anime_list_verified(
  p_init_data text DEFAULT NULL,
  p_anime_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id bigint;
  v_reason text;
BEGIN
  v_user_id := public.verify_telegram_user_id_from_init(p_init_data);
  IF v_user_id IS NULL THEN
    v_reason := public.telegram_init_data_failure_reason(p_init_data);
    RAISE EXCEPTION 'invalid telegram init data (%)', v_reason;
  END IF;

  IF p_anime_id IS NULL THEN
    RAISE EXCEPTION 'anime_id required';
  END IF;

  DELETE FROM user_anime_list
  WHERE telegram_user_id = v_user_id
    AND anime_id = p_anime_id;
END;
$$;

-- ─── 7) Trigger امتیاز شیوری ───
CREATE OR REPLACE FUNCTION public.refresh_anime_shiori_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_anime_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.user_rating IS NULL THEN
      RETURN NEW;
    END IF;
    target_anime_id := NEW.anime_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.user_rating IS NOT DISTINCT FROM OLD.user_rating THEN
      RETURN NEW;
    END IF;
    target_anime_id := NEW.anime_id;
  ELSE
    target_anime_id := OLD.anime_id;
  END IF;

  UPDATE anime
  SET shiori_score = (
    SELECT ROUND(AVG(user_rating)::numeric, 1)
    FROM user_anime_list
    WHERE anime_id = target_anime_id
      AND user_rating IS NOT NULL
  )
  WHERE id = target_anime_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_user_anime_list_shiori_score ON user_anime_list;

CREATE TRIGGER trg_user_anime_list_shiori_score
  AFTER INSERT OR UPDATE OF user_rating OR DELETE
  ON user_anime_list
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_anime_shiori_score();

GRANT EXECUTE ON FUNCTION public.upsert_user_anime_list_verified(text, uuid, int, numeric)
  TO anon, authenticated;

-- ─── 8) Vault audit view ───
-- فقط metadata — مقدار token نشان داده نمی‌شود
CREATE OR REPLACE VIEW public.telegram_vault_token_audit AS
SELECT
  s.id,
  s.name,
  s.created_at,
  s.updated_at,
  split_part(trim(d.decrypted_secret), ':', 1) AS bot_id,
  length(trim(d.decrypted_secret)) AS token_length
FROM vault.secrets s
JOIN vault.decrypted_secrets d ON d.id = s.id
WHERE s.name = 'telegram_bot_token'
ORDER BY s.created_at DESC;

REVOKE ALL ON public.telegram_vault_token_audit FROM PUBLIC;
GRANT SELECT ON public.telegram_vault_token_audit TO service_role;

-- اگر بیش از یک secret با همین نام دارید، قدیمی‌ها را حذف کنید (Dashboard → Vault)
-- SELECT * FROM public.telegram_vault_token_audit;
