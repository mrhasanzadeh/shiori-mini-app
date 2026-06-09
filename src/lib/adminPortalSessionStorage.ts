import { normalizeAppUserRole, type AppUserRole } from '@/constants/userRoles'

export const PORTAL_SESSION_KEY = 'admin_portal_session'

export type AdminPortalSession = {
  token: string
  role: AppUserRole
  displayName: string
  photoUrl: string | null
  expiresAt: string
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

    const role = normalizeAppUserRole(parsed.role)
    if (role !== 'admin' && role !== 'moderator') return null

    return {
      ...parsed,
      role,
      photoUrl:
        typeof parsed.photoUrl === 'string' && parsed.photoUrl.trim() ? parsed.photoUrl.trim() : null,
    }
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

export const getPortalRequestHeaders = (): Record<string, string> => {
  const token = readStoredPortalSession()?.token?.trim()
  if (!token) return {}
  return { 'x-portal-token': token }
}
