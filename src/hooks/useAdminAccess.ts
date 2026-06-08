import { useEffect, useMemo, useState } from 'react'
import { normalizeAppUserRole, type AppUserRole } from '@/constants/userRoles'
import {
  isWebAdminOnlyMode,
  isWebAdminPasswordEnabled,
  parseAdminTelegramIds,
  readWebAdminAuthed,
  resolveAdminAccess,
  type AdminAccessState,
} from '@/lib/adminAccess'
import {
  readStoredPortalSession,
  verifyAdminPortalSession,
  type AdminPortalSession,
} from '@/services/adminPortalAuth'
import { getTelegramUserRole } from '@/services/supabaseUsers'
import { isTelegramMiniApp } from '@/lib/telegramEnv'
import { useTelegramApp } from './useTelegramApp'

export const useAdminAccess = (): AdminAccessState => {
  const { user, isReady } = useTelegramApp()
  const [roleLoading, setRoleLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(true)
  const [dbRole, setDbRole] = useState<AppUserRole | null>(null)
  const [portalSession, setPortalSession] = useState<AdminPortalSession | null>(null)

  const allowedIds = useMemo(
    () => parseAdminTelegramIds(import.meta.env.VITE_ADMIN_TELEGRAM_IDS),
    []
  )
  const webPasswordEnabled = isWebAdminPasswordEnabled()
  const webOnlyMode = isWebAdminOnlyMode()
  const inTelegramMiniApp = isTelegramMiniApp()
  const webAuthed = useMemo(() => readWebAdminAuthed(), [])

  const userId = user?.id

  useEffect(() => {
    if (!isReady) return

    if (inTelegramMiniApp) {
      setPortalSession(null)
      setPortalLoading(false)
      return
    }

    let cancelled = false
    setPortalLoading(true)

    const stored = readStoredPortalSession()
    if (!stored?.token) {
      setPortalSession(null)
      setPortalLoading(false)
      return
    }

    void verifyAdminPortalSession(stored.token)
      .then((session) => {
        if (!cancelled) setPortalSession(session)
      })
      .finally(() => {
        if (!cancelled) setPortalLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isReady, inTelegramMiniApp])

  useEffect(() => {
    if (!isReady) return

    if (webOnlyMode && inTelegramMiniApp) {
      setDbRole(null)
      setRoleLoading(false)
      return
    }

    if (typeof userId !== 'number') {
      setDbRole(null)
      setRoleLoading(false)
      return
    }

    let cancelled = false
    setRoleLoading(true)

    void getTelegramUserRole(userId)
      .then((role) => {
        if (!cancelled) setDbRole(role ? normalizeAppUserRole(role) : null)
      })
      .finally(() => {
        if (!cancelled) setRoleLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isReady, userId, webOnlyMode, inTelegramMiniApp])

  const portalRole =
    portalSession?.role === 'admin' || portalSession?.role === 'moderator'
      ? portalSession.role
      : null

  const resolved = resolveAdminAccess({
    userId,
    dbRole,
    allowedIds,
    webPasswordEnabled,
    webAuthed,
    webOnlyMode,
    inTelegramMiniApp,
    portalRole,
    portalDisplayName: portalSession?.displayName ?? null,
  })

  const accessLoading =
    (!inTelegramMiniApp && portalLoading) || (typeof userId === 'number' && roleLoading)

  return {
    isReady,
    roleLoading: accessLoading,
    ...resolved,
  }
}

/** @deprecated Prefer useAdminAccess().isFullAdmin */
export const useIsAdmin = () => {
  const access = useAdminAccess()
  return {
    isReady: access.isReady,
    isAdmin: access.isFullAdmin,
    isStaff: access.isStaff,
    isModerator: access.isModerator,
  }
}
