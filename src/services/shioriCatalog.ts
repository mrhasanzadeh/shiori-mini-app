import { shioriFetch } from '../lib/shioriApi'
import type {
  AnimeCard,
  AnimeSearchParams,
  AnimeSearchResult,
  EpisodeItem,
  GenreAdminItem,
  StudioPublicItem,
  SubtitlePackItem,
  TranslatorAnimeLink,
  TranslatorItem,
} from '../types/catalog'

type ApiGenre = { slug: string; name_en?: string; name_fa?: string }

type ApiCard = {
  id: string
  slug?: string | null
  title: string
  title_romaji?: string | null
  image: string
  featuredImage?: string
  description: string
  format?: string
  status: string
  airing_status?: string
  genres: ApiGenre[]
  episodes_count?: number
  studio?: string
  season?: string
  year?: number
  startDate?: string
  endDate?: string
  isFeatured?: boolean
  averageScore?: number
  malScore?: number
  imdbScore?: number
  shioriScore?: number
  anilist_id?: number
  mal_id?: number
  imdb_id?: string
  favoriteCount?: number
}

type ApiDetail = ApiCard & {
  episode_pack_title?: string | null
  episode_pack_link?: string | null
  episodes?: Array<{
    id: string
    episode_number: number
    title?: string | null
    download_link?: string | null
  }>
  subtitles?: Array<{
    id: string
    episode_number: number
    title?: string | null
    subtitle_link?: string | null
  }>
  subtitle_packs?: Array<{
    id: string
    title?: string | null
    subtitle_link?: string | null
  }>
  translators?: Array<{
    id: string
    anime_id: string
    translator_id: string
    role?: string | null
    translator: {
      id: string
      slug: string
      name: string
      avatar_url?: string | null
      cover_url?: string | null
      bio?: string | null
      experience?: string | null
      is_active?: boolean
    }
  }>
  studio_links?: Array<{ slug: string; name: string }>
  series?: {
    series_id: string
    title: string
    members: Array<{
      id: string
      slug?: string | null
      title: string
      image: string
      sort_order: number
      label_fa: string | null
    }>
  } | null
}

const toCard = (row: ApiCard): AnimeCard => ({
  id: row.id,
  slug: row.slug ?? null,
  title: row.title || 'بدون عنوان',
  title_romaji: row.title_romaji ?? null,
  image: row.image,
  featuredImage: row.featuredImage ?? row.image,
  description: row.description ?? '',
  format: row.format,
  status: row.status ?? row.airing_status ?? 'RELEASING',
  airing_status: row.airing_status ?? row.status,
  genres: (row.genres ?? []).map((g) => ({
    slug: g.slug,
    name_en: g.name_en,
    name_fa: g.name_fa,
  })),
  episodes_count: row.episodes_count,
  studio: row.studio,
  season: row.season,
  year: row.year,
  startDate: row.startDate,
  endDate: row.endDate,
  isFeatured: row.isFeatured,
  averageScore: row.averageScore,
  malScore: row.malScore,
  imdbScore: row.imdbScore,
  anilist_id: row.anilist_id,
  mal_id: row.mal_id,
  imdb_id: row.imdb_id,
})

export const getAllAnime = async (): Promise<AnimeCard[]> => {
  const rows = await shioriFetch<ApiCard[]>('/anime-catalog/all')
  return rows.map(toCard)
}

export const searchAnimeCards = async (params: AnimeSearchParams): Promise<AnimeSearchResult> => {
  const qs = new URLSearchParams()
  if (params.query) qs.set('q', params.query)
  if (params.year != null) qs.set('year', String(params.year))
  if (params.season) qs.set('season', params.season)
  if (params.genreSlug) qs.set('genreSlug', params.genreSlug)
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.offset != null) qs.set('offset', String(params.offset))

  const result = await shioriFetch<{ items: ApiCard[]; total: number; hasMore: boolean }>(
    `/anime-catalog/search?${qs.toString()}`
  )

  return {
    items: result.items.map(toCard),
    total: result.total,
    hasMore: result.hasMore,
  }
}

export const getSimilarAnimeCards = async (
  animeId: string | number,
  genreSlugs: string[],
  limit = 12
): Promise<AnimeCard[]> => {
  const qs = new URLSearchParams()
  if (genreSlugs.length > 0) qs.set('genres', genreSlugs.join(','))
  qs.set('limit', String(limit))

  const rows = await shioriFetch<ApiCard[]>(
    `/anime-catalog/${encodeURIComponent(String(animeId))}/similar?${qs.toString()}`
  )
  return rows.map(toCard)
}

export const getAnimeCardById = async (animeId: string | number): Promise<AnimeCard | null> => {
  try {
    const row = await shioriFetch<ApiDetail>(`/anime-catalog/${encodeURIComponent(String(animeId))}`)
    return toCard(row)
  } catch {
    return null
  }
}

export const getAnimeDetailById = async (animeId: string | number): Promise<ApiDetail> =>
  shioriFetch<ApiDetail>(`/anime-catalog/${encodeURIComponent(String(animeId))}`)

export const getLocalAnimeIdsByAniListIds = async (
  anilistIds: number[]
): Promise<Map<number, string | number>> => {
  const unique = [...new Set(anilistIds.filter((id) => Number.isFinite(id) && id > 0))]
  if (unique.length === 0) return new Map()

  const qs = new URLSearchParams({ ids: unique.join(',') })
  const record = await shioriFetch<Record<string, string>>(`/anime-catalog/anilist/batch?${qs}`)

  const map = new Map<number, string | number>()
  for (const [anilistId, localId] of Object.entries(record)) {
    map.set(Number(anilistId), localId)
  }
  return map
}

export const getAnimeCardsByStudioSlug = async (slug: string): Promise<AnimeCard[]> => {
  const rows = await shioriFetch<ApiCard[]>(
    `/anime-catalog/studios/${encodeURIComponent(slug)}/anime`
  )
  return rows.map(toCard)
}

export const getGenreBySlug = async (slug: string): Promise<GenreAdminItem | null> => {
  try {
    const row = await shioriFetch<{ id: string; slug: string; nameEn?: string | null; nameFa?: string | null }>(
      `/anime-catalog/genres/${encodeURIComponent(slug)}`
    )
    return {
      id: row.id,
      slug: row.slug,
      name_en: row.nameEn ?? null,
      name_fa: row.nameFa ?? null,
    }
  } catch {
    return null
  }
}

export const getStudioBySlug = async (slug: string): Promise<StudioPublicItem | null> => {
  try {
    const row = await shioriFetch<{ slug: string; name: string }>(
      `/anime-catalog/studios/${encodeURIComponent(slug)}`
    )
    return { slug: row.slug, name: row.name }
  } catch {
    return null
  }
}

export const getTranslatorBySlug = async (slug: string): Promise<TranslatorItem | null> => {
  try {
    const result = await shioriFetch<{
      translator: {
        id: string
        slug: string
        name: string
        avatarUrl?: string | null
        coverUrl?: string | null
        bio?: string | null
        experience?: string | null
        isActive?: boolean
      }
    }>(`/anime-catalog/translators/${encodeURIComponent(slug)}`)

    const t = result.translator
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      avatar_url: t.avatarUrl ?? null,
      cover_url: t.coverUrl ?? null,
      bio: t.bio ?? null,
      experience: t.experience ?? null,
      is_active: t.isActive,
    }
  } catch {
    return null
  }
}

export const getAnimeCardsByTranslatorSlug = async (slug: string): Promise<AnimeCard[]> => {
  const result = await shioriFetch<{ anime: ApiCard[] }>(
    `/anime-catalog/translators/${encodeURIComponent(slug)}`
  )
  return (result.anime ?? []).map(toCard)
}

export const getTranslatorLinksByAnimeId = async (
  animeId: string | number
): Promise<TranslatorAnimeLink[]> => {
  const detail = await getAnimeDetailById(animeId)
  return (detail.translators ?? []).map((row) => ({
    id: row.id,
    anime_id: row.anime_id,
    translator_id: row.translator_id,
    role: row.role ?? null,
    translator: {
      id: row.translator.id,
      name: row.translator.name,
      slug: row.translator.slug,
      avatar_url: row.translator.avatar_url ?? null,
      cover_url: row.translator.cover_url ?? null,
      bio: row.translator.bio ?? null,
      experience: row.translator.experience ?? null,
      is_active: row.translator.is_active,
    },
  }))
}

export type ShioriAnimeDetailParts = {
  episodes: EpisodeItem[]
  subtitlePacks: SubtitlePackItem[]
  episodePack: { title?: string | null; download_link?: string | null } | null
  studioLinks: Array<{ slug: string; name: string }>
  studioNames: string[]
  series: ApiDetail['series']
  translators: TranslatorAnimeLink[]
}

export const mapShioriDetailParts = (detail: ApiDetail): ShioriAnimeDetailParts => {
  const subtitleMap = new Map<number, string>()
  for (const s of detail.subtitles ?? []) {
    const ep = typeof s.episode_number === 'number' ? s.episode_number : 0
    const link = s.subtitle_link
    if (typeof link === 'string' && link.trim()) subtitleMap.set(ep, link.trim())
  }

  const episodes: EpisodeItem[] = (detail.episodes ?? []).map((e) => ({
    id: e.id,
    number: e.episode_number,
    title: e.title?.trim() || `قسمت ${e.episode_number}`,
    download_link: e.download_link ?? undefined,
  }))

  const subtitlePacks: SubtitlePackItem[] = (detail.subtitle_packs ?? []).map((p) => ({
    id: p.id,
    title: p.title ?? undefined,
    subtitle_link: p.subtitle_link ?? undefined,
  }))

  const episodePack =
    detail.episode_pack_link && detail.episode_pack_link.trim()
      ? {
          title: detail.episode_pack_title ?? null,
          download_link: detail.episode_pack_link,
        }
      : null

  const studioLinks = detail.studio_links ?? []
  const studioNames = studioLinks.map((s) => s.name)
  if (studioNames.length === 0 && detail.studio) studioNames.push(detail.studio)

  const series =
    detail.series && detail.series.members.length > 1
      ? detail.series
      : null

  const translators = (detail.translators ?? []).map((row) => ({
    id: row.id,
    anime_id: row.anime_id,
    translator_id: row.translator_id,
    role: row.role ?? null,
    translator: {
      id: row.translator.id,
      name: row.translator.name,
      slug: row.translator.slug,
      avatar_url: row.translator.avatar_url ?? null,
      cover_url: row.translator.cover_url ?? null,
      bio: row.translator.bio ?? null,
      experience: row.translator.experience ?? null,
      is_active: row.translator.is_active,
    },
  }))

  return {
    episodes,
    subtitlePacks,
    episodePack,
    studioLinks,
    studioNames,
    series,
    translators,
  }
}
