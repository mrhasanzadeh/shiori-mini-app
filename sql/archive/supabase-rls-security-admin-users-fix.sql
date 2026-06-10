-- Hotfix: admin users + پایدارتر شدن خواندن کاربران با portal token
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
