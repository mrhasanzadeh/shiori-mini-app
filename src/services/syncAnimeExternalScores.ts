import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { fetchExternalScores, type ExternalScoreIds } from './externalScores'
import { formatSupabaseError } from './supabaseAnime'

const hasExternalIds = (ids: ExternalScoreIds) =>
  Boolean(
    (typeof ids.anilist_id === 'number' && ids.anilist_id > 0) ||
      (typeof ids.mal_id === 'number' && ids.mal_id > 0) ||
      (typeof ids.imdb_id === 'string' && ids.imdb_id.trim())
  )

/** fetch زنده + ذخیره در DB (ادمین — RPC update_anime_external_scores) */
export const syncAnimeExternalScores = async (
  animeId: string | number,
  ids: ExternalScoreIds
) => {
  if (!hasSupabaseConfig) {
    throw new Error('تنظیمات Supabase یافت نشد')
  }

  if (!hasExternalIds(ids)) {
    throw new Error('شناسه AniList / MAL / IMDb ثبت نشده')
  }

  const scores = await fetchExternalScores(ids)

  const { error } = await supabase.rpc('update_anime_external_scores', {
    p_anime_id: animeId,
    p_average_score: scores.anilistScore,
    p_mal_score: scores.malScore,
    p_imdb_score: scores.imdbScore,
  })

  if (error) {
    throw new Error(formatSupabaseError(error))
  }

  return scores
}
