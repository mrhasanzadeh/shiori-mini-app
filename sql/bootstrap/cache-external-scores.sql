-- کش امتیازهای خارجی از سمت کلاینت (فقط ستون‌های خالی پر می‌شوند)
-- anime.id در این پروژه UUID است.
-- این فایل را در Postgres اجرا کنید.

-- امضای قدیمی BIGINT (اگر قبلاً ساخته شده)
DROP FUNCTION IF EXISTS public.cache_anime_external_scores(BIGINT, NUMERIC, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION public.cache_anime_external_scores(
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
    average_score = COALESCE(average_score, p_average_score),
    mal_score = COALESCE(mal_score, p_mal_score),
    imdb_score = COALESCE(imdb_score, p_imdb_score)
  WHERE id = p_anime_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cache_anime_external_scores(UUID, NUMERIC, NUMERIC, NUMERIC)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cache_anime_external_scores(UUID, NUMERIC, NUMERIC, NUMERIC)
  TO service_role;
