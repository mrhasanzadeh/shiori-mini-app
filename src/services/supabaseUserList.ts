import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { formatSupabaseError } from './supabaseAnime'

export type UserAnimeListRow = {
  anime_id: number | string
  episodes_watched: number
  user_rating: number | null
  updated_at?: string
}

export type UserAnimeListStats = {
  animeCount: number
  episodesWatched: number
  averageRating: number | null
}

const entryKey = (animeId: number | string) => String(animeId)

export const getUserAnimeList = async (
  telegramUserId: number
): Promise<UserAnimeListRow[]> => {
  if (!hasSupabaseConfig) return []

  const { data, error } = await supabase
    .from('user_anime_list')
    .select('anime_id, episodes_watched, user_rating, updated_at')
    .eq('telegram_user_id', telegramUserId)
    .order('updated_at', { ascending: false })

  if (error) {
    if (import.meta.env.DEV) console.warn('getUserAnimeList:', error.message)
    return []
  }

  return (data ?? []).map((row) => ({
    anime_id: row.anime_id as number | string,
    episodes_watched:
      typeof row.episodes_watched === 'number' ? row.episodes_watched : Number(row.episodes_watched) || 0,
    user_rating:
      row.user_rating != null && row.user_rating !== ''
        ? Number(row.user_rating)
        : null,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : undefined,
  }))
}

export const upsertUserAnimeListEntry = async (
  telegramUserId: number,
  animeId: number | string,
  payload: {
    episodes_watched?: number
    user_rating?: number | null
  }
): Promise<void> => {
  if (!hasSupabaseConfig) {
    throw new Error('تنظیمات Supabase یافت نشد')
  }

  const row: Record<string, unknown> = {
    telegram_user_id: telegramUserId,
    anime_id: animeId,
  }

  if (payload.episodes_watched !== undefined) {
    row.episodes_watched = Math.max(0, Math.floor(payload.episodes_watched))
  }

  if (payload.user_rating !== undefined) {
    row.user_rating = payload.user_rating
  }

  const { error } = await supabase
    .from('user_anime_list')
    .upsert(row, { onConflict: 'telegram_user_id,anime_id' })

  if (error) throw new Error(formatSupabaseError(error))
}

export const removeUserAnimeListEntry = async (
  telegramUserId: number,
  animeId: number | string
): Promise<void> => {
  if (!hasSupabaseConfig) return

  const { error } = await supabase
    .from('user_anime_list')
    .delete()
    .eq('telegram_user_id', telegramUserId)
    .eq('anime_id', animeId)

  if (error) throw new Error(formatSupabaseError(error))
}

export const computeUserListStats = (rows: UserAnimeListRow[]): UserAnimeListStats => {
  const ratings = rows
    .map((r) => r.user_rating)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

  return {
    animeCount: rows.length,
    episodesWatched: rows.reduce((sum, r) => sum + (r.episodes_watched || 0), 0),
    averageRating:
      ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : null,
  }
}

export { entryKey as userAnimeListEntryKey }
