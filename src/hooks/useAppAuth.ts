import { useCallback, useEffect, useMemo, useState } from 'react'
import { isTelegramMiniApp } from '../lib/platform'
import {
  clearStoredAppSession,
  readStoredAppSession,
  type AppSession,
} from '../lib/appSessionStorage'
import { isShioriApiEnabled } from '../lib/shioriApi'
import {
  loginAppUser,
  logoutAppUser,
  registerAppUser,
  verifyAppSession,
} from '../services/shioriAppAuth'
import { useTelegramApp } from './useTelegramApp'

export type AppAuthUser = {
  id: number
  displayName: string
  email?: string | null
  username?: string | null
  photoUrl?: string | null
  isPremium?: boolean
  source: 'telegram' | 'web'
  canLinkTelegram?: boolean
}

export const useAppAuth = () => {
  const inTelegram = isTelegramMiniApp()
  const telegram = useTelegramApp()
  const [webSession, setWebSession] = useState<AppSession | null>(() =>
    inTelegram ? null : readStoredAppSession()
  )
  const [webReady, setWebReady] = useState(inTelegram)

  useEffect(() => {
    if (inTelegram) return

    let cancelled = false

    const boot = async () => {
      if (!isShioriApiEnabled()) {
        if (!cancelled) setWebReady(true)
        return
      }

      const stored = readStoredAppSession()
      if (!stored) {
        if (!cancelled) {
          setWebSession(null)
          setWebReady(true)
        }
        return
      }

      const verified = await verifyAppSession()
      if (!cancelled) {
        setWebSession(verified)
        setWebReady(true)
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [inTelegram])

  const user = useMemo<AppAuthUser | null>(() => {
    if (inTelegram && telegram.user) {
      const parts = [telegram.user.first_name, telegram.user.last_name].filter(Boolean)
      return {
        id: telegram.user.id,
        displayName: parts.join(' ').trim() || 'کاربر',
        username: telegram.user.username ?? null,
        photoUrl: telegram.user.photo_url ?? null,
        isPremium: telegram.user.is_premium,
        source: 'telegram',
      }
    }

    if (!inTelegram && webSession) {
      return {
        id: webSession.userId,
        displayName: webSession.displayName,
        email: webSession.email,
        source: 'web',
        canLinkTelegram: webSession.canLinkTelegram ?? webSession.userId < 0,
      }
    }

    return null
  }, [inTelegram, telegram.user, webSession])

  const login = useCallback(async (email: string, password: string) => {
    const session = await loginAppUser(email, password)
    setWebSession(session)
    return session
  }, [])

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const session = await registerAppUser(email, password, displayName)
      setWebSession(session)
      return session
    },
    []
  )

  const logout = useCallback(async () => {
    await logoutAppUser()
    setWebSession(null)
    clearStoredAppSession()
  }, [])

  return {
    user,
    isAuthenticated: Boolean(user),
    isReady: inTelegram ? telegram.isReady : webReady,
    inTelegram,
    platform: inTelegram ? ('telegram' as const) : ('web' as const),
    login,
    register,
    logout,
    showAlert: telegram.showAlert,
    showConfirm: telegram.showConfirm,
    openLink: telegram.openLink,
    shareUrl: telegram.shareUrl,
  }
}
