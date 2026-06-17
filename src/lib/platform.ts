import WebApp from '@twa-dev/sdk'

/** True when running inside Telegram with signed initData. */
export const isTelegramMiniApp = (): boolean => {
  if (typeof window === 'undefined') return false

  const initData = String(WebApp.initData ?? '').trim()
  if (initData.length > 0) return true

  const platform = String(WebApp.platform ?? '').toLowerCase()
  return platform !== 'unknown' && platform !== '' && platform !== 'web'
}

export type AppPlatform = 'telegram' | 'web'

export const getAppPlatform = (): AppPlatform =>
  isTelegramMiniApp() ? 'telegram' : 'web'
