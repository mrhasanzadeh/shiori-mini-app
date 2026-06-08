import { useEffect, useRef } from 'react'
import { useTelegramApp } from './useTelegramApp'
import { registerTelegramUserVisit } from '../services/supabaseUsers'

/** ثبت ورود کاربر به مینی‌اپ (یک بار در هر session) */
export const useTelegramUserSync = (enabled: boolean) => {
  const { user } = useTelegramApp()
  const syncedRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled || typeof user?.id !== 'number') return
    if (syncedRef.current === user.id) return

    syncedRef.current = user.id
    void registerTelegramUserVisit(user)
  }, [enabled, user])
}
