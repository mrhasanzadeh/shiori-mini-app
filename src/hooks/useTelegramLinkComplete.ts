import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'
import { isTelegramMiniApp } from '../lib/platform'
import { completeTelegramAccountLink } from '../services/shioriAppAuth'
import { parseTelegramLinkToken } from '../utils/telegramStartParam'

const SESSION_KEY = 'shiori_tg_link_token_handled'

/** تکمیل اتصال حساب وب وقتی کاربر از لینک startapp وارد مینی‌اپ می‌شود */
export const useTelegramLinkComplete = (enabled: boolean) => {
  const inTelegram = isTelegramMiniApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const handledRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !inTelegram) return

    const fromQuery = searchParams.get('linkToken')?.trim()
    const fromStart = parseTelegramLinkToken(
      WebApp.initDataUnsafe.start_param?.trim() ?? ''
    )
    const token = fromQuery || fromStart
    if (!token) return
    if (handledRef.current === token) return
    if (sessionStorage.getItem(SESSION_KEY) === token) return

    handledRef.current = token
    sessionStorage.setItem(SESSION_KEY, token)

    void (async () => {
      try {
        await completeTelegramAccountLink(token)
        WebApp.showAlert('حساب وب با Telegram ادغام شد. لیست و اعلان‌ها یکی شدند.')
      } catch (e) {
        const message = e instanceof Error ? e.message : 'خطا در اتصال حساب'
        WebApp.showAlert(message.replace(/^API \d+: /, '').replace(/^"|"$/g, ''))
      } finally {
        if (fromQuery) {
          const next = new URLSearchParams(searchParams)
          next.delete('linkToken')
          setSearchParams(next, { replace: true })
        }
      }
    })()
  }, [enabled, inTelegram, searchParams, setSearchParams])
}
