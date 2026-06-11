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

/** لینک مستقیم دانلود فایل در بات (همان key جدول files) */
export const buildTelegramFileDownloadLink = (fileKey: string) => {
  const bot = String(import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? 'ShioriUploadBot').trim()
  const key = String(fileKey ?? '').trim()
  if (!bot || !key) return ''
  return `https://t.me/${bot}?start=get_${key}`
}

/** key فایل از لینک بات (?start=get_...) */
export const parseTelegramFileDownloadLink = (link: string): string | null => {
  const raw = String(link ?? '').trim()
  if (!raw) return null
  const fromUrl = raw.match(/[?&]start=get_([^&]+)/i)?.[1]
  if (fromUrl) {
    try {
      return decodeURIComponent(fromUrl).trim() || null
    } catch {
      return fromUrl.trim() || null
    }
  }
  const bare = raw.match(/^get_(.+)$/i)?.[1]
  if (!bare) return null
  try {
    return decodeURIComponent(bare).trim() || null
  } catch {
    return bare.trim() || null
  }
}

/** لینک پک فایل در بات (slug جدول file_packs) */
export const buildTelegramFilePackLink = (slug: string) => {
  const bot = String(import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? 'ShioriUploadBot').trim()
  const packSlug = String(slug ?? '').trim()
  if (!bot || !packSlug) return ''
  return `https://t.me/${bot}?start=pack_${encodeURIComponent(packSlug)}`
}

/** slug پک از لینک بات (?start=pack_...) */
export const parseTelegramFilePackLink = (link: string): string | null => {
  const raw = String(link ?? '').trim()
  if (!raw) return null
  const fromUrl = raw.match(/[?&]start=pack_([^&]+)/i)?.[1]
  if (fromUrl) {
    try {
      return decodeURIComponent(fromUrl).trim() || null
    } catch {
      return fromUrl.trim() || null
    }
  }
  const bare = raw.match(/^pack_(.+)$/i)?.[1]
  if (!bare) return null
  try {
    return decodeURIComponent(bare).trim() || null
  } catch {
    return bare.trim() || null
  }
}

export const parseAnimeDetailTab = (value: string | null): AnimeDetailTab => {
  if (value === 'episodes' || value === 'similar' || value === 'info') return value
  return 'info'
}
