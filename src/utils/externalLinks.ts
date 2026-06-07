import { buildTelegramStartParam, type AnimeDetailTab } from './telegramStartParam'

export type { AnimeDetailTab }

export const buildMalUrl = (malId: number) => `https://myanimelist.net/anime/${malId}`

export const buildAnilistUrl = (anilistId: number) => `https://anilist.co/anime/${anilistId}`

export const buildImdbUrl = (imdbId: string) =>
  `https://www.imdb.com/title/${encodeURIComponent(imdbId.trim())}/`

export const buildAnimeMiniAppLink = (id: string | number, tab?: AnimeDetailTab) => {
  const bot = String(import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? 'ShioriUploadBot').trim()
  return `https://t.me/${bot}?startapp=${encodeURIComponent(buildTelegramStartParam(id, tab))}`
}

export const parseAnimeDetailTab = (value: string | null): AnimeDetailTab => {
  if (value === 'episodes' || value === 'similar' || value === 'info') return value
  return 'info'
}
