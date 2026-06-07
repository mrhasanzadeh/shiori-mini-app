import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'
import { parseTelegramStartParam, telegramStartRouteToHref } from '../utils/telegramStartParam'

const SESSION_KEY = 'shiori_tg_start_param_handled'

/** یک‌بار start_param تلگرام را می‌خواند و به صفحه/تب هدف هدایت می‌کند */
export const useTelegramStartNavigation = (isReady: boolean) => {
  const navigate = useNavigate()
  const handledRef = useRef(false)

  useEffect(() => {
    if (!isReady || handledRef.current) return

    const param = WebApp.initDataUnsafe.start_param?.trim()
    if (!param) return

    const route = parseTelegramStartParam(param)
    if (!route) return

    const sessionToken = `${param}:${route.path}${route.search ?? ''}`
    if (sessionStorage.getItem(SESSION_KEY) === sessionToken) {
      handledRef.current = true
      return
    }

    handledRef.current = true
    sessionStorage.setItem(SESSION_KEY, sessionToken)
    navigate(telegramStartRouteToHref(route), { replace: true })
  }, [isReady, navigate])
}
