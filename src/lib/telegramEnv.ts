import WebApp from '@twa-dev/sdk'

/** True when opened inside Telegram Mini App (signed initData present). */
export const isTelegramMiniApp = (): boolean =>
  String(WebApp.initData ?? '').trim().length > 0
