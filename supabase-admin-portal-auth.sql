-- پورتال ادمین وب: حساب + session + RPC ورود
-- اجرا در Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admin_portal_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  display_name text,
  app_role text NOT NULL DEFAULT 'moderator' CHECK (app_role IN ('admin', 'moderator')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_portal_accounts_email_lower_unique UNIQUE (lower(trim(email)))
);

CREATE TABLE IF NOT EXISTS admin_portal_sessions (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES admin_portal_accounts(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_portal_sessions_account_id_idx
  ON admin_portal_sessions(account_id);

CREATE INDEX IF NOT EXISTS admin_portal_sessions_expires_at_idx
  ON admin_portal_sessions(expires_at);

ALTER TABLE admin_portal_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_portal_sessions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION admin_portal_login(p_email text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account admin_portal_accounts%ROWTYPE;
  v_token uuid;
  v_expires timestamptz;
BEGIN
  IF coalesce(trim(p_email), '') = '' OR coalesce(p_password, '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  END IF;

  SELECT * INTO v_account
  FROM admin_portal_accounts
  WHERE lower(trim(email)) = lower(trim(p_email))
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  END IF;

  IF v_account.password_hash IS NULL
     OR v_account.password_hash <> crypt(p_password, v_account.password_hash) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  END IF;

  DELETE FROM admin_portal_sessions
  WHERE account_id = v_account.id
    AND expires_at < now();

  v_token := gen_random_uuid();
  v_expires := now() + interval '7 days';

  INSERT INTO admin_portal_sessions (token, account_id, expires_at)
  VALUES (v_token, v_account.id, v_expires);

  RETURN jsonb_build_object(
    'ok', true,
    'token', v_token,
    'role', v_account.app_role,
    'display_name', coalesce(nullif(trim(v_account.display_name), ''), v_account.email),
    'expires_at', v_expires
  );
END;
$$;

CREATE OR REPLACE FUNCTION admin_portal_verify_session(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    a.app_role,
    coalesce(nullif(trim(a.display_name), ''), a.email) AS display_name,
    a.is_active
  INTO v_row
  FROM admin_portal_sessions s
  JOIN admin_portal_accounts a ON a.id = s.account_id
  WHERE s.token = p_token;

  IF NOT FOUND OR NOT v_row.is_active OR v_row.expires_at <= now() THEN
    DELETE FROM admin_portal_sessions WHERE token = p_token;
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
SET search_path = public
AS $$
BEGIN
  DELETE FROM admin_portal_sessions WHERE token = p_token;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_portal_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_portal_verify_session(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_portal_logout(uuid) TO anon, authenticated;

-- ─── اولین ادمین (پسورد را عوض کنید) ───
-- INSERT INTO admin_portal_accounts (email, password_hash, display_name, app_role)
-- VALUES (
--   'admin@shiori.app',
--   crypt('YOUR_STRONG_PASSWORD', gen_salt('bf')),
--   'مدیر اصلی',
--   'admin'
-- );
