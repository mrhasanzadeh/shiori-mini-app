-- یکپارچه‌سازی: ورود وب روی telegram_users (بدون admin_portal_accounts)
-- اگر قبلاً admin_portal_* ساخته‌اید → sql/archive/supabase-unify-portal-users.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ─── ستون‌های ورود وب روی همان جدول کاربران ───
ALTER TABLE telegram_users
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS portal_login_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN telegram_users.email IS 'Web admin login email (optional)';
COMMENT ON COLUMN telegram_users.password_hash IS 'bcrypt hash for web admin login';
COMMENT ON COLUMN telegram_users.portal_login_enabled IS 'false = block web login even if password set';

CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_users_email_lower
  ON telegram_users (lower(trim(email)))
  WHERE email IS NOT NULL AND trim(email) <> '';

-- ─── session ورود وب (فقط token؛ نقش از telegram_users خوانده می‌شود) ───
CREATE TABLE IF NOT EXISTS user_portal_sessions (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint NOT NULL REFERENCES telegram_users(telegram_user_id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_portal_sessions_user
  ON user_portal_sessions (telegram_user_id);

CREATE INDEX IF NOT EXISTS idx_user_portal_sessions_expires
  ON user_portal_sessions (expires_at);

ALTER TABLE user_portal_sessions ENABLE ROW LEVEL SECURITY;

-- ─── RPC ورود (نام قبلی حفظ شده برای فرانت) ───
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

  RETURN jsonb_build_object(
    'ok', true,
    'token', v_token,
    'role', v_user.app_role,
    'display_name', coalesce(nullif(trim(v_user.first_name), ''), v_user.email),
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
BEGIN
  IF p_token IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_session');
  END IF;

  SELECT
    s.token,
    s.expires_at,
    u.app_role,
    coalesce(nullif(trim(u.first_name), ''), u.email) AS display_name,
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

  RETURN jsonb_build_object(
    'ok', true,
    'token', v_row.token,
    'role', v_row.app_role,
    'display_name', v_row.display_name,
    'expires_at', v_row.expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION admin_portal_logout(p_token uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  DELETE FROM user_portal_sessions WHERE token = p_token;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_portal_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_portal_verify_session(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_portal_logout(uuid) TO anon, authenticated;

-- ─── مثال‌ها ───
--
-- A) کاربر Telegram موجود → نقش + ایمیل/رمز وب:
-- UPDATE telegram_users
-- SET app_role = 'admin',
--     email = 'admin@shiori.app',
--     password_hash = extensions.crypt('YOUR_PASSWORD', extensions.gen_salt('bf'))
-- WHERE telegram_user_id = 90344148;
--
-- B) ادمین فقط وب (بدون Telegram) — telegram_user_id منفی:
-- INSERT INTO telegram_users (telegram_user_id, first_name, email, password_hash, app_role)
-- VALUES (
--   -1000001,
--   'مدیر وب',
--   'admin@shiori.app',
--   crypt('YOUR_PASSWORD', gen_salt('bf')),
--   'admin'
-- );
