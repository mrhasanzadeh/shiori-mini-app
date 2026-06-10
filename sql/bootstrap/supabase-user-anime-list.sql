-- لیست شخصی کاربر (علاقه‌مندی + پیشرفت + امتیاز) + امتیاز شیوری
-- anime.id در این پروژه UUID است — anime_id هم UUID می‌باشد.
-- این فایل را در Supabase SQL Editor اجرا کنید.

CREATE TABLE IF NOT EXISTS user_anime_list (
  id BIGSERIAL PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  anime_id UUID NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  episodes_watched INT NOT NULL DEFAULT 0 CHECK (episodes_watched >= 0),
  user_rating NUMERIC(3, 1) CHECK (
    user_rating IS NULL OR (user_rating >= 1 AND user_rating <= 10)
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (telegram_user_id, anime_id)
);

CREATE INDEX IF NOT EXISTS idx_user_anime_list_telegram_user_id
  ON user_anime_list (telegram_user_id);

CREATE INDEX IF NOT EXISTS idx_user_anime_list_anime_id
  ON user_anime_list (anime_id);

COMMENT ON TABLE user_anime_list IS 'Favorites + watch progress + user rating (Telegram user id)';
COMMENT ON COLUMN user_anime_list.user_rating IS 'User score 1–10; NULL = not rated yet';

ALTER TABLE anime ADD COLUMN IF NOT EXISTS shiori_score NUMERIC(4, 1);
COMMENT ON COLUMN anime.shiori_score IS 'Cached average of user_anime_list.user_rating';

CREATE OR REPLACE FUNCTION public.touch_user_anime_list_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_anime_list_updated_at ON user_anime_list;
CREATE TRIGGER trg_user_anime_list_updated_at
  BEFORE UPDATE ON user_anime_list
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_user_anime_list_updated_at();

CREATE OR REPLACE FUNCTION public.refresh_anime_shiori_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_anime_id UUID;
BEGIN
  target_anime_id := COALESCE(NEW.anime_id, OLD.anime_id);

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

-- ─── RLS (مینی‌اپ با anon key — telegram_user_id از WebApp) ───
ALTER TABLE user_anime_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read user_anime_list" ON user_anime_list;
CREATE POLICY "Public read user_anime_list"
  ON user_anime_list FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public insert user_anime_list" ON user_anime_list;
CREATE POLICY "Public insert user_anime_list"
  ON user_anime_list FOR INSERT
  WITH CHECK (telegram_user_id IS NOT NULL);

DROP POLICY IF EXISTS "Public update user_anime_list" ON user_anime_list;
CREATE POLICY "Public update user_anime_list"
  ON user_anime_list FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Public delete user_anime_list" ON user_anime_list;
CREATE POLICY "Public delete user_anime_list"
  ON user_anime_list FOR DELETE
  USING (true);

-- برای محاسبه میانگین امتیاز شیوری (خواندن از anime.shiori_score کافی است)
