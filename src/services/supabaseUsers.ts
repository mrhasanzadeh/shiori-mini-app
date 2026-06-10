import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { readStoredPortalSession } from '../lib/adminPortalSessionStorage'
import { getTelegramInitData } from '../lib/telegramRequestHeaders'
import { formatSupabaseError } from './supabaseAnime'
import { normalizeAppUserRole, type AppUserRole } from '../constants/userRoles'

export type TelegramUserRow = {
  telegram_user_id: number
  first_name: string
  last_name: string | null
  username: string | null
  email: string | null
  language_code: string | null
  photo_url: string | null
  is_premium: boolean
  app_role: AppUserRole
  admin_notes: string | null
  portal_login_enabled: boolean
  has_portal_password: boolean
  first_seen_at: string
  last_seen_at: string
  visit_count: number
  favorites_count: number
}

export type TelegramUsersOverview = {
  totalUsers: number
  activeLast24h: number
  activeLast7d: number
  premiumUsers: number
  adminUsers: number
}

export type GetTelegramUsersParams = {
  page: number
  pageSize: number
  query?: string
  roleFilter?: AppUserRole | 'all'
  usernameFilter?: 'all' | 'with' | 'without'
  sortBy?: 'last_seen_at' | 'first_seen_at' | 'visit_count' | 'favorites_count' | 'first_name' | 'username' | 'app_role'
  sortDir?: 'asc' | 'desc'
}

export type UpdateTelegramUserAdminPayload = {
  telegram_user_id: number
  app_role: AppUserRole
  admin_notes?: string | null
  username?: string
  email?: string | null
  password?: string | null
  portal_login_enabled?: boolean
}

type TelegramUserPayload = {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
  is_premium?: boolean
}

export type { TelegramUserPayload }

const escapeIlikePattern = (token: string): string =>
  token.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')

const splitSearchTokens = (query: string): string[] =>
  String(query ?? '')
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)

export const registerTelegramUserVisit = async (user: TelegramUserPayload): Promise<void> => {
  if (!hasSupabaseConfig || !user?.id) return

  const initData = getTelegramInitData()
  if (!initData) return

  const { error: rpcError } = await supabase.rpc('register_telegram_user_visit', {
    p_telegram_user_id: user.id,
    p_first_name: user.first_name ?? '',
    p_last_name: user.last_name ?? null,
    p_username: user.username?.trim() || null,
    p_language_code: user.language_code ?? null,
    p_photo_url: user.photo_url ?? null,
    p_is_premium: user.is_premium ?? false,
    p_init_data: initData,
  })

  if (!rpcError) return

  if (import.meta.env.DEV) console.warn('registerTelegramUserVisit rpc:', rpcError.message)

  const { data, error: edgeError } = await supabase.functions.invoke('telegram-user-list', {
    body: {
      action: 'register',
      initData,
      telegram_user_id: user.id,
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? null,
      username: user.username?.trim() || null,
      language_code: user.language_code ?? null,
      photo_url: user.photo_url ?? null,
      is_premium: user.is_premium ?? false,
    },
  })

  if (edgeError && import.meta.env.DEV) {
    console.warn('registerTelegramUserVisit edge:', edgeError.message)
  }

  const payload = data as { error?: string; reason?: string } | null
  if (payload?.error && import.meta.env.DEV) {
    console.warn('registerTelegramUserVisit edge:', payload.error, payload.reason ?? '')
  }
}

export const getTelegramUserRole = async (_telegramUserId: number): Promise<AppUserRole | null> => {
  if (!hasSupabaseConfig) return null

  const initData = getTelegramInitData()
  if (!initData) return null

  const { data, error } = await supabase.rpc('get_my_telegram_app_role', {
    p_init_data: initData,
  })

  if (error) {
    if (import.meta.env.DEV) console.warn('getTelegramUserRole:', error.message)
    return null
  }

  if (data == null || data === '') return null
  return normalizeAppUserRole(data)
}

export const updateTelegramUserAdmin = async (
  payload: UpdateTelegramUserAdminPayload
): Promise<void> => {
  if (!hasSupabaseConfig) {
    throw new Error('تنظیمات Supabase یافت نشد')
  }

  const portalToken = readStoredPortalSession()?.token
  if (!portalToken) {
    throw new Error('نشست ورود ادمین یافت نشد')
  }

  const { error } = await supabase.rpc('update_telegram_user_admin', {
    p_portal_token: portalToken,
    p_telegram_user_id: payload.telegram_user_id,
    p_app_role: payload.app_role,
    p_admin_notes: payload.admin_notes ?? null,
    p_username: payload.username ?? null,
    p_email: payload.email ?? null,
    p_password: payload.password ?? null,
    p_portal_login_enabled: payload.portal_login_enabled ?? null,
  })

  if (error) throw new Error(formatSupabaseError(error))
}

export const getTelegramUsersOverview = async (): Promise<TelegramUsersOverview> => {
  if (!hasSupabaseConfig) {
    return { totalUsers: 0, activeLast24h: 0, activeLast7d: 0, premiumUsers: 0, adminUsers: 0 }
  }

  const portalToken = readStoredPortalSession()?.token
  if (!portalToken) {
    throw new Error('نشست ورود ادمین یافت نشد — دوباره وارد شوید')
  }

  const { data, error } = await supabase.rpc('admin_telegram_users_overview', {
    p_portal_token: portalToken,
  })

  if (error) throw new Error(formatSupabaseError(error))

  const row = (data ?? {}) as Record<string, unknown>
  return {
    totalUsers: Number(row.totalUsers) || 0,
    activeLast24h: Number(row.activeLast24h) || 0,
    activeLast7d: Number(row.activeLast7d) || 0,
    premiumUsers: Number(row.premiumUsers) || 0,
    adminUsers: Number(row.adminUsers) || 0,
  }
}

const mapTelegramUserRow = (row: Record<string, unknown>): TelegramUserRow => ({
  telegram_user_id: Number(row.telegram_user_id),
  first_name: String(row.first_name ?? ''),
  last_name: row.last_name != null ? String(row.last_name) : null,
  username: row.username != null ? String(row.username) : null,
  email: row.email != null ? String(row.email) : null,
  language_code: row.language_code != null ? String(row.language_code) : null,
  photo_url: row.photo_url != null ? String(row.photo_url) : null,
  is_premium: Boolean(row.is_premium),
  app_role: normalizeAppUserRole(row.app_role),
  admin_notes: row.admin_notes != null ? String(row.admin_notes) : null,
  portal_login_enabled:
    row.portal_login_enabled === undefined ? true : Boolean(row.portal_login_enabled),
  has_portal_password: Boolean(row.has_portal_password),
  first_seen_at: String(row.first_seen_at ?? ''),
  last_seen_at: String(row.last_seen_at ?? ''),
  visit_count: typeof row.visit_count === 'number' ? row.visit_count : Number(row.visit_count) || 0,
  favorites_count:
    typeof row.favorites_count === 'number'
      ? row.favorites_count
      : Number(row.favorites_count) || 0,
})

export const getTelegramUsers = async (
  params: GetTelegramUsersParams
): Promise<{ items: TelegramUserRow[]; total: number }> => {
  if (!hasSupabaseConfig) return { items: [], total: 0 }

  if (!readStoredPortalSession()?.token) {
    throw new Error('نشست ورود ادمین یافت نشد — دوباره وارد شوید')
  }

  const page = Number.isFinite(params.page) && params.page > 0 ? params.page : 1
  const pageSize = Number.isFinite(params.pageSize) && params.pageSize > 0 ? params.pageSize : 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const sortBy = params.sortBy ?? 'last_seen_at'
  const sortDir = params.sortDir ?? 'desc'
  const ascending = sortDir === 'asc'

  let q = supabase.from('telegram_users_admin').select('*', { count: 'exact' })

  if (params.roleFilter && params.roleFilter !== 'all') {
    q = q.eq('app_role', params.roleFilter)
  }

  if (params.usernameFilter === 'with') {
    q = q.not('username', 'is', null)
  } else if (params.usernameFilter === 'without') {
    q = q.is('username', null)
  }

  const tokens = splitSearchTokens(params.query ?? '')
  for (const token of tokens) {
    const safe = escapeIlikePattern(token)
    const numeric = /^\d+$/.test(token)
    const usernameToken = token.startsWith('@') ? token.slice(1) : token
    const usernameSafe = escapeIlikePattern(usernameToken)

    if (numeric) {
      q = q.or(
        `first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,username.ilike.%${safe}%,telegram_user_id.eq.${token}`
      )
    } else {
      q = q.or(
        `first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,username.ilike.%${usernameSafe}%`
      )
    }
  }

  const { data, error, count } = await q
    .order(sortBy, { ascending, nullsFirst: false })
    .range(from, to)

  if (error) throw new Error(formatSupabaseError(error))

  return {
    items: (data ?? []).map((row) => mapTelegramUserRow(row as Record<string, unknown>)),
    total: count ?? 0,
  }
}

const escapeCsvCell = (value: string | number | boolean | null | undefined): string => {
  const raw = value == null ? '' : String(value)
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
  return raw
}

export const exportTelegramUsersCsv = async (
  params: Omit<GetTelegramUsersParams, 'page' | 'pageSize'>
): Promise<string> => {
  const res = await getTelegramUsers({
    ...params,
    page: 1,
    pageSize: 5000,
  })

  const header = [
    'telegram_user_id',
    'first_name',
    'last_name',
    'username',
    'app_role',
    'is_premium',
    'visit_count',
    'favorites_count',
    'first_seen_at',
    'last_seen_at',
    'language_code',
    'admin_notes',
  ]

  const rows = res.items.map((u) =>
    [
      u.telegram_user_id,
      u.first_name,
      u.last_name,
      u.username,
      u.app_role,
      u.is_premium,
      u.visit_count,
      u.favorites_count,
      u.first_seen_at,
      u.last_seen_at,
      u.language_code,
      u.admin_notes,
    ]
      .map(escapeCsvCell)
      .join(',')
  )

  return `\uFEFF${header.join(',')}\n${rows.join('\n')}`
}
