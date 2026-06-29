-- امنیت فاز ۲ — بعد از Postgres-rls-security-phase1.sql
-- 1) user_anime_list فقط با initData امضا‌شده Telegram (header: x-telegram-init-data)
-- 2) register_telegram_user_visit فقط با initData معتبر
-- 3) شمارش favorite عمومی از RPC (SECURITY DEFINER)
--
-- ⚠️ قبل از اجرا، bot token را در Vault ذخیره کنید (یک بار):
--   SELECT vault.create_secret('YOUR_BOT_TOKEN', 'telegram_bot_token', 'Telegram bot token for initData HMAC');
--   -- یا اگر قبلاً ساخته: فقط مقدار secret را در Dashboard → Vault به‌روز کنید.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ─── URL decode (برای پارامتر user در initData) ───

CREATE OR REPLACE FUNCTION public.url_decode_component(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_input text;
  v_result text := '';
  v_i int := 1;
  v_len int;
  v_byte int;
BEGIN
  IF p_text IS NULL OR p_text = '' THEN
    RETURN p_text;
  END IF;

  v_input := replace(p_text, '+', ' ');
  v_len := length(v_input);

  WHILE v_i <= v_len LOOP
    IF substring(v_input, v_i, 1) = '%' AND v_i + 2 <= v_len THEN
      BEGIN
        v_byte := ('x' || substring(v_input, v_i + 1, 2))::bit(8)::int;
        v_result := v_result || chr(v_byte);
      EXCEPTION WHEN OTHERS THEN
        v_result := v_result || substring(v_input, v_i, 1);
      END;
      v_i := v_i + 3;
    ELSE
      v_result := v_result || substring(v_input, v_i, 1);
      v_i := v_i + 1;
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;

-- ─── Bot token از Vault (فقط داخل SECURITY DEFINER) ───

CREATE OR REPLACE FUNCTION public.telegram_bot_token_from_vault()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = 'telegram_bot_token'
  ORDER BY created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.telegram_bot_token_from_vault() FROM PUBLIC;

-- ─── Telegram initData helpers ───

CREATE OR REPLACE FUNCTION public.telegram_init_data_from_request()
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_raw text;
BEGIN
  BEGIN
    v_raw := current_setting('request.headers', true)::json ->> 'x-telegram-init-data';
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  IF v_raw IS NULL OR trim(v_raw) = '' THEN
    RETURN NULL;
  END IF;

  RETURN trim(v_raw);
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
  v_pairs text[] := ARRAY[]::text[];
  v_check_string text;
  v_secret_key bytea;
  v_calc_hash text;
  v_i int;
BEGIN
  v_init := NULLIF(trim(p_init_data), '');
  IF v_init IS NULL THEN
    RETURN NULL;
  END IF;

  v_bot_token := public.telegram_bot_token_from_vault();
  IF v_bot_token IS NULL OR trim(v_bot_token) = '' THEN
    RETURN NULL;
  END IF;

  FOR v_i IN 1..array_length(string_to_array(v_init, '&'), 1) LOOP
    v_part := (string_to_array(v_init, '&'))[v_i];
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

    IF v_key <> 'hash' THEN
      v_pairs := array_append(v_pairs, v_key || '=' || v_val);
    END IF;
  END LOOP;

  IF v_hash IS NULL OR v_hash = '' OR v_user_encoded IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT array_to_string(array_agg(p ORDER BY p), E'\n')
  INTO v_check_string
  FROM unnest(v_pairs) AS p;

  v_secret_key := extensions.hmac(v_bot_token::bytea, convert_to('WebAppData', 'UTF8'), 'sha256');
  v_calc_hash := encode(extensions.hmac(convert_to(v_check_string, 'UTF8'), v_secret_key, 'sha256'), 'hex');

  IF v_calc_hash <> v_hash THEN
    RETURN NULL;
  END IF;

  IF v_auth_date IS NOT NULL AND v_auth_date ~ '^\d+$' THEN
    v_auth_ts := v_auth_date::bigint;
    IF abs(extract(epoch from now())::bigint - v_auth_ts) > 604800 THEN
      RETURN NULL;
    END IF;
  END IF;

  v_user_json := public.url_decode_component(v_user_encoded)::jsonb;
  v_user_id := (v_user_json ->> 'id')::bigint;

  IF v_user_id IS NULL OR v_user_id <= 0 THEN
    RETURN NULL;
  END IF;

  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.telegram_user_id_from_request()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.verify_telegram_init_data(public.telegram_init_data_from_request());
$$;

GRANT EXECUTE ON FUNCTION public.verify_telegram_init_data(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_user_id_from_request() TO anon, authenticated;

-- ─── user_anime_list RLS ───

DROP POLICY IF EXISTS "Public read user_anime_list" ON user_anime_list;
DROP POLICY IF EXISTS "Public insert user_anime_list" ON user_anime_list;
DROP POLICY IF EXISTS "Public update user_anime_list" ON user_anime_list;
DROP POLICY IF EXISTS "Public delete user_anime_list" ON user_anime_list;
DROP POLICY IF EXISTS "Telegram verified own list select" ON user_anime_list;
DROP POLICY IF EXISTS "Telegram verified own list insert" ON user_anime_list;
DROP POLICY IF EXISTS "Telegram verified own list update" ON user_anime_list;
DROP POLICY IF EXISTS "Telegram verified own list delete" ON user_anime_list;
DROP POLICY IF EXISTS "Portal staff read user_anime_list" ON user_anime_list;

CREATE POLICY "Telegram verified own list select"
  ON user_anime_list
  FOR SELECT
  TO anon, authenticated
  USING (telegram_user_id = public.telegram_user_id_from_request());

CREATE POLICY "Portal staff read user_anime_list"
  ON user_anime_list
  FOR SELECT
  TO anon, authenticated
  USING (public.portal_token_is_staff(false));

CREATE POLICY "Telegram verified own list insert"
  ON user_anime_list
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (telegram_user_id = public.telegram_user_id_from_request());

CREATE POLICY "Telegram verified own list update"
  ON user_anime_list
  FOR UPDATE
  TO anon, authenticated
  USING (telegram_user_id = public.telegram_user_id_from_request())
  WITH CHECK (telegram_user_id = public.telegram_user_id_from_request());

CREATE POLICY "Telegram verified own list delete"
  ON user_anime_list
  FOR DELETE
  TO anon, authenticated
  USING (telegram_user_id = public.telegram_user_id_from_request());

-- ─── RPC: favorite count تک‌انیمه (بدون دسترسی مستقیم به جدول) ───

CREATE OR REPLACE FUNCTION public.get_anime_favorite_count(p_anime_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM user_anime_list
  WHERE anime_id = p_anime_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_anime_favorite_count(uuid) TO anon, authenticated;

-- ─── register_telegram_user_visit: الزام initData ───

CREATE OR REPLACE FUNCTION public.register_telegram_user_visit(
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
DECLARE
  v_verified_id bigint;
BEGIN
  IF p_telegram_user_id IS NULL OR p_telegram_user_id <= 0 THEN
    RAISE EXCEPTION 'invalid telegram_user_id';
  END IF;

  v_verified_id := public.telegram_user_id_from_request();
  IF v_verified_id IS NULL OR v_verified_id <> p_telegram_user_id THEN
    RAISE EXCEPTION 'invalid telegram init data';
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
  bigint, text, text, text, text, text, boolean
) TO anon, authenticated;
