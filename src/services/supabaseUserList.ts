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

type TelegramInitDebug = {
  failure_reason?: string
  verified_user_id?: number | null
  vault_token_configured?: boolean
  body_init_data_length?: number
  header_init_data_length?: number
}

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

const debugInitDataStatus = async (initData: string): Promise<TelegramInitDebug | null> => {
  if (!hasSupabaseConfig) return null

  const { data, error } = await supabase.rpc('debug_telegram_init_status', {
    p_init_data: initData,
  })

  if (error) {
    if (import.meta.env.DEV) console.warn('debug_telegram_init_status:', error.message)
    return null
  }

  return (data ?? null) as TelegramInitDebug
}

const enrichVerifyError = async (message: string, initData: string): Promise<string> => {
  if (!message.includes('invalid telegram init data')) return message

  const reasonMatch = message.match(/invalid telegram init data \(([^)]+)\)/)
  const inlineReason = reasonMatch?.[1]

  const debug = await debugInitDataStatus(initData)
  const reason = inlineReason ?? debug?.failure_reason

  if (reason === 'hash_mismatch') {
    return 'توکن bot در Vault با رباتی که مینی‌اپ را ازش باز کردید یکی نیست (hash_mismatch). در BotFather ببینید Mini App روی کدام bot است؛ همان token را در Vault بگذارید.'
  }

  if (reason === 'vault_token_missing') {
    return 'secret با نام telegram_bot_token در Supabase Vault یافت نشد.'
  }

  if (reason === 'init_data_empty') {
    return 'initData خالی است — مینی‌اپ را فقط از داخل Telegram باز کنید.'
  }

  if (reason === 'auth_date_expired') {
    return 'initData منقضی شده — مینی‌اپ را ببندید و دوباره از Telegram باز کنید.'
  }

  if (reason) {
    return `خطا در تأیید Telegram (${reason})`
  }

  return message
}

const listViaRpc = async (initData: string): Promise<UserAnimeListRow[]> => {
  const { data, error } = await supabase.rpc('get_user_anime_list_verified', {
    p_init_data: initData,
  })

  if (error) throw new Error(formatSupabaseError(error))
  return (data ?? []).map((row: Record<string, unknown>) => mapListRow(row))
}

const listViaTable = async (): Promise<UserAnimeListRow[]> => {
  const { data, error } = await supabase
    .from('user_anime_list')
    .select('anime_id, episodes_watched, user_rating, updated_at')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(formatSupabaseError(error))
  return (data ?? []).map((row) => mapListRow(row as Record<string, unknown>))
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

const removeViaRpc = async (initData: string, animeId: number | string): Promise<void> => {
  const { error } = await supabase.rpc('remove_user_anime_list_verified', {
    p_init_data: initData,
    p_anime_id: animeId,
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

export const getUserAnimeList = async (_telegramUserId: number): Promise<UserAnimeListRow[]> => {
  if (!hasSupabaseConfig) return []
  if (!getTelegramInitData()) return []

  const initData = requireInitData()

  try {
    return await listViaRpc(initData)
  } catch (rpcError) {
    try {
      return await listViaTable()
    } catch {
      if (import.meta.env.DEV) {
        console.warn('getUserAnimeList:', rpcError instanceof Error ? rpcError.message : rpcError)
      }
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

  const initData = requireInitData()

  try {
    await upsertViaRpc(initData, animeId, payload)
    return
  } catch (rpcError) {
    const rpcMsg = rpcError instanceof Error ? rpcError.message : String(rpcError)

    try {
      await upsertViaTable(telegramUserId, animeId, payload)
      return
    } catch {
      throw new Error(await enrichVerifyError(rpcMsg, initData))
    }
  }
}

export const removeUserAnimeListEntry = async (
  telegramUserId: number,
  animeId: number | string
): Promise<void> => {
  if (!hasSupabaseConfig) return
  if (!getTelegramInitData()) return

  const initData = requireInitData()

  try {
    await removeViaRpc(initData, animeId)
  } catch (rpcError) {
    const rpcMsg = rpcError instanceof Error ? rpcError.message : String(rpcError)
    try {
      await removeViaTable(telegramUserId, animeId)
    } catch {
      throw new Error(await enrichVerifyError(rpcMsg, initData))
    }
  }
}

export const debugTelegramInitStatus = async (): Promise<TelegramInitDebug | null> => {
  const initData = getTelegramInitData()
  if (!initData) return null
  return debugInitDataStatus(initData)
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
