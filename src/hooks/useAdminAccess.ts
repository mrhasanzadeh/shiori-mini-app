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
import { isTelegramMiniApp } from '@/lib/telegramEnv'
import { getTelegramUserRole } from '@/services/supabaseUsers'
import { useTelegramApp } from './useTelegramApp'

export const useAdminAccess = (): AdminAccessState => {
  const { user, isReady } = useTelegramApp()
  const [roleLoading, setRoleLoading] = useState(true)
  const [dbRole, setDbRole] = useState<AppUserRole | null>(null)

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

  const resolved = resolveAdminAccess({
    userId,
    dbRole,
    allowedIds,
    webPasswordEnabled,
    webAuthed,
    webOnlyMode,
    inTelegramMiniApp,
  })

  return {
    isReady,
    roleLoading: typeof userId === 'number' ? roleLoading : false,
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
