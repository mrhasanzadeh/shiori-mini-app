// App-level API wrapper
import * as supa from '../services/supabaseAnime'

// Lightweight card shape used across Home/Search UIs
export type UiAnimeCard = {
  id: number | string
  title: string
  image: string
  featuredImage?: string
  episode: string
  format?: string
  season?: string
  year?: number
  isNew?: boolean
  isFeatured?: boolean
  description?: string
  genres?: supa.GenreItem[]
}

export type UiStudioLink = {
  slug: string
  name: string
}

import type { AnimeListItem } from '../store/animeStore'

const toGenreItem = (g: any): supa.GenreItem | null => {
  if (!g) return null
  if (typeof g === 'string') {
    const slug = g.trim().toLowerCase()
    if (!slug) return null
    return { slug, name_en: g }
  }
  if (typeof g === 'object') {
    const slug = typeof g.slug === 'string' ? g.slug.trim().toLowerCase() : ''
    if (!slug) return null
    return {
      slug,
      name_en: typeof g.name_en === 'string' ? g.name_en : undefined,
      name_fa: typeof g.name_fa === 'string' ? g.name_fa : undefined,
    }
  }
  return null
}

const toCacheAnime = (c: any): UiAnimeCard => ({
  id: c.id,
  title: c.title,
  image: c.image,
  featuredImage: c.featuredImage ?? undefined,
  episode: c.episode ?? 'قسمت ۱',
  format: c.format ?? undefined,
  season: c.season ?? undefined,
  year: typeof c.year === 'number' ? c.year : undefined,
  isNew: Boolean(c.isNew || c.is_new),
  isFeatured:
    typeof c.isFeatured === 'boolean'
      ? c.isFeatured
      : typeof c.is_featured === 'boolean'
        ? c.is_featured
        : undefined,
  description: c.description ?? '',
  genres: Array.isArray(c.genres)
    ? c.genres
        .map(toGenreItem)
        .filter((v: any) => v && typeof v.slug === 'string' && v.slug.trim().length > 0)
    : [],
})

const toListItem = (c: any): AnimeListItem => ({
  id: c.id,
  title: c.title,
  image: c.image,
  description: c.description ?? '',
  status: c.status ?? 'RELEASING',
  genres: Array.isArray(c.genres) ? c.genres : [],
  episodes: typeof c.episodes_count === 'number' ? c.episodes_count : 1,
  isNew: Boolean(c.isNew || c.is_new),
  episode: c.episode ?? 'قسمت ۱',
})

// Returns items shaped for AnimeList store (AnimeListItem[])
export const normalizeAnimeFormat = (f: unknown) =>
  String(f ?? '')
    .trim()
    .toUpperCase()

let allAnimeRawCache: { data: Awaited<ReturnType<typeof supa.getAllAnime>>; ts: number } | null =
  null
const ALL_ANIME_CACHE_TTL_MS = 5 * 60 * 1000

const getAllAnimeCached = async () => {
  if (allAnimeRawCache && Date.now() - allAnimeRawCache.ts < ALL_ANIME_CACHE_TTL_MS) {
    return allAnimeRawCache.data
  }
  const data = await supa.getAllAnime()
  allAnimeRawCache = { data, ts: Date.now() }
  return data
}

/** پاک کردن cache (مثلاً بعد از edit در پنل ادمین) */
export const invalidateAnimeCache = () => {
  allAnimeRawCache = null
}

export const fetchAllAnimeCards = async (): Promise<UiAnimeCard[]> => {
  const data = await getAllAnimeCached()
  return data.map(toCacheAnime)
}

export const filterAnimeCardsBySection = (
  mapped: UiAnimeCard[],
  section?: string
): UiAnimeCard[] => {
  if (section === 'movies') {
    return mapped.filter((a) => normalizeAnimeFormat(a.format) === 'MOVIE')
  }
  if (section === 'donghua') {
    return mapped.filter((a) => normalizeAnimeFormat(a.format) === 'ONA (CHINESE)')
  }
  if (section === 'popular') {
    const allowed = new Set(['TV', 'ONA', 'SPECIAL', 'MOVIE'])
    return mapped.filter((a) => allowed.has(normalizeAnimeFormat(a.format)))
  }
  return mapped
}

export const fetchAnimeList = async (_section?: string): Promise<AnimeListItem[]> => {
  const data = await getAllAnimeCached()
  return data.map(toListItem)
}

// Returns items shaped for cache cards on Home/Search (UiAnimeCard[])
export const fetchAnimeCards = async (_section?: string): Promise<UiAnimeCard[]> => {
  const mapped = await fetchAllAnimeCards()
  return filterAnimeCardsBySection(mapped, _section)
}

export type AnimeSearchFilters = {
  query?: string
  year?: number | null
  season?: string | null
  genreSlug?: string | null
  limit?: number
  offset?: number
}

export const fetchAnimeSearch = async (
  filters: AnimeSearchFilters = {}
): Promise<{ items: UiAnimeCard[]; total: number; hasMore: boolean }> => {
  const result = await supa.searchAnimeCards(filters)
  return {
    items: result.items.map(toCacheAnime),
    total: result.total,
    hasMore: result.hasMore,
  }
}

export const fetchSimilarAnime = async (
  animeId: number | string,
  genreSlugs: string[],
  limit = 12
): Promise<UiAnimeCard[]> => {
  const list = await supa.getSimilarAnimeCards(animeId, genreSlugs, limit)
  return list.map(toCacheAnime)
}

// دریافت جزئیات یک انیمه + لیست قسمت‌ها از جدول episodes (با لینک دانلود هر قسمت)
export const fetchAnimeById = async (id: number | string) => {
  const allAnime = await getAllAnimeCached()
  const anime = allAnime.find((a) => String(a.id) === String(id))

  if (!anime) {
    throw new Error(`Anime with id ${id} not found`)
  }

  const externalMeta = await supa.getAnimeExternalMetaById(anime.id)

  // لیست قسمت‌ها فقط از جدول episodes خوانده می‌شود
  const episodesList = await supa.getEpisodesByAnimeId(anime.id)
  const subtitlesList = await supa.getSubtitlesByAnimeId(anime.id)
  const subtitlePacksList = await supa.getSubtitlePacksByAnimeId(anime.id)

  let studioNames: string[] = []
  try {
    studioNames = await supa.getAnimeStudioNames(anime.id)
  } catch {
    studioNames = []
  }

  let studioLinks: UiStudioLink[] = []
  try {
    const links = await supa.getAnimeStudiosPublic(anime.id)
    studioLinks = (links || []).map((s) => ({ slug: s.slug, name: s.name }))
  } catch {
    studioLinks = []
  }

  if (import.meta.env.DEV && subtitlesList.length === 0) {
    console.warn(
      '[fetchAnimeById] subtitlesList خالی برگشت. اگر در جدول subtitles داده دارید، احتمالاً RLS/Policy جلوی SELECT را گرفته. برای تست می‌توانید روی جدول subtitles یک policy خواندن عمومی مثل episodes بگذارید.'
    )
  }

  const subtitleMap = new Map<number, string>()
  for (const s of subtitlesList) {
    const ep = typeof s.episode_number === 'number' ? s.episode_number : 0
    const link = s.subtitle_link
    if (typeof link === 'string' && link.trim().length > 0) {
      subtitleMap.set(ep, link)
    }
  }

  let matchedSubtitleCount = 0

  const mergedEpisodes = episodesList.map((e: any) => {
    const ep = typeof e.number === 'number' ? e.number : 0
    const subtitle_link = subtitleMap.get(ep)
    if (subtitle_link) matchedSubtitleCount += 1
    return {
      ...e,
      subtitle_link: subtitle_link ?? undefined,
    }
  })

  if (import.meta.env.DEV && subtitlesList.length > 0 && matchedSubtitleCount === 0) {
    console.warn(
      '[fetchAnimeById] subtitle rows وجود دارد اما هیچکدام با episodes match نشد. episode_number را در subtitles و episodes برای همین anime چک کنید.'
    )
  }

  return {
    id: anime.id,
    title: anime.title,
    image: anime.image,
    featured_image: anime.featuredImage,
    format: anime.format ?? undefined,
    description: anime.description,
    status: anime.status,
    airing_status: anime.airing_status ?? undefined,
    genres: anime.genres,
    episodes: mergedEpisodes,
    subtitle_packs: subtitlePacksList,
    episodes_count: typeof anime.episodes_count === 'number' ? anime.episodes_count : 0,
    averageScore: externalMeta.averageScore ?? anime.averageScore,
    malScore: externalMeta.malScore ?? anime.malScore,
    imdbScore: externalMeta.imdbScore ?? anime.imdbScore,
    shioriScore: externalMeta.shioriScore,
    anilist_id: externalMeta.anilist_id ?? anime.anilist_id,
    mal_id: externalMeta.mal_id ?? anime.mal_id,
    imdb_id: externalMeta.imdb_id ?? anime.imdb_id,
    studios: studioNames.length > 0 ? studioNames : anime.studio ? [anime.studio] : [],
    studio_links: studioLinks,
    producers: [],
    season: anime.season ?? '',
    year: typeof anime.year === 'number' ? anime.year : undefined,
    startDate: anime.startDate ?? '',
    endDate: anime.endDate ?? '',
  }
}

export const fetchAnimeByStudioSlug = async (slug: string): Promise<UiAnimeCard[]> => {
  const list = await supa.getAnimeCardsByStudioSlug(slug)
  return list.map(toCacheAnime)
}

export const fetchSchedule = async () => {
  const cacheKey = 'anilist_schedule_v1'
  const cacheTtlMs = 10 * 60 * 1000

  const emptySchedule: Record<
    string,
    Array<{
      id: number
      title: string
      time: string
      episode: string
      image: string
      genres?: any[]
    }>
  > = {
    شنبه: [],
    یکشنبه: [],
    دوشنبه: [],
    سه‌شنبه: [],
    چهارشنبه: [],
    پنج‌شنبه: [],
    جمعه: [],
  }

  const getCurrentSeason = (): 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' => {
    const m = new Date().getMonth() + 1
    if (m >= 1 && m <= 3) return 'WINTER'
    if (m >= 4 && m <= 6) return 'SPRING'
    if (m >= 7 && m <= 9) return 'SUMMER'
    return 'FALL'
  }

  const currentSeason = getCurrentSeason()
  const currentYear = new Date().getFullYear()

  try {
    const raw = sessionStorage.getItem(cacheKey)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.ts === 'number' &&
        Date.now() - parsed.ts < cacheTtlMs &&
        parsed.data &&
        typeof parsed.data === 'object'
      ) {
        return parsed.data
      }
    }
  } catch {
    // ignore
  }

  const query = `
    query ($page: Int, $perPage: Int, $season: MediaSeason, $seasonYear: Int) {
      Page(page: $page, perPage: $perPage) {
        media(
          season: $season
          seasonYear: $seasonYear
          status: RELEASING
          type: ANIME
          sort: POPULARITY_DESC
        ) {
          id
          format
          title { romaji english native }
          coverImage { large }
          genres
          nextAiringEpisode { airingAt episode }
        }
      }
    }
  `

  const variables = {
    page: 1,
    perPage: 50,
    season: currentSeason,
    seasonYear: currentYear,
  }

  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`AniList request failed: ${res.status} ${text}`)
  }

  const json = await res.json()
  if (json?.errors?.length) {
    throw new Error(json.errors?.[0]?.message || 'AniList query error')
  }

  const mediaList: any[] = json?.data?.Page?.media ?? []
  const schedule: Record<string, any[]> = { ...emptySchedule }

  const toPersianDay = (d: Date): string => {
    const dayNumber = d.getDay()
    const dayMap: Record<number, string> = {
      0: 'یکشنبه',
      1: 'دوشنبه',
      2: 'سه‌شنبه',
      3: 'چهارشنبه',
      4: 'پنج‌شنبه',
      5: 'جمعه',
      6: 'شنبه',
    }
    return dayMap[dayNumber]
  }

  for (const m of mediaList) {
    const allowedFormats = new Set(['TV', 'ONA', 'OVA', 'SPECIAL'])
    const format = typeof m?.format === 'string' ? m.format.trim().toUpperCase() : ''
    if (!allowedFormats.has(format)) continue

    const ep = m?.nextAiringEpisode
    if (!ep || typeof ep.airingAt !== 'number') continue

    const airingAtMs = ep.airingAt * 1000
    if (!Number.isFinite(airingAtMs)) continue

    const d = new Date(airingAtMs)
    const day = toPersianDay(d)
    if (!schedule[day]) continue

    const title =
      (typeof m?.title?.english === 'string' && m.title.english.trim()) ||
      (typeof m?.title?.romaji === 'string' && m.title.romaji.trim()) ||
      (typeof m?.title?.native === 'string' && m.title.native.trim()) ||
      'بدون عنوان'

    const time = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })

    schedule[day].push({
      id: m.id,
      title,
      time,
      episode: String(ep.episode ?? ''),
      image: m?.coverImage?.large ?? '',
      genres: Array.isArray(m?.genres)
        ? m.genres
            .filter((g: any) => typeof g === 'string' && g.trim().length > 0)
            .map((g: string) => ({ slug: g.trim().toLowerCase(), name_en: g }))
        : [],
    })
  }

  for (const day of Object.keys(schedule)) {
    schedule[day].sort((a: any, b: any) =>
      String(a?.time ?? '').localeCompare(String(b?.time ?? ''))
    )
  }

  const data = { schedule, currentSeason, currentYear }
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }))
  } catch {
    // ignore
  }

  return data
}
