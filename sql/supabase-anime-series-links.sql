-- لینک فصل قبل/بعد بین ردیف‌های جدا در anime (هر فصل = پست مستقل)
-- اجرا: Supabase SQL Editor (یک‌بار)

ALTER TABLE public.anime
  ADD COLUMN IF NOT EXISTS prev_anime_id uuid REFERENCES public.anime (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_anime_id uuid REFERENCES public.anime (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_anime_prev_anime_id ON public.anime (prev_anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_next_anime_id ON public.anime (next_anime_id);

COMMENT ON COLUMN public.anime.prev_anime_id IS 'انیمه قبلی در زنجیره (مثلاً فصل ۱)';
COMMENT ON COLUMN public.anime.next_anime_id IS 'انیمه بعدی در زنجیره (مثلاً فصل ۲)';
