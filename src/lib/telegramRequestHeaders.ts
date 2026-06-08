import WebApp from '@twa-dev/sdk'

/** Raw signed initData from Telegram WebApp (empty outside Mini App). */
export const getTelegramInitData = (): string => String(WebApp.initData ?? '').trim()

export const getTelegramRequestHeaders = (): Record<string, string> => {
  const initData = getTelegramInitData()
  if (!initData) return {}
  return { 'x-telegram-init-data': initData }
}
