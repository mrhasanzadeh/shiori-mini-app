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

type ListApiResult = {
  items: UserAnimeListRow[]
  source: 'rpc' | 'edge'
  reason?: string
}

const requireInitData = (): string => {
  const initData = getTelegramInitData()
  if (!initData) {
    throw new Error('Telegram initData یافت نشد — مینی‌اپ را فقط از داخل Telegram باز کنید')
  }
  return initData
}

/** SQL RPC — primary (بدون نیاز به deploy Edge Function) */
const listViaRpc = async (initData: string): Promise<ListApiResult> => {
  const { data, error } = await supabase.rpc('get_user_anime_list_verified', {
    p_init_data: initData,
  })

  if (error) {
    throw new Error(formatSupabaseError(error))
  }

  return {
    source: 'rpc',
    items: (data ?? []).map((row: Record<string, unknown>) => mapListRow(row)),
  }
}

const mutateViaRpc = async (
  initData: string,
  action: 'upsert' | 'remove',
  animeId: number | string,
  payload?: { episodes_watched?: number; user_rating?: number | null }
): Promise<void> => {
  if (action === 'upsert') {
    const { error } = await supabase.rpc('upsert_user_anime_list_verified', {
      p_init_data: initData,
      p_anime_id: animeId,
      p_episodes_watched:
        payload?.episodes_watched !== undefined
          ? Math.max(0, Math.floor(payload.episodes_watched))
          : null,
      p_user_rating: payload?.user_rating !== undefined ? payload.user_rating : null,
    })
    if (error) throw new Error(formatSupabaseError(error))
    return
  }

  const { error } = await supabase.rpc('remove_user_anime_list_verified', {
    p_init_data: initData,
    p_anime_id: animeId,
  })
  if (error) throw new Error(formatSupabaseError(error))
}

/** Edge Function — optional fallback if RPC verify fails (token در Vault vs Edge) */
const listViaEdge = async (initData: string): Promise<ListApiResult> => {
  const { data, error } = await supabase.functions.invoke('telegram-user-list', {
    body: { action: 'list', initData },
  })

  const payload = (data ?? {}) as {
    items?: Record<string, unknown>[]
    error?: string
    reason?: string
  }

  if (payload.error) {
    const detail = payload.reason ? `${payload.error} (${payload.reason})` : payload.error
    throw new Error(detail)
  }

  if (error) {
    throw new Error(error.message)
  }

  return {
    source: 'edge',
    items: (payload.items ?? []).map((row) => mapListRow(row)),
  }
}

const loadUserAnimeList = async (initData: string): Promise<ListApiResult> => {
  try {
    return await listViaRpc(initData)
  } catch (rpcError) {
    const rpcMsg = rpcError instanceof Error ? rpcError.message : String(rpcError)
    if (
      rpcMsg.includes('get_user_anime_list_verified') ||
      rpcMsg.includes('Could not find the function')
    ) {
      throw rpcError
    }

    try {
      const edge = await listViaEdge(initData)
      return { ...edge, reason: `rpc failed: ${rpcMsg}` }
    } catch {
      throw rpcError
    }
  }
}

export const getUserAnimeList = async (_telegramUserId: number): Promise<UserAnimeListRow[]> => {
  if (!hasSupabaseConfig) return []

  const initData = getTelegramInitData()
  if (!initData) return []

  try {
    const result = await loadUserAnimeList(initData)
    if (result.reason && import.meta.env.DEV) {
      console.warn('getUserAnimeList fallback:', result.reason)
    }
    return result.items
  } catch (e) {
    console.warn('getUserAnimeList:', e instanceof Error ? e.message : e)
    return []
  }
}

export const upsertUserAnimeListEntry = async (
  _telegramUserId: number,
  animeId: number | string,
  payload: {
    episodes_watched?: number
    user_rating?: number | null
  }
): Promise<void> => {
  if (!hasSupabaseConfig) {
    throw new Error('تنظیمات Supabase یافت نشد')
  }

  const initData = requireInitData()

  try {
    await mutateViaRpc(initData, 'upsert', animeId, payload)
  } catch (rpcError) {
    const rpcMsg = rpcError instanceof Error ? rpcError.message : String(rpcError)

    const { data, error } = await supabase.functions.invoke('telegram-user-list', {
      body: {
        action: 'upsert',
        initData,
        anime_id: animeId,
        episodes_watched: payload.episodes_watched,
        user_rating: payload.user_rating,
      },
    })

    const body = (data ?? {}) as { error?: string; reason?: string }
    if (body.error) {
      const edgeDetail = body.reason ? `${body.error} (${body.reason})` : body.error
      throw new Error(`${rpcMsg} | edge: ${edgeDetail}`)
    }
    if (error) {
      throw new Error(`${rpcMsg} | edge: ${error.message}`)
    }
  }
}

export const removeUserAnimeListEntry = async (
  _telegramUserId: number,
  animeId: number | string
): Promise<void> => {
  if (!hasSupabaseConfig) return

  const initData = getTelegramInitData()
  if (!initData) return

  try {
    await mutateViaRpc(initData, 'remove', animeId)
  } catch (rpcError) {
    const rpcMsg = rpcError instanceof Error ? rpcError.message : String(rpcError)

    const { data, error } = await supabase.functions.invoke('telegram-user-list', {
      body: { action: 'remove', initData, anime_id: animeId },
    })

    const body = (data ?? {}) as { error?: string; reason?: string }
    if (body.error || error) {
      throw new Error(rpcMsg)
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
