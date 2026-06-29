-- Fix: verify Telegram initData HMAC (bot token باید convert_to UTF8 باشد، نه ::bytea)
-- + debug با failure_reason
-- بعد از phase2 + list-rpc اجرا کنید.

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

  -- ⚠️ convert_to — نه ::bytea (توکن bot UTF-8 است)
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

CREATE OR REPLACE FUNCTION public.debug_telegram_init_status(p_init_data text)
RETURNS jsonb
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
  v_part text;
  v_key text;
  v_val text;
  v_pairs text[] := ARRAY[]::text[];
  v_check_string text;
  v_secret_key bytea;
  v_calc_hash text;
  v_parts text[];
  v_i int;
  v_user_id bigint;
  v_reason text := 'ok';
BEGIN
  v_init := NULLIF(trim(p_init_data), '');
  IF v_init IS NULL THEN
    RETURN jsonb_build_object('failure_reason', 'empty_init_data');
  END IF;

  v_bot_token := public.telegram_bot_token_from_vault();
  IF v_bot_token IS NULL OR trim(v_bot_token) = '' THEN
    RETURN jsonb_build_object('failure_reason', 'vault_token_missing');
  END IF;

  v_parts := string_to_array(v_init, '&');

  FOR v_i IN 1..coalesce(array_length(v_parts, 1), 0) LOOP
    v_part := v_parts[v_i];
    IF v_part IS NULL OR v_part = '' THEN CONTINUE; END IF;
    v_key := split_part(v_part, '=', 1);
    v_val := substring(v_part from length(v_key) + 2);
    IF v_key = 'hash' THEN v_hash := lower(v_val);
    ELSIF v_key = 'auth_date' THEN v_auth_date := v_val;
    ELSIF v_key = 'user' THEN v_user_encoded := v_val;
    END IF;
    IF v_key <> 'hash' THEN v_pairs := array_append(v_pairs, v_key || '=' || v_val); END IF;
  END LOOP;

  IF v_hash IS NULL OR v_hash = '' THEN
    RETURN jsonb_build_object('failure_reason', 'missing_hash');
  END IF;
  IF v_user_encoded IS NULL THEN
    RETURN jsonb_build_object('failure_reason', 'missing_user');
  END IF;

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
    RETURN jsonb_build_object(
      'failure_reason', 'hash_mismatch',
      'vault_token_configured', true,
      'init_data_length', length(v_init)
    );
  END IF;

  IF v_auth_date IS NOT NULL AND v_auth_date ~ '^\d+$' THEN
    v_auth_ts := v_auth_date::bigint;
    IF abs(extract(epoch from now())::bigint - v_auth_ts) > 604800 THEN
      RETURN jsonb_build_object('failure_reason', 'auth_date_expired');
    END IF;
  END IF;

  BEGIN
    v_user_id := (public.url_decode_component(v_user_encoded)::jsonb ->> 'id')::bigint;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('failure_reason', 'invalid_user_json');
  END;

  IF v_user_id IS NULL OR v_user_id <= 0 THEN
    RETURN jsonb_build_object('failure_reason', 'invalid_user_id');
  END IF;

  RETURN jsonb_build_object(
    'failure_reason', v_reason,
    'verified_user_id', v_user_id,
    'vault_token_configured', true,
    'init_data_length', length(v_init)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_telegram_init_status(text) TO anon, authenticated;
