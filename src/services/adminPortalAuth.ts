import { normalizeAppUserRole } from '@/constants/userRoles'
import { hasSupabaseConfig, supabase } from '@/lib/supabase'
import {
  clearStoredPortalSession,
  readStoredPortalSession,
  writeStoredPortalSession,
  type AdminPortalSession,
} from '@/lib/adminPortalSessionStorage'

export type { AdminPortalSession }

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

export {
  clearStoredPortalSession,
  getPortalRequestHeaders,
  readStoredPortalSession,
  writeStoredPortalSession,
} from '@/lib/adminPortalSessionStorage'

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
