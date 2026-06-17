export type AnimeDetailTab = 'info' | 'episodes' | 'similar'

export type TelegramStartRoute = {
  path: string
  search?: string
}

const parseTab = (value?: string | null): AnimeDetailTab => {
  if (value === 'episodes' || value === 'similar' || value === 'info') return value
  return 'info'
}

/** پارامتر startapp/start_param — هم‌خوان با buildAnimeMiniAppLink */
export const buildTelegramStartParam = (id: string | number, tab?: AnimeDetailTab) =>
  tab && tab !== 'info' ? `anime_${id}_${tab}` : `anime_${id}`

export const buildTelegramLinkStartParam = (token: string) => `link_${token}`

export const parseTelegramLinkToken = (raw: string): string | null => {
  const param = decodeURIComponent(String(raw ?? '').trim())
  if (!param.startsWith('link_')) return null
  const token = param.slice(5).trim()
  return token || null
}

/** تبدیل start_param تلگرام به مسیر React Router */
export const parseTelegramStartParam = (raw: string): TelegramStartRoute | null => {
  const param = decodeURIComponent(String(raw ?? '').trim())
  if (!param) return null

  const linkToken = parseTelegramLinkToken(param)
  if (linkToken) {
    return {
      path: '/profile',
      search: `?linkToken=${encodeURIComponent(linkToken)}`,
    }
  }

  const match = param.match(/^anime_([^_]+)(?:_(info|episodes|similar))?$/)
  if (!match) return null

  const id = match[1]?.trim()
  if (!id) return null

  const tab = parseTab(match[2] ?? null)
  const path = `/anime/${encodeURIComponent(id)}`

  if (tab !== 'info') return { path, search: `?tab=${tab}` }
  return { path }
}

export const telegramStartRouteToHref = (route: TelegramStartRoute) =>
  `${route.path}${route.search ?? ''}`
