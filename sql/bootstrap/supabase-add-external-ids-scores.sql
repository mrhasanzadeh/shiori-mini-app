-- شناسه‌ها و امتیازهای MAL / IMDb (AniList از قبل: anilist_id + average_score)
-- این فایل را در Supabase SQL Editor اجرا کنید.

ALTER TABLE anime ADD COLUMN IF NOT EXISTS mal_id INTEGER;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS imdb_id TEXT;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS mal_score NUMERIC(4, 2);
ALTER TABLE anime ADD COLUMN IF NOT EXISTS imdb_score NUMERIC(4, 2);

COMMENT ON COLUMN anime.mal_id IS 'MyAnimeList anime id';
COMMENT ON COLUMN anime.imdb_id IS 'IMDb title id, e.g. tt0213338';
COMMENT ON COLUMN anime.mal_score IS 'Cached MAL score (0–10)';
COMMENT ON COLUMN anime.imdb_score IS 'Cached IMDb score (0–10)';
