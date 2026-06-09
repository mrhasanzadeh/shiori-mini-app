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
  vault_bot_id?: string
  vault_token_length?: number
  body_init_data_length?: number
  header_init_data_length?: number
  init_data_keys?: string[]
  received_hash_prefix?: string
  computed_hash_prefix?: string
}

type EdgeDebug = {
  reason?: string
  verified_user_id?: number | null
  edge_bot_id?: number | null
  edge_bot_username?: string | null
  edge_token_bot_id?: string | null
  init_data_length?: number
  error?: string
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

const isEdgeUnavailable = (message: string): boolean =>
  message.includes('failed to send a request to the Edge Function') ||
  message.includes('Failed to fetch') ||
  message.includes('FunctionsFetchError')

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

const debugViaEdge = async (initData: string): Promise<EdgeDebug | null> => {
  const { data, error } = await supabase.functions.invoke('telegram-user-list', {
    body: { action: 'debug', initData },
  })

  if (error) {
    if (!isEdgeUnavailable(error.message) && import.meta.env.DEV) {
      console.warn('edge debug:', error.message)
    }
    return null
  }

  return (data ?? null) as EdgeDebug
}

const buildHashMismatchHelp = (sqlDebug: TelegramInitDebug | null, edgeDebug: EdgeDebug | null): string => {
  const lines: string[] = [
    'امضای Telegram تأیید نشد (hash_mismatch).',
  ]

  if (sqlDebug?.vault_bot_id) {
    lines.push(`Bot ID در Vault: ${sqlDebug.vault_bot_id}`)
  }
  if (edgeDebug?.edge_bot_username) {
    lines.push(`Bot در Edge secret: @${edgeDebug.edge_bot_username} (${edgeDebug.edge_bot_id ?? '?'})`)
  }
  if (sqlDebug?.received_hash_prefix && sqlDebug?.computed_hash_prefix) {
    lines.push(
      `Hash دریافتی/محاسبه‌شده: ${sqlDebug.received_hash_prefix}… / ${sqlDebug.computed_hash_prefix}…`
    )
  }

  lines.push(
    'مینی‌اپ را از همان رباتی باز کن که Mini App URL در BotFather روی آن ثبت شده. اگر چند secret در Vault دارید، قدیمی‌ها را حذف کنید.'
  )

  return lines.join('\n')
}

const enrichVerifyError = async (message: string, initData: string): Promise<string> => {
  if (!message.includes('invalid telegram init data') && !message.includes('hash_mismatch')) {
    return message
  }

  const reasonMatch = message.match(/invalid telegram init data \(([^)]+)\)/)
  const inlineReason = reasonMatch?.[1]

  const [sqlDebug, edgeDebug] = await Promise.all([
    debugInitDataStatus(initData),
    debugViaEdge(initData),
  ])

  const reason = inlineReason ?? sqlDebug?.failure_reason ?? edgeDebug?.reason

  if (reason === 'hash_mismatch') {
    return buildHashMismatchHelp(sqlDebug, edgeDebug)
  }

  if (edgeDebug?.reason === 'ok' && edgeDebug.verified_user_id) {
    return 'SQL verify خطا داد ولی Edge OK — Edge Function را deploy کنید (docs/telegram-user-list-edge.md).'
  }

  if (reason === 'vault_token_missing') {
    return 'secret با نام telegram_bot_token در Supabase Vault یافت نشد.'
  }

  if (reason === 'init_data_empty') {
    return 'initData خالی است — مینی‌اپ را ببندید و فقط از داخل Telegram باز کنید.'
  }

  if (reason === 'auth_date_expired') {
    return 'initData منقضی شده — مینی‌اپ را ببندید و دوباره باز کنید.'
  }

  if (reason) {
    return `خطا در تأیید Telegram (${reason})`
  }

  return message
}

const invokeEdge = async (
  action: 'list' | 'upsert' | 'remove',
  initData: string,
  extra?: Record<string, unknown>
): Promise<void> => {
  const { data, error } = await supabase.functions.invoke('telegram-user-list', {
    body: { action, initData, ...extra },
  })

  const payload = (data ?? {}) as { error?: string; reason?: string }
  if (payload.error) {
    const detail = payload.reason ? `${payload.error} (${payload.reason})` : payload.error
    throw new Error(detail)
  }
  if (error) {
    throw new Error(error.message)
  }
}

const listViaEdge = async (initData: string): Promise<UserAnimeListRow[]> => {
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
  if (error) throw new Error(error.message)

  return (payload.items ?? []).map((row) => mapListRow(row))
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
    return await listViaEdge(initData)
  } catch (edgeError) {
    const edgeMsg = edgeError instanceof Error ? edgeError.message : String(edgeError)
    if (!isEdgeUnavailable(edgeMsg) && import.meta.env.DEV) {
      console.warn('getUserAnimeList edge:', edgeMsg)
    }

    try {
      return await listViaRpc(initData)
    } catch {
      try {
        return await listViaTable()
      } catch {
        return []
      }
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
    await invokeEdge('upsert', initData, {
      anime_id: animeId,
      episodes_watched: payload.episodes_watched,
      user_rating: payload.user_rating,
    })
    return
  } catch (edgeError) {
    const edgeMsg = edgeError instanceof Error ? edgeError.message : String(edgeError)
    if (!isEdgeUnavailable(edgeMsg)) {
      throw new Error(await enrichVerifyError(edgeMsg, initData))
    }
  }

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
    await invokeEdge('remove', initData, { anime_id: animeId })
    return
  } catch (edgeError) {
    const edgeMsg = edgeError instanceof Error ? edgeError.message : String(edgeError)
    if (!isEdgeUnavailable(edgeMsg)) {
      throw new Error(await enrichVerifyError(edgeMsg, initData))
    }
  }

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

export const debugTelegramInitStatus = async (): Promise<{
  sql: TelegramInitDebug | null
  edge: EdgeDebug | null
  initDataLength: number
}> => {
  const initData = getTelegramInitData()
  if (!initData) {
    return { sql: null, edge: null, initDataLength: 0 }
  }

  const [sql, edge] = await Promise.all([debugInitDataStatus(initData), debugViaEdge(initData)])
  return { sql, edge, initDataLength: initData.length }
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
