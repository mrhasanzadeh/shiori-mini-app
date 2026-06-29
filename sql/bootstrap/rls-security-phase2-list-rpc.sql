-- Patch فاز ۲ — RPC لیست شخصی با initData در body (مطمئن‌تر از header)
-- + trim bot token + register با پارامتر initData
-- بعد از Postgres-rls-security-phase2.sql اجرا کنید.

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

-- ─── لیست شخصی (verified initData) ───

CREATE OR REPLACE FUNCTION public.get_user_anime_list_verified(p_init_data text)
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
  v_user_id := public.verify_telegram_init_data(p_init_data);
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
  p_init_data text,
  p_anime_id uuid,
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
  v_user_id := public.verify_telegram_init_data(p_init_data);
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid telegram init data';
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
  p_init_data text,
  p_anime_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id bigint;
BEGIN
  v_user_id := public.verify_telegram_init_data(p_init_data);
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid telegram init data';
  END IF;

  DELETE FROM user_anime_list
  WHERE telegram_user_id = v_user_id
    AND anime_id = p_anime_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_anime_list_verified(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_anime_list_verified(text, uuid, int, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_anime_list_verified(text, uuid) TO anon, authenticated;

-- ─── ثبت کاربر: initData در پارامتر (fallback اگر header نرسد) ───

CREATE OR REPLACE FUNCTION public.register_telegram_user_visit(
  p_telegram_user_id bigint,
  p_first_name text DEFAULT '',
  p_last_name text DEFAULT NULL,
  p_username text DEFAULT NULL,
  p_language_code text DEFAULT NULL,
  p_photo_url text DEFAULT NULL,
  p_is_premium boolean DEFAULT false,
  p_init_data text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified_id bigint;
  v_init text;
BEGIN
  IF p_telegram_user_id IS NULL OR p_telegram_user_id <= 0 THEN
    RAISE EXCEPTION 'invalid telegram_user_id';
  END IF;

  v_init := COALESCE(NULLIF(trim(p_init_data), ''), public.telegram_init_data_from_request());
  v_verified_id := public.verify_telegram_init_data(v_init);

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
  bigint, text, text, text, text, text, boolean, text
) TO anon, authenticated;

-- دیباگ: وضعیت verify (فقط برای عیب‌یابی — initData واقعی از Mini App بفرست)
CREATE OR REPLACE FUNCTION public.debug_telegram_init_status(p_init_data text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_token boolean;
  v_user_id bigint;
BEGIN
  v_has_token := public.telegram_bot_token_from_vault() IS NOT NULL;
  v_user_id := public.verify_telegram_init_data(p_init_data);

  RETURN jsonb_build_object(
    'vault_token_configured', v_has_token,
    'verified_user_id', v_user_id,
    'init_data_length', coalesce(length(trim(p_init_data)), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_telegram_init_status(text) TO anon, authenticated;
