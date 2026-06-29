-- گروه فصل‌ها: هر فصل = ردیف جدا در anime، چند فصل در یک سری
-- (بعد از Postgres-anime-series-links.sql — prev/next اختیاری و legacy)
-- اجرا: Postgres (یک‌بار)

CREATE TABLE IF NOT EXISTS public.anime_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anime_series_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES public.anime_series (id) ON DELETE CASCADE,
  anime_id uuid NOT NULL REFERENCES public.anime (id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 1,
  label_fa text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT anime_series_members_anime_unique UNIQUE (anime_id),
  CONSTRAINT anime_series_members_series_order_unique UNIQUE (series_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_anime_series_members_series_id
  ON public.anime_series_members (series_id);

CREATE INDEX IF NOT EXISTS idx_anime_series_members_anime_id
  ON public.anime_series_members (anime_id);

COMMENT ON TABLE public.anime_series IS 'گروه چندفصلی (مثلاً Solo Leveling)';
COMMENT ON TABLE public.anime_series_members IS 'هر عضو = یک انیمه/فصل در سری';

ALTER TABLE public.anime_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anime_series_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read anime_series" ON public.anime_series;
CREATE POLICY "Public read anime_series"
  ON public.anime_series FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read anime_series_members" ON public.anime_series_members;
CREATE POLICY "Public read anime_series_members"
  ON public.anime_series_members FOR SELECT
  USING (true);

-- نوشتن از پنل ادمین (همان الگوی anime — anon + RLS یا service role)
DROP POLICY IF EXISTS "Allow anon write anime_series" ON public.anime_series;
CREATE POLICY "Allow anon write anime_series"
  ON public.anime_series FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon write anime_series_members" ON public.anime_series_members;
CREATE POLICY "Allow anon write anime_series_members"
  ON public.anime_series_members FOR ALL
  USING (true)
  WITH CHECK (true);
