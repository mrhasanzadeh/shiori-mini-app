-- ⚠️ SUPERSEDED: از supabase-rls-security-phase2-post-migration.sql استفاده کنید.
-- Fix hash_mismatch: data-check-string باید مقادیر decode‌شده باشد (مثل URLSearchParams)
-- + اگر signature هست، HMAC بدون signature هم امتحان شود (direct link / startapp)
-- بعد از supabase-fix-telegram-list-init-data.sql اجرا کنید.

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
