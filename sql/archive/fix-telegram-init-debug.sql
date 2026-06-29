-- Patch: پیام خطای دقیق‌تر + خواندن header با چند نام
-- بعد از Postgres-fix-telegram-list-init-data.sql

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
  v_pairs text[] := ARRAY[]::text[];
  v_check_string text;
  v_secret_key bytea;
  v_calc_hash text;
  v_part text;
  v_key text;
  v_val text;
  v_parts text[];
  v_i int;
BEGIN
  v_header := public.telegram_init_data_from_request();
  v_init := COALESCE(NULLIF(trim(p_init_data), ''), v_header);

  IF v_init IS NULL OR v_init = '' THEN
    RETURN 'init_data_empty';
  END IF;

  v_bot_token := public.telegram_bot_token_from_vault();
  IF v_bot_token IS NULL OR trim(v_bot_token) = '' THEN
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
    END IF;
    IF v_key <> 'hash' THEN
      v_pairs := array_append(v_pairs, v_key || '=' || v_val);
    END IF;
  END LOOP;

  IF v_hash IS NULL OR v_hash = '' OR v_user_encoded IS NULL THEN
    RETURN 'missing_hash_or_user';
  END IF;

  SELECT array_to_string(array_agg(p ORDER BY split_part(p, '=', 1)), E'\n')
  INTO v_check_string
  FROM unnest(v_pairs) AS p;

  v_secret_key := extensions.hmac(
    convert_to(v_bot_token, 'UTF8'),
    convert_to('WebAppData', 'UTF8'),
    'sha256'
  );
  v_calc_hash := encode(
    extensions.hmac(convert_to(v_check_string, 'UTF8'), v_secret_key, 'sha256'),
    'hex'
  );

  IF v_calc_hash <> v_hash THEN
    RETURN 'hash_mismatch';
  END IF;

  IF v_auth_date IS NOT NULL AND v_auth_date ~ '^\d+$' THEN
    v_auth_ts := v_auth_date::bigint;
    IF abs(extract(epoch from now())::bigint - v_auth_ts) > 604800 THEN
      RETURN 'auth_date_expired';
    END IF;
  END IF;

  BEGIN
    IF (public.url_decode_component(v_user_encoded)::jsonb ->> 'id')::bigint IS NULL THEN
      RETURN 'invalid_user_id';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN 'invalid_user_json';
  END;

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.telegram_init_data_failure_reason(text) TO anon, authenticated;

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

-- چک duplicate در Vault (فقط metadata — مقدار secret نشان داده نمی‌شود)
-- SELECT name, created_at, length(decrypted_secret) AS token_len
-- FROM vault.decrypted_secrets
-- WHERE name = 'telegram_bot_token'
-- ORDER BY created_at DESC;
