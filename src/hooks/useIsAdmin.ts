import { useMemo } from 'react'
import { useTelegramApp } from './useTelegramApp'

const parseAllowedIds = (value: unknown): Set<number> => {
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

export const useIsAdmin = () => {
  const { user, isReady } = useTelegramApp()

  const allowedIds = useMemo(
    () => parseAllowedIds(import.meta.env.VITE_ADMIN_TELEGRAM_IDS),
    []
  )

  const webPassword = String(import.meta.env.VITE_ADMIN_WEB_PASSWORD ?? '').trim()
  const webAuthed = useMemo(() => {
    try {
      return localStorage.getItem('admin_web_authed') === '1'
    } catch {
      return false
    }
  }, [])

  const userId = user?.id
  const isAllowedTelegram = typeof userId === 'number' && allowedIds.has(userId)
  const isAllowedWeb = !userId && webPassword.length > 0 && webAuthed

  return {
    isReady,
    isAdmin: isAllowedTelegram || isAllowedWeb,
  }
}
