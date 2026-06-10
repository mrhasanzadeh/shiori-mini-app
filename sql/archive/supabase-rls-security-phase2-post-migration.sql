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
