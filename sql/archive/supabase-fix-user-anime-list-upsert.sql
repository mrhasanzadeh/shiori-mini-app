-- Fix: upsert_user_anime_list_verified — UPDATE جدا از INSERT (پیشرفت قسمت‌ها)
-- + trigger امتیاز شیوری فقط وقتی user_rating واقعاً عوض شد

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
