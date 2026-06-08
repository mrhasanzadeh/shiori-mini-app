import type { AppUserRole } from '@/constants/userRoles'

export type AdminAccessState = {
  isReady: boolean
  roleLoading: boolean
  dbRole: AppUserRole | null
  /** Can open /admin (admin or moderator) */
  isStaff: boolean
  /** Full admin: users, roles, env allowlist, dev web login */
  isFullAdmin: boolean
  isModerator: boolean
}

export const parseAdminTelegramIds = (value: unknown): Set<number> => {
  const raw = typeof value === 'string' ? value : ''
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const ids = new Set<number>()
  for (const p of parts) {
    const n = Number(p)
    if (Number.isFinite(n)) ids.add(n)
  }
  return ids
}

export const isWebAdminPasswordEnabled = (): boolean => {
  const webPassword = String(import.meta.env.VITE_ADMIN_WEB_PASSWORD ?? '').trim()
  return import.meta.env.DEV && webPassword.length > 0
}

export const readWebAdminAuthed = (): boolean => {
  try {
    return localStorage.getItem('admin_web_authed') === '1'
  } catch {
    return false
  }
}

export const resolveAdminAccess = (params: {
  userId?: number
  dbRole: AppUserRole | null
  allowedIds: Set<number>
  webPasswordEnabled: boolean
  webAuthed: boolean
}): Pick<AdminAccessState, 'dbRole' | 'isStaff' | 'isFullAdmin' | 'isModerator'> => {
  const { userId, dbRole, allowedIds, webPasswordEnabled, webAuthed } = params

  const isEnvAdmin = typeof userId === 'number' && allowedIds.has(userId)
  const isWebAdmin = !userId && webPasswordEnabled && webAuthed
  const isDbAdmin = dbRole === 'admin'
  const isDbModerator = dbRole === 'moderator'

  const isFullAdmin = isEnvAdmin || isWebAdmin || isDbAdmin
  const isStaff = isFullAdmin || isDbModerator

  return {
    dbRole,
    isStaff,
    isFullAdmin,
    isModerator: isDbModerator && !isFullAdmin,
  }
}

export const canAccessAdminRoute = (
  access: Pick<AdminAccessState, 'isStaff' | 'isFullAdmin'>,
  requireFullAdmin?: boolean
): boolean => (requireFullAdmin ? access.isFullAdmin : access.isStaff)
