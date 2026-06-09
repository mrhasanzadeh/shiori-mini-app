-- Vault + دیباگ دقیق hash_mismatch
-- بعد از supabase-fix-telegram-list-init-data.sql و supabase-fix-telegram-init-debug.sql

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
  v_pairs text[] := ARRAY[]::text[];
  v_keys text[] := ARRAY[]::text[];
  v_check_string text;
  v_secret_key bytea;
  v_calc_hash text;
  v_part text;
  v_key text;
  v_val text;
  v_parts text[];
  v_i int;
  v_failure text := 'ok';
  v_user_id bigint;
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
    END IF;
    IF v_key <> 'hash' THEN
      v_pairs := array_append(v_pairs, v_key || '=' || v_val);
      v_keys := array_append(v_keys, v_key);
    END IF;
  END LOOP;

  IF v_hash IS NULL OR v_user_encoded IS NULL THEN
    v_failure := 'missing_hash_or_user';
  ELSE
    SELECT array_to_string(array_agg(p ORDER BY split_part(p, '=', 1)), E'\n')
    INTO v_check_string
    FROM unnest(v_pairs) AS p;

    v_secret_key := extensions.hmac(
      convert_to(trim(v_bot_token), 'UTF8'),
      convert_to('WebAppData', 'UTF8'),
      'sha256'
    );
    v_calc_hash := encode(
      extensions.hmac(convert_to(v_check_string, 'UTF8'), v_secret_key, 'sha256'),
      'hex'
    );

    IF v_calc_hash <> v_hash THEN
      v_failure := 'hash_mismatch';
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
    'received_hash_prefix', CASE WHEN v_hash IS NOT NULL THEN left(v_hash, 8) ELSE null END,
    'computed_hash_prefix', CASE WHEN v_calc_hash IS NOT NULL THEN left(v_calc_hash, 8) ELSE null END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_telegram_init_status(text) TO anon, authenticated;

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
