-- اعلان‌ها — inbox + کمپین انتشار قسمت
-- بعد از supabase-consolidated-reapply.sql یک‌بار در SQL Editor اجرا کنید.

-- ─── تنظیمات کاربر ───
ALTER TABLE public.telegram_users
  ADD COLUMN IF NOT EXISTS notify_new_episode boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_telegram_dm boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.telegram_users.notify_new_episode IS 'inbox: قسمت جدید انیمه‌های لیست';
COMMENT ON COLUMN public.telegram_users.notify_telegram_dm IS 'پیام Telegram علاوه بر inbox';

-- ─── inbox ───
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint NOT NULL REFERENCES public.telegram_users (telegram_user_id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'new_episode',
  title text NOT NULL,
  message text NOT NULL,
  href text,
  anime_id uuid REFERENCES public.anime (id) ON DELETE SET NULL,
  episode_number int,
  campaign_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  telegram_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
  ON public.user_notifications (telegram_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_campaign
  ON public.user_notifications (campaign_id)
  WHERE campaign_id IS NOT NULL;

-- ─── log ادمین ───
CREATE TABLE IF NOT EXISTS public.notification_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'new_episode',
  anime_id uuid REFERENCES public.anime (id) ON DELETE SET NULL,
  episode_number int,
  title text NOT NULL,
  message text NOT NULL,
  recipient_count int NOT NULL DEFAULT 0,
  telegram_sent_count int NOT NULL DEFAULT 0,
  created_by bigint REFERENCES public.telegram_users (telegram_user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_campaign_id_fkey;

ALTER TABLE public.user_notifications
  ADD CONSTRAINT user_notifications_campaign_id_fkey
  FOREIGN KEY (campaign_id) REFERENCES public.notification_campaigns (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notification_campaigns_created
  ON public.notification_campaigns (created_at DESC);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;

-- بدون policy مستقیم — فقط RPC

-- ─── helper: user id from initData ───
CREATE OR REPLACE FUNCTION public.telegram_user_id_from_init_data(p_init_data text)
RETURNS bigint
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
    RAISE EXCEPTION 'invalid telegram init data';
  END IF;
  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.telegram_user_id_from_init_data(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.telegram_user_id_from_init_data(text) TO anon, authenticated;

-- ─── inbox (مینی‌اپ) ───
CREATE OR REPLACE FUNCTION public.get_my_notifications(p_init_data text, p_limit int DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id bigint;
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
BEGIN
  v_user_id := public.telegram_user_id_from_init_data(p_init_data);

  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC)
      FROM (
        SELECT
          n.id,
          n.kind,
          n.title,
          n.message,
          n.href,
          n.anime_id,
          n.episode_number,
          n.is_read,
          n.created_at
        FROM public.user_notifications n
        WHERE n.telegram_user_id = v_user_id
        ORDER BY n.created_at DESC
        LIMIT v_limit
      ) t
    ),
    '[]'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_my_notification_read(p_init_data text, p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id bigint;
BEGIN
  v_user_id := public.telegram_user_id_from_init_data(p_init_data);

  UPDATE public.user_notifications
  SET is_read = true
  WHERE id = p_notification_id
    AND telegram_user_id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_my_notifications_read(p_init_data text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id bigint;
BEGIN
  v_user_id := public.telegram_user_id_from_init_data(p_init_data);

  UPDATE public.user_notifications
  SET is_read = true
  WHERE telegram_user_id = v_user_id
    AND is_read = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_notification_preferences(p_init_data text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id bigint;
  v_row record;
BEGIN
  v_user_id := public.telegram_user_id_from_init_data(p_init_data);

  SELECT notify_new_episode, notify_telegram_dm
  INTO v_row
  FROM public.telegram_users
  WHERE telegram_user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  RETURN jsonb_build_object(
    'notify_new_episode', v_row.notify_new_episode,
    'notify_telegram_dm', v_row.notify_telegram_dm
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_my_notification_preferences(
  p_init_data text,
  p_notify_new_episode boolean,
  p_notify_telegram_dm boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id bigint;
BEGIN
  v_user_id := public.telegram_user_id_from_init_data(p_init_data);

  UPDATE public.telegram_users
  SET
    notify_new_episode = COALESCE(p_notify_new_episode, notify_new_episode),
    notify_telegram_dm = COALESCE(p_notify_telegram_dm, notify_telegram_dm)
  WHERE telegram_user_id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_notifications(text, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_my_notification_read(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_my_notifications_read(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_notification_preferences(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_notification_preferences(text, boolean, boolean) TO anon, authenticated;

-- ─── ادمین: انتشار قسمت ───
CREATE OR REPLACE FUNCTION public.admin_notify_episode_release(
  p_portal_token uuid,
  p_anime_id uuid,
  p_episode_number int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_editor bigint;
  v_anime record;
  v_campaign_id uuid;
  v_title text;
  v_message text;
  v_href text;
  v_recipient_count int := 0;
  v_telegram_candidates int := 0;
  v_telegram_ids bigint[] := ARRAY[]::bigint[];
  r record;
BEGIN
  IF NOT public.verify_portal_session_token(p_portal_token, false) THEN
    RAISE EXCEPTION 'invalid portal session';
  END IF;

  SELECT s.telegram_user_id INTO v_editor
  FROM public.user_portal_sessions s
  WHERE s.token = p_portal_token
    AND s.expires_at > now()
  LIMIT 1;

  IF p_anime_id IS NULL OR p_episode_number IS NULL OR p_episode_number < 1 THEN
    RAISE EXCEPTION 'invalid anime or episode number';
  END IF;

  SELECT id, title, title_romaji INTO v_anime
  FROM public.anime
  WHERE id = p_anime_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'anime not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.episodes e
    WHERE e.anime_id = p_anime_id
      AND e.episode_number = p_episode_number
  ) THEN
    RAISE EXCEPTION 'episode not found for this anime';
  END IF;

  v_title := 'قسمت جدید منتشر شد';
  v_message := format(
    'قسمت %s انیمه «%s» آماده تماشاست.',
    p_episode_number,
    COALESCE(NULLIF(trim(v_anime.title), ''), NULLIF(trim(v_anime.title_romaji), ''), 'انیمه')
  );
  v_href := format('/anime/%s', p_anime_id);

  INSERT INTO public.notification_campaigns (
    kind, anime_id, episode_number, title, message, created_by
  )
  VALUES (
    'new_episode', p_anime_id, p_episode_number, v_title, v_message, v_editor
  )
  RETURNING id INTO v_campaign_id;

  FOR r IN
    SELECT ual.telegram_user_id, tu.notify_new_episode, tu.notify_telegram_dm
    FROM public.user_anime_list ual
    JOIN public.telegram_users tu ON tu.telegram_user_id = ual.telegram_user_id
    WHERE ual.anime_id = p_anime_id
      AND tu.notify_new_episode = true
  LOOP
    INSERT INTO public.user_notifications (
      telegram_user_id,
      kind,
      title,
      message,
      href,
      anime_id,
      episode_number,
      campaign_id
    )
    VALUES (
      r.telegram_user_id,
      'new_episode',
      v_title,
      v_message,
      v_href,
      p_anime_id,
      p_episode_number,
      v_campaign_id
    );

    v_recipient_count := v_recipient_count + 1;
    IF r.notify_telegram_dm THEN
      v_telegram_candidates := v_telegram_candidates + 1;
      v_telegram_ids := array_append(v_telegram_ids, r.telegram_user_id);
    END IF;
  END LOOP;

  UPDATE public.notification_campaigns
  SET recipient_count = v_recipient_count
  WHERE id = v_campaign_id;

  RETURN jsonb_build_object(
    'ok', true,
    'campaign_id', v_campaign_id,
    'anime_id', p_anime_id,
    'anime_title', COALESCE(NULLIF(trim(v_anime.title), ''), v_anime.title_romaji),
    'episode_number', p_episode_number,
    'title', v_title,
    'message', v_message,
    'href', v_href,
    'inbox_created', v_recipient_count,
    'telegram_candidates', v_telegram_candidates,
    'telegram_user_ids', to_jsonb(v_telegram_ids)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_notification_campaigns(
  p_portal_token uuid,
  p_limit int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
BEGIN
  IF NOT public.verify_portal_session_token(p_portal_token, false) THEN
    RAISE EXCEPTION 'invalid portal session';
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC)
      FROM (
        SELECT
          c.id,
          c.kind,
          c.anime_id,
          a.title AS anime_title,
          c.episode_number,
          c.title,
          c.message,
          c.recipient_count,
          c.telegram_sent_count,
          c.created_at
        FROM public.notification_campaigns c
        LEFT JOIN public.anime a ON a.id = c.anime_id
        ORDER BY c.created_at DESC
        LIMIT v_limit
      ) t
    ),
    '[]'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notifications_telegram_sent(
  p_campaign_id uuid,
  p_sent_count int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notification_campaigns
  SET telegram_sent_count = GREATEST(p_sent_count, 0)
  WHERE id = p_campaign_id;

  UPDATE public.user_notifications n
  SET telegram_sent_at = now()
  FROM public.telegram_users tu
  WHERE n.campaign_id = p_campaign_id
    AND tu.telegram_user_id = n.telegram_user_id
    AND tu.notify_telegram_dm = true
    AND n.telegram_sent_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_notify_episode_release(uuid, uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_notification_campaigns(uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_notifications_telegram_sent(uuid, int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_notify_episode_release(uuid, uuid, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_notification_campaigns(uuid, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_telegram_sent(uuid, int) TO service_role;
