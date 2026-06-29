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

-- staff: sql/security-hardening.sql → admin_update_anime_external_scores

-- ─── زمان‌بندی cron (اختیاری) ───
-- Shiori API: POST /api/v1/cron/sync-external-scores?limit=30&offset=0
-- Header: x-cron-secret: $CRON_SECRET
-- راهنما: sql/optional/cron-sync-external-scores.sql و api.shiori.cloud/DEPLOY.md
