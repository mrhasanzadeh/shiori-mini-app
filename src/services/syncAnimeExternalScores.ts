import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { readStoredPortalSession } from '../lib/adminPortalSessionStorage'
import { fetchExternalScores, type ExternalScoreIds } from './externalScores'
import { formatSupabaseError } from './supabaseAnime'

const hasExternalIds = (ids: ExternalScoreIds) =>
  Boolean(
    (typeof ids.anilist_id === 'number' && ids.anilist_id > 0) ||
    (typeof ids.mal_id === 'number' && ids.mal_id > 0) ||
    (typeof ids.imdb_id === 'string' && ids.imdb_id.trim())
  )

/** fetch زنده + ذخیره در DB (staff — RPC admin_update_anime_external_scores) */
export const syncAnimeExternalScores = async (animeId: string | number, ids: ExternalScoreIds) => {
  if (!hasSupabaseConfig) {
    throw new Error('تنظیمات Supabase یافت نشد')
  }

  if (!hasExternalIds(ids)) {
    throw new Error('شناسه AniList / MAL / IMDb ثبت نشده')
  }

  const portalToken = readStoredPortalSession()?.token
  if (!portalToken) {
    throw new Error('نشست ادمین یافت نشد — دوباره وارد شوید')
  }

  const scores = await fetchExternalScores(ids)

  const { error } = await supabase.rpc('admin_update_anime_external_scores', {
    p_portal_token: portalToken,
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
