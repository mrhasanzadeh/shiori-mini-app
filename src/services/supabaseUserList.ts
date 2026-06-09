import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { getTelegramInitData } from '../lib/telegramRequestHeaders'
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

export type AnimeFavoriteCountMap = Record<string, number>

const entryKey = (animeId: number | string) => String(animeId)

const mapListRow = (row: Record<string, unknown>): UserAnimeListRow => ({
  anime_id: row.anime_id as number | string,
  episodes_watched:
    typeof row.episodes_watched === 'number'
      ? row.episodes_watched
      : Number(row.episodes_watched) || 0,
  user_rating: row.user_rating != null && row.user_rating !== '' ? Number(row.user_rating) : null,
  updated_at: typeof row.updated_at === 'string' ? row.updated_at : undefined,
})

const requireInitData = (): string => {
  const initData = getTelegramInitData()
  if (!initData) {
    throw new Error('Telegram initData یافت نشد — مینی‌اپ را فقط از داخل Telegram باز کنید')
  }
  return initData
}

const isRlsOrVerifyError = (message: string): boolean =>
  message.includes('invalid telegram init data') ||
  message.includes('row-level security') ||
  message.includes('permission denied') ||
  message.includes('JWT')

/** RLS + header x-telegram-init-data (مثل register) */
const listViaTable = async (): Promise<UserAnimeListRow[]> => {
  const { data, error } = await supabase
    .from('user_anime_list')
    .select('anime_id, episodes_watched, user_rating, updated_at')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(formatSupabaseError(error))
  return (data ?? []).map((row) => mapListRow(row as Record<string, unknown>))
}

const listViaRpc = async (initData: string): Promise<UserAnimeListRow[]> => {
  const { data, error } = await supabase.rpc('get_user_anime_list_verified', {
    p_init_data: initData,
  })

  if (error) throw new Error(formatSupabaseError(error))
  return (data ?? []).map((row: Record<string, unknown>) => mapListRow(row))
}

const upsertViaTable = async (
  telegramUserId: number,
  animeId: number | string,
  payload: { episodes_watched?: number; user_rating?: number | null }
): Promise<void> => {
  const row: Record<string, unknown> = {
    telegram_user_id: telegramUserId,
    anime_id: animeId,
    episodes_watched:
      payload.episodes_watched !== undefined
        ? Math.max(0, Math.floor(payload.episodes_watched))
        : 0,
  }

  if (payload.user_rating !== undefined) {
    row.user_rating = payload.user_rating
  }

  const { error } = await supabase.from('user_anime_list').upsert(row, {
    onConflict: 'telegram_user_id,anime_id',
  })

  if (error) throw new Error(formatSupabaseError(error))
}

const upsertViaRpc = async (
  initData: string,
  animeId: number | string,
  payload: { episodes_watched?: number; user_rating?: number | null }
): Promise<void> => {
  const { error } = await supabase.rpc('upsert_user_anime_list_verified', {
    p_init_data: initData,
    p_anime_id: animeId,
    p_episodes_watched:
      payload.episodes_watched !== undefined
        ? Math.max(0, Math.floor(payload.episodes_watched))
        : null,
    p_user_rating: payload.user_rating !== undefined ? payload.user_rating : null,
  })

  if (error) throw new Error(formatSupabaseError(error))
}

const removeViaTable = async (
  telegramUserId: number,
  animeId: number | string
): Promise<void> => {
  const { error } = await supabase
    .from('user_anime_list')
    .delete()
    .eq('telegram_user_id', telegramUserId)
    .eq('anime_id', animeId)

  if (error) throw new Error(formatSupabaseError(error))
}

const removeViaRpc = async (initData: string, animeId: number | string): Promise<void> => {
  const { error } = await supabase.rpc('remove_user_anime_list_verified', {
    p_init_data: initData,
    p_anime_id: animeId,
  })

  if (error) throw new Error(formatSupabaseError(error))
}

export const getUserAnimeList = async (_telegramUserId: number): Promise<UserAnimeListRow[]> => {
  if (!hasSupabaseConfig) return []

  if (!getTelegramInitData()) return []

  try {
    return await listViaTable()
  } catch (tableError) {
    const tableMsg = tableError instanceof Error ? tableError.message : String(tableError)
    if (!isRlsOrVerifyError(tableMsg)) {
      if (import.meta.env.DEV) console.warn('getUserAnimeList table:', tableMsg)
    }

    try {
      return await listViaRpc(requireInitData())
    } catch (e) {
      if (import.meta.env.DEV) console.warn('getUserAnimeList:', e instanceof Error ? e.message : e)
      return []
    }
  }
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

  requireInitData()

  try {
    await upsertViaTable(telegramUserId, animeId, payload)
    return
  } catch (tableError) {
    const tableMsg = tableError instanceof Error ? tableError.message : String(tableError)

    try {
      await upsertViaRpc(getTelegramInitData(), animeId, payload)
      return
    } catch (rpcError) {
      const rpcMsg = rpcError instanceof Error ? rpcError.message : String(rpcError)
      throw new Error(rpcMsg || tableMsg)
    }
  }
}

export const removeUserAnimeListEntry = async (
  telegramUserId: number,
  animeId: number | string
): Promise<void> => {
  if (!hasSupabaseConfig) return
  if (!getTelegramInitData()) return

  try {
    await removeViaTable(telegramUserId, animeId)
  } catch (tableError) {
    const tableMsg = tableError instanceof Error ? tableError.message : String(tableError)
    try {
      await removeViaRpc(getTelegramInitData(), animeId)
    } catch (rpcError) {
      const rpcMsg = rpcError instanceof Error ? rpcError.message : String(rpcError)
      throw new Error(rpcMsg || tableMsg)
    }
  }
}

export const getAnimeFavoriteCounts = async (): Promise<AnimeFavoriteCountMap> => {
  if (!hasSupabaseConfig) return {}

  const { data, error } = await supabase.rpc('get_anime_favorite_counts')

  if (error) {
    if (import.meta.env.DEV) console.warn('getAnimeFavoriteCounts:', error.message)
    return {}
  }

  const map: AnimeFavoriteCountMap = {}
  for (const row of data ?? []) {
    const id = row?.anime_id
    if (id == null) continue
    map[String(id)] = Number(row.favorite_count) || 0
  }
  return map
}

export const getAnimeFavoriteCount = async (animeId: number | string): Promise<number> => {
  if (!hasSupabaseConfig) return 0

  const { data, error } = await supabase.rpc('get_anime_favorite_count', {
    p_anime_id: animeId,
  })

  if (error) {
    if (import.meta.env.DEV) console.warn('getAnimeFavoriteCount:', error.message)
    return 0
  }

  return Number(data) || 0
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
