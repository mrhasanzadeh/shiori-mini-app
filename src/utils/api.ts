// App-level API wrapper
import * as catalog from '../services/catalogSource'
import * as shiori from '../services/shioriCatalog'
import { deriveAnimeSlug } from '../lib/animePaths'
import { resolveCatalogAnimeRecordId } from '../lib/resolveCatalogAnimeId'

// Lightweight card shape used across Home/Search UIs
export type UiAnimeCard = {
  id: number | string
  slug?: string | null
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
  genres?: catalog.GenreItem[]
}

export type UiStudioLink = {
  slug: string
  name: string
}

import type { AnimeListItem } from '../store/animeStore'

const toGenreItem = (g: any): catalog.GenreItem | null => {
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
  slug: deriveAnimeSlug(c),
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

let allAnimeRawCache: { data: Awaited<ReturnType<typeof catalog.getAllAnime>>; ts: number } | null =
  null
const ALL_ANIME_CACHE_TTL_MS = 5 * 60 * 1000

const getAllAnimeCached = async () => {
  if (allAnimeRawCache && Date.now() - allAnimeRawCache.ts < ALL_ANIME_CACHE_TTL_MS) {
    return allAnimeRawCache.data
  }
  const data = await catalog.getAllAnime()
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
  if (section === 'latest') {
    const allowed = new Set(['TV', 'ONA', 'OVA', 'SPECIAL'])
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
  const result = await catalog.searchAnimeCards(filters)
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
  const recordId = await resolveCatalogAnimeRecordId(animeId)
  const list = await catalog.getSimilarAnimeCards(recordId, genreSlugs, limit)
  return list.map(toCacheAnime)
}

// دریافت جزئیات یک انیمه + لیست قسمت‌ها
export const fetchAnimeById = async (
  idOrSlug: number | string,
  options?: { includeSeries?: boolean }
) => {
  const includeSeries = options?.includeSeries !== false
  const id = await resolveCatalogAnimeRecordId(idOrSlug)
  const detail = await shiori.getAnimeDetailById(id)
  const parts = shiori.mapShioriDetailParts(detail)

  const subtitleMap = new Map<number, string>()
  for (const s of detail.subtitles ?? []) {
    const ep = typeof s.episode_number === 'number' ? s.episode_number : 0
    const link = s.subtitle_link
    if (typeof link === 'string' && link.trim()) subtitleMap.set(ep, link.trim())
  }

  const mergedEpisodes = parts.episodes.map((e) => {
    const subtitle_link = subtitleMap.get(e.number)
    return {
      ...e,
      subtitle_link: subtitle_link ?? undefined,
    }
  })

  const studioLinks: UiStudioLink[] = parts.studioLinks.map((s) => ({
    slug: s.slug,
    name: s.name,
  }))

  return {
    id: detail.id,
    slug: deriveAnimeSlug({ slug: detail.slug, title: detail.title }),
    title: detail.title,
    title_romaji: detail.title_romaji ?? null,
    image: detail.image,
    featured_image: detail.featuredImage ?? detail.image,
    format: detail.format ?? undefined,
    description: detail.description,
    status: detail.status,
    airing_status: detail.airing_status ?? undefined,
    genres: detail.genres,
    episodes: mergedEpisodes,
    subtitles: (detail.subtitles ?? []).map((s) => ({
      subtitle_link: s.subtitle_link ?? undefined,
    })),
    subtitle_packs: parts.subtitlePacks,
    episode_pack: parts.episodePack,
    episodes_count: typeof detail.episodes_count === 'number' ? detail.episodes_count : 0,
    averageScore: detail.averageScore,
    malScore: detail.malScore,
    imdbScore: detail.imdbScore,
    shioriScore: detail.shioriScore,
    anilist_id: detail.anilist_id,
    mal_id: detail.mal_id,
    imdb_id: detail.imdb_id,
    studios: parts.studioNames,
    studio_links: studioLinks,
    producers: [],
    season: detail.season ?? '',
    year: typeof detail.year === 'number' ? detail.year : undefined,
    startDate: detail.startDate ?? '',
    endDate: detail.endDate ?? '',
    series: includeSeries ? parts.series : null,
  }
}

export type AnimeDetail = Awaited<ReturnType<typeof fetchAnimeById>>

export type AnimeDetailShell = AnimeDetail & { __shell: true }

export const isAnimeDetailShell = (data: unknown): data is AnimeDetailShell =>
  Boolean(
    data &&
      typeof data === 'object' &&
      '__shell' in data &&
      (data as { __shell?: boolean }).__shell === true
  )

/** اسکلت فوری از کش کارت‌ها — قبل از fetch کامل جزئیات */
export const buildAnimeDetailPlaceholder = (card: UiAnimeCard): AnimeDetailShell => ({
  id: String(card.id),
  slug: card.slug ?? null,
  title: card.title,
  title_romaji: null,
  image: card.image,
  featured_image: card.featuredImage ?? card.image,
  format: card.format,
  description: card.description ?? '',
  status: 'RELEASING',
  airing_status: undefined,
  genres: card.genres ?? [],
  episodes: [],
  subtitles: [],
  subtitle_packs: [],
  episode_pack: null,
  episodes_count: 0,
  averageScore: undefined,
  malScore: undefined,
  imdbScore: undefined,
  shioriScore: undefined,
  anilist_id: undefined,
  mal_id: undefined,
  imdb_id: undefined,
  studios: [],
  studio_links: [],
  producers: [],
  season: card.season ?? '',
  year: typeof card.year === 'number' ? card.year : undefined,
  startDate: '',
  endDate: '',
  series: null,
  __shell: true,
})

export const fetchAnimeByStudioSlug = async (slug: string): Promise<UiAnimeCard[]> => {
  const list = await catalog.getAnimeCardsByStudioSlug(slug)
  return list.map(toCacheAnime)
}

type ScheduleAnimeItem = {
  id: number
  title: string
  time: string
  episode: string
  image: string
  genres?: { slug: string; name_en?: string }[]
  localId?: string | number | null
}

type SchedulePayload = {
  schedule: Record<string, ScheduleAnimeItem[]>
  currentSeason: string
  currentYear: number
}

const enrichScheduleWithLocalIds = async (payload: SchedulePayload): Promise<SchedulePayload> => {
  const anilistIds = Object.values(payload.schedule)
    .flat()
    .map((item) => item.id)
  const localMap = await catalog.getLocalAnimeIdsByAniListIds(anilistIds)

  const schedule: Record<string, ScheduleAnimeItem[]> = {}
  for (const [day, list] of Object.entries(payload.schedule)) {
    schedule[day] = list.map((anime) => ({
      ...anime,
      localId: localMap.get(anime.id) ?? null,
    }))
  }

  return { ...payload, schedule }
}

export const fetchSchedule = async () => {
  const cacheKey = 'anilist_schedule_v1'
  const cacheTtlMs = 10 * 60 * 1000

  const emptySchedule: Record<string, ScheduleAnimeItem[]> = {
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
        return enrichScheduleWithLocalIds(parsed.data as SchedulePayload)
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

  const data: SchedulePayload = { schedule, currentSeason, currentYear }
  const enriched = await enrichScheduleWithLocalIds(data)
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: enriched }))
  } catch {
    // ignore
  }

  return enriched
}
