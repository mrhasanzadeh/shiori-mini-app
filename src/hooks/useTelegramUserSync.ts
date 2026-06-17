import { useEffect, useRef } from 'react'
import { isTelegramMiniApp } from '../lib/platform'
import { useTelegramApp } from './useTelegramApp'
import { registerTelegramUserVisit } from '../services/userDataSource'

/** ثبت ورود کاربر به مینی‌اپ (یک بار در هر session) — فقط داخل Telegram */
export const useTelegramUserSync = (enabled: boolean) => {
  const inTelegram = isTelegramMiniApp()
  const { user } = useTelegramApp()
  const syncedRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled || !inTelegram || typeof user?.id !== 'number') return
    if (syncedRef.current === user.id) return

    syncedRef.current = user.id
    void registerTelegramUserVisit(user)
  }, [enabled, inTelegram, user])
}
