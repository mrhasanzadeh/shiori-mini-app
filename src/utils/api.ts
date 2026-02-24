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
  description?: string
  genres?: supa.GenreItem[]
}

import type { AnimeListItem } from '../store/animeStore'

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
  description: c.description ?? '',
  genres: Array.isArray(c.genres) ? c.genres : [],
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
export const fetchAnimeList = async (_section?: string): Promise<AnimeListItem[]> => {
  const data = await supa.getAllAnime()
  return data.map(toListItem)
}

// Returns items shaped for cache cards on Home/Search (UiAnimeCard[])
// آرگومان section برای سازگاری با کد موجود پذیرفته می‌شود اما نادیده گرفته می‌شود
export const fetchAnimeCards = async (_section?: string): Promise<UiAnimeCard[]> => {
  const data = await supa.getAllAnime()
  const mapped = data.map(toCacheAnime)

  const normalizeFormat = (f: unknown) =>
    String(f ?? '')
      .trim()
      .toUpperCase()

  if (_section === 'movies') {
    return mapped.filter((a) => normalizeFormat(a.format) === 'MOVIE')
  }

  if (_section === 'donghua') {
    return mapped.filter((a) => normalizeFormat(a.format) === 'ONA (CHINESE)')
  }

  if (_section === 'popular') {
    const allowed = new Set(['TV', 'ONA', 'SPECIAL', 'MOVIE'])
    return mapped.filter((a) => allowed.has(normalizeFormat(a.format)))
  }

  return mapped
}

// دریافت جزئیات یک انیمه + لیست قسمت‌ها از جدول episodes (با لینک دانلود هر قسمت)
export const fetchAnimeById = async (id: number | string) => {
  const allAnime = await supa.getAllAnime()
  const anime = allAnime.find((a) => String(a.id) === String(id))

  if (!anime) {
    throw new Error(`Anime with id ${id} not found`)
  }

  // لیست قسمت‌ها فقط از جدول episodes خوانده می‌شود
  const episodesList = await supa.getEpisodesByAnimeId(anime.id)

  return {
    id: anime.id,
    title: anime.title,
    image: anime.image,
    featured_image: anime.featuredImage,
    format: anime.format ?? undefined,
    description: anime.description,
    status: anime.status,
    genres: anime.genres,
    episodes: episodesList,
    episodes_count: typeof anime.episodes_count === 'number' ? anime.episodes_count : 0,
    averageScore: typeof anime.averageScore === 'number' ? anime.averageScore : undefined,
    studios: anime.studio ? [anime.studio] : [],
    producers: [],
    season: anime.season ?? '',
    year: typeof anime.year === 'number' ? anime.year : undefined,
    startDate: anime.startDate ?? '',
    endDate: anime.endDate ?? '',
  }
}

// دریافت schedule (ساده‌سازی شده - خالی برمی‌گرداند)
export const fetchSchedule = async () => {
  const schedule: Record<
    string,
    Array<{ id: number; title: string; time: string; episode: string; image: string }>
  > = {
    شنبه: [],
    یکشنبه: [],
    دوشنبه: [],
    سه‌شنبه: [],
    چهارشنبه: [],
    پنج‌شنبه: [],
    جمعه: [],
  }

  const currentSeason = 'FALL'
  const currentYear = new Date().getFullYear()

  return { schedule, currentSeason, currentYear }
}

// دریافت انیمه‌های مشابه (ساده‌سازی شده - بر اساس genres)
export const fetchSimilar = async (id: number | string) => {
  const allAnime = await supa.getAllAnime()
  const currentAnime = allAnime.find((a) => String(a.id) === String(id))

  if (!currentAnime || !currentAnime.genres || currentAnime.genres.length === 0) {
    return []
  }

  const currentGenreSlugs = new Set(
    (currentAnime.genres || []).map((g: any) =>
      typeof g === 'string' ? g.trim().toLowerCase() : String(g.slug).trim().toLowerCase()
    )
  )

  // پیدا کردن انیمه‌های مشابه بر اساس genres مشترک
  const similar = allAnime
    .filter((anime) => {
      if (String(anime.id) === String(id)) return false
      // اگر حداقل یک genre مشترک داشته باشد
      return (anime.genres || []).some((g: any) => {
        const slug =
          typeof g === 'string' ? g.trim().toLowerCase() : String(g.slug).trim().toLowerCase()
        return currentGenreSlugs.has(slug)
      })
    })
    .sort((a, b) => {
      // مرتب‌سازی بر اساس تعداد genres مشترک و score
      const aCommonGenres = (a.genres || []).filter((g: any) => {
        const slug =
          typeof g === 'string' ? g.trim().toLowerCase() : String(g.slug).trim().toLowerCase()
        return currentGenreSlugs.has(slug)
      }).length
      const bCommonGenres = (b.genres || []).filter((g: any) => {
        const slug =
          typeof g === 'string' ? g.trim().toLowerCase() : String(g.slug).trim().toLowerCase()
        return currentGenreSlugs.has(slug)
      }).length
      if (aCommonGenres !== bCommonGenres) {
        return bCommonGenres - aCommonGenres
      }
      return (b.averageScore || 0) - (a.averageScore || 0)
    })
    .slice(0, 24)
    .map((anime) => ({
      id: anime.id,
      title: anime.title,
      image: anime.image || '',
      status: anime.status || 'ongoing',
      genres: anime.genres,
      score: anime.averageScore,
    }))

  return similar
}

// جستجو در لیست انیمه‌ها (client-side filtering)
export const fetchSearch = async (q: string, _page: number = 1): Promise<UiAnimeCard[]> => {
  const allAnime = await supa.getAllAnime()
  const searchTerm = q.trim().toLowerCase()

  if (!searchTerm) return allAnime.map(toCacheAnime)

  const filtered = allAnime.filter((anime) => anime.title.toLowerCase().includes(searchTerm))

  return filtered.map(toCacheAnime)
}
