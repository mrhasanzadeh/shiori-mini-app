-- به‌روزرسانی امتیازهای خارجی (برای cron / Edge Function)
-- anime.id در این پروژه UUID است.
-- RPC قبلی cache_anime_external_scores فقط ستون‌های خالی را پر می‌کند.
-- این تابع مقادیر جدید را جایگزین می‌کند (null = بدون تغییر).

-- امضای قدیمی BIGINT (اگر قبلاً ساخته شده)
DROP FUNCTION IF EXISTS public.update_anime_external_scores(BIGINT, NUMERIC, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION public.update_anime_external_scores(
  p_anime_id UUID,
  p_average_score NUMERIC DEFAULT NULL,
  p_mal_score NUMERIC DEFAULT NULL,
  p_imdb_score NUMERIC DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE anime
  SET
    average_score = CASE
      WHEN p_average_score IS NOT NULL THEN p_average_score
      ELSE average_score
    END,
    mal_score = CASE
      WHEN p_mal_score IS NOT NULL THEN p_mal_score
      ELSE mal_score
    END,
    imdb_score = CASE
      WHEN p_imdb_score IS NOT NULL THEN p_imdb_score
      ELSE imdb_score
    END
  WHERE id = p_anime_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_anime_external_scores(UUID, NUMERIC, NUMERIC, NUMERIC)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.update_anime_external_scores(UUID, NUMERIC, NUMERIC, NUMERIC)
  TO service_role;

-- دکمه سینک ادمین در صفحه انیمه (مینی‌اپ — قبل از لانچ عمومی)
GRANT EXECUTE ON FUNCTION public.update_anime_external_scores(UUID, NUMERIC, NUMERIC, NUMERIC)
  TO anon, authenticated;

-- ─── زمان‌بندی cron (اختیاری) ───
-- 1) Edge Function را deploy کنید: supabase functions deploy sync-external-scores
-- 2) Secrets: CRON_SECRET (اختیاری)، OMDB_API_KEY (اختیاری)
-- 3) یکی از روش‌ها:
--    الف) Supabase Dashboard → Edge Functions → sync-external-scores → Schedules → هفتگی
--    ب) pg_cron + pg_net (اگر فعال است):

-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- SELECT cron.schedule(
--   'sync-external-scores-weekly',
--   '0 3 * * 0',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-external-scores?limit=30',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_ANON_OR_SERVICE_KEY',
--       'x-cron-secret', 'YOUR_CRON_SECRET'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
