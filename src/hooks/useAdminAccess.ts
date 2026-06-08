import { useEffect, useMemo, useState } from 'react'
import { normalizeAppUserRole, type AppUserRole } from '@/constants/userRoles'
import {
  isWebAdminPasswordEnabled,
  parseAdminTelegramIds,
  readWebAdminAuthed,
  resolveAdminAccess,
  type AdminAccessState,
} from '@/lib/adminAccess'
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
  const webAuthed = useMemo(() => readWebAdminAuthed(), [])

  const userId = user?.id

  useEffect(() => {
    if (!isReady) return

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
  }, [isReady, userId])

  const resolved = resolveAdminAccess({
    userId,
    dbRole,
    allowedIds,
    webPasswordEnabled,
    webAuthed,
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
