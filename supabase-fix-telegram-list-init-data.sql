-- Fix: verify initData + لیست شخصی (header fallback مثل register)
-- بعد از phase2 + list-rpc اجرا کنید.
-- توکن Vault باید همان BotFather API token مینی‌اپ باشد: telegram_bot_token

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ─── verify (HMAC با convert_to UTF8 — نه bot_token::bytea) ───

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
  v_parts text[];
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

  v_parts := string_to_array(v_init, '&');
  IF v_parts IS NULL THEN
    RETURN NULL;
  END IF;

  FOR v_i IN 1..array_length(v_parts, 1) LOOP
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

    IF v_key <> 'hash' THEN
      v_pairs := array_append(v_pairs, v_key || '=' || v_val);
    END IF;
  END LOOP;

  IF v_hash IS NULL OR v_hash = '' OR v_user_encoded IS NULL THEN
    RETURN NULL;
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
BEGIN
  v_user_id := public.verify_telegram_user_id_from_init(p_init_data);
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid telegram init data';
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
BEGIN
  v_user_id := public.verify_telegram_user_id_from_init(p_init_data);
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid telegram init data';
  END IF;

  IF p_anime_id IS NULL THEN
    RAISE EXCEPTION 'anime_id required';
  END IF;

  DELETE FROM user_anime_list
  WHERE telegram_user_id = v_user_id
    AND anime_id = p_anime_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_anime_list_verified(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_anime_list_verified(text, uuid, int, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_anime_list_verified(text, uuid) TO anon, authenticated;

-- دیباگ (در SQL Editor با initData واقعی از Mini App)
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
  v_has_token boolean;
  v_user_id bigint;
  v_bot_token text;
  v_hash text;
  v_user_encoded text;
  v_pairs text[] := ARRAY[]::text[];
  v_check_string text;
  v_secret_key bytea;
  v_calc_hash text;
  v_part text;
  v_key text;
  v_val text;
  v_parts text[];
  v_i int;
  v_failure text := 'ok';
BEGIN
  v_has_token := public.telegram_bot_token_from_vault() IS NOT NULL;
  v_header := public.telegram_init_data_from_request();
  v_init := COALESCE(NULLIF(trim(p_init_data), ''), v_header);

  IF NOT v_has_token THEN
    v_failure := 'vault_token_missing';
  ELSIF v_init IS NULL OR v_init = '' THEN
    v_failure := 'init_data_empty';
  ELSE
    v_bot_token := public.telegram_bot_token_from_vault();
    v_parts := string_to_array(v_init, '&');

    FOR v_i IN 1..coalesce(array_length(v_parts, 1), 0) LOOP
      v_part := v_parts[v_i];
      IF v_part IS NULL OR v_part = '' THEN CONTINUE; END IF;
      v_key := split_part(v_part, '=', 1);
      v_val := substring(v_part from length(v_key) + 2);
      IF v_key = 'hash' THEN v_hash := lower(v_val);
      ELSIF v_key = 'user' THEN v_user_encoded := v_val;
      END IF;
      IF v_key <> 'hash' THEN
        v_pairs := array_append(v_pairs, v_key || '=' || v_val);
      END IF;
    END LOOP;

    IF v_hash IS NULL OR v_user_encoded IS NULL THEN
      v_failure := 'missing_hash_or_user';
    ELSE
      SELECT array_to_string(array_agg(p ORDER BY split_part(p, '=', 1)), E'\n')
      INTO v_check_string FROM unnest(v_pairs) AS p;

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
        v_failure := 'hash_mismatch';
      END IF;
    END IF;
  END IF;

  v_user_id := public.verify_telegram_user_id_from_init(p_init_data);

  RETURN jsonb_build_object(
    'vault_token_configured', v_has_token,
    'header_init_data_length', coalesce(length(v_header), 0),
    'body_init_data_length', coalesce(length(NULLIF(trim(p_init_data), '')), 0),
    'verified_user_id', v_user_id,
    'failure_reason', CASE WHEN v_user_id IS NULL THEN v_failure ELSE 'ok' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_telegram_init_status(text) TO anon, authenticated;
