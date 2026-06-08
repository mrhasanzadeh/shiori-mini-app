import { normalizeAppUserRole, type AppUserRole } from '@/constants/userRoles'
import { hasSupabaseConfig, supabase } from '@/lib/supabase'

const PORTAL_SESSION_KEY = 'admin_portal_session'

export type AdminPortalSession = {
  token: string
  role: AppUserRole
  displayName: string
  expiresAt: string
}

type PortalRpcPayload = {
  ok?: boolean
  error?: string
  token?: string
  role?: string
  display_name?: string
  expires_at?: string
}

const parsePortalSession = (payload: PortalRpcPayload): AdminPortalSession | null => {
  if (!payload.ok) return null

  const token = String(payload.token ?? '').trim()
  const expiresAt = String(payload.expires_at ?? '').trim()
  if (!token || !expiresAt) return null

  const role = normalizeAppUserRole(payload.role)
  if (role !== 'admin' && role !== 'moderator') return null

  return {
    token,
    role,
    displayName: String(payload.display_name ?? '').trim() || 'ادمین',
    expiresAt,
  }
}

export const readStoredPortalSession = (): AdminPortalSession | null => {
  try {
    const raw = localStorage.getItem(PORTAL_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AdminPortalSession
    if (!parsed?.token || !parsed?.expiresAt) return null

    const expiresMs = Date.parse(parsed.expiresAt)
    if (Number.isFinite(expiresMs) && expiresMs <= Date.now()) {
      localStorage.removeItem(PORTAL_SESSION_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export const writeStoredPortalSession = (session: AdminPortalSession): void => {
  localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session))
}

export const clearStoredPortalSession = (): void => {
  try {
    localStorage.removeItem(PORTAL_SESSION_KEY)
    localStorage.removeItem('admin_web_authed')
  } catch {
    // ignore
  }
}

export const loginAdminPortal = async (
  email: string,
  password: string
): Promise<AdminPortalSession> => {
  if (!hasSupabaseConfig) {
    throw new Error('تنظیمات Supabase یافت نشد')
  }

  const { data, error } = await supabase.rpc('admin_portal_login', {
    p_email: email.trim(),
    p_password: password,
  })

  if (error) throw new Error(error.message)

  const session = parsePortalSession((data ?? {}) as PortalRpcPayload)
  if (!session) {
    throw new Error('ایمیل یا رمز عبور اشتباه است')
  }

  writeStoredPortalSession(session)
  return session
}

export const verifyAdminPortalSession = async (
  token: string
): Promise<AdminPortalSession | null> => {
  if (!hasSupabaseConfig || !token.trim()) return null

  const { data, error } = await supabase.rpc('admin_portal_verify_session', {
    p_token: token,
  })

  if (error) {
    if (import.meta.env.DEV) console.warn('verifyAdminPortalSession:', error.message)
    return null
  }

  const session = parsePortalSession((data ?? {}) as PortalRpcPayload)
  if (!session) {
    clearStoredPortalSession()
    return null
  }

  writeStoredPortalSession(session)
  return session
}

export const logoutAdminPortal = async (): Promise<void> => {
  const stored = readStoredPortalSession()
  if (stored?.token && hasSupabaseConfig) {
    await supabase.rpc('admin_portal_logout', { p_token: stored.token })
  }
  clearStoredPortalSession()
}
