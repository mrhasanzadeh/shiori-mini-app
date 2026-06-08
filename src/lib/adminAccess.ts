import type { AppUserRole } from '@/constants/userRoles'

export type AdminAccessState = {
  isReady: boolean
  roleLoading: boolean
  dbRole: AppUserRole | null
  /** Can open /admin (admin or moderator) */
  isStaff: boolean
  /** Full admin: users, roles, env allowlist, web login */
  isFullAdmin: boolean
  isModerator: boolean
  /** Admin panel is web-only; blocked inside Telegram Mini App */
  isWebAdminOnly: boolean
  inTelegramMiniApp: boolean
  portalDisplayName: string | null
}

export const ADMIN_LOGIN_PATH = '/admin/login'

export const isAdminRoutePath = (pathname: string): boolean =>
  pathname === '/admin' || pathname.startsWith('/admin/')

export const isAdminLoginPath = (pathname: string): boolean => pathname === ADMIN_LOGIN_PATH

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

export const isWebAdminOnlyMode = (): boolean =>
  String(import.meta.env.VITE_ADMIN_WEB_ONLY ?? '').trim().toLowerCase() === 'true'

export const isWebAdminPasswordEnabled = (): boolean => {
  const webPassword = String(import.meta.env.VITE_ADMIN_WEB_PASSWORD ?? '').trim()
  if (!webPassword) return false
  if (import.meta.env.DEV) return true
  if (isWebAdminOnlyMode()) return true
  return String(import.meta.env.VITE_ADMIN_WEB_AUTH ?? '').trim().toLowerCase() === 'true'
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
  webOnlyMode: boolean
  inTelegramMiniApp: boolean
  portalRole: AppUserRole | null
  portalDisplayName: string | null
}): Pick<
  AdminAccessState,
  | 'dbRole'
  | 'isStaff'
  | 'isFullAdmin'
  | 'isModerator'
  | 'isWebAdminOnly'
  | 'inTelegramMiniApp'
  | 'portalDisplayName'
> => {
  const {
    userId,
    dbRole,
    allowedIds,
    webPasswordEnabled,
    webAuthed,
    webOnlyMode,
    inTelegramMiniApp,
    portalRole,
    portalDisplayName,
  } = params

  const meta = { isWebAdminOnly: webOnlyMode, inTelegramMiniApp, portalDisplayName }

  if (webOnlyMode && inTelegramMiniApp) {
    return {
      dbRole,
      isStaff: false,
      isFullAdmin: false,
      isModerator: false,
      ...meta,
    }
  }

  if (!inTelegramMiniApp && portalRole === 'admin') {
    return {
      dbRole: 'admin',
      isStaff: true,
      isFullAdmin: true,
      isModerator: false,
      portalDisplayName,
      isWebAdminOnly: webOnlyMode,
      inTelegramMiniApp,
    }
  }

  if (!inTelegramMiniApp && portalRole === 'moderator') {
    return {
      dbRole: 'moderator',
      isStaff: true,
      isFullAdmin: false,
      isModerator: true,
      portalDisplayName,
      isWebAdminOnly: webOnlyMode,
      inTelegramMiniApp,
    }
  }

  if (webOnlyMode && !inTelegramMiniApp) {
    const isLegacyWebAdmin = webPasswordEnabled && webAuthed
    return {
      dbRole: null,
      isStaff: isLegacyWebAdmin,
      isFullAdmin: isLegacyWebAdmin,
      isModerator: false,
      ...meta,
    }
  }

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
    ...meta,
  }
}

export const canAccessAdminRoute = (
  access: Pick<AdminAccessState, 'isStaff' | 'isFullAdmin'>,
  requireFullAdmin?: boolean
): boolean => (requireFullAdmin ? access.isFullAdmin : access.isStaff)
