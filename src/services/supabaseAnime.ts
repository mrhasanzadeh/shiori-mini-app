import { supabase, hasSupabaseConfig } from '../lib/supabase'

export type GenreItem = {
  slug: string
  name_en?: string
  name_fa?: string
}

export type AnimeCard = {
  id: number | string
  title: string
  image: string
  featuredImage: string
  description: string
  format?: string
  status: string
  genres: GenreItem[]
  episodes_count?: number
  studio?: string
  season?: string
  year?: number
  startDate?: string
  endDate?: string
  isNew?: boolean
  episode?: string
  averageScore?: number
}

// نام ستون تصویر در جدول anime — از .env می‌خوانیم؛ پیش‌فرض: cover_image
const IMAGE_COLUMN = (import.meta.env.VITE_ANIME_IMAGE_COLUMN as string) || 'cover_image'

const getImageUrl = (row: any): string =>
  row[IMAGE_COLUMN] ??
  row.image ??
  row.cover_image ??
  row.poster ??
  row.poster_url ??
  row.cover ??
  row.thumbnail ??
  ''

const toAnimeCard = (row: any): AnimeCard => ({
  id: row.id,
  title: row.title || 'بدون عنوان',
  image: getImageUrl(row),
  featuredImage: row.featured_image ?? undefined,
  description: row.synopsis ?? row.description ?? '',
  format: row.format ?? undefined,
  status: row.format || row.status || 'ongoing',
  genres: Array.isArray(row.genres)
    ? row.genres
        .map((g: any) => {
          if (typeof g === 'string') {
            const slug = g.trim().toLowerCase().replace(/\s+/g, '-')
            return { slug, name_en: g } as GenreItem
          }
          if (g && typeof g === 'object' && typeof g.slug === 'string') {
            return {
              slug: String(g.slug),
              name_en: typeof g.name_en === 'string' ? g.name_en : undefined,
              name_fa: typeof g.name_fa === 'string' ? g.name_fa : undefined,
            } as GenreItem
          }
          return null
        })
        .filter((g: any) => g && typeof g.slug === 'string')
    : Array.isArray(row.anime_genres)
      ? row.anime_genres
          .map((ag: any) => ag?.genres)
          .map((g: any) => {
            if (!g || typeof g !== 'object') return null
            if (typeof g.slug !== 'string') return null
            return {
              slug: String(g.slug),
              name_en: typeof g.name_en === 'string' ? g.name_en : undefined,
              name_fa: typeof g.name_fa === 'string' ? g.name_fa : undefined,
            } as GenreItem
          })
          .filter((g: any) => g && typeof g.slug === 'string')
      : [],
  episodes_count: typeof row.episodes_count === 'number' ? row.episodes_count : undefined,
  studio: row.studio ?? undefined,
  season: row.season ?? undefined,
  year: typeof row.year === 'number' ? row.year : undefined,
  startDate: row.start_date ?? undefined,
  endDate: row.end_date ?? undefined,
  isNew: Boolean(row.is_new),
  episode: row.latest_episode ? `قسمت ${row.latest_episode}` : undefined,
  averageScore: typeof row.average_score === 'number' ? row.average_score : undefined,
})

// دریافت تمام انیمه‌های موجود در دیتابیس
// مطابق اسکیما: id, title, cover_image, banner_image, format, synopsis, average_score, created_at
// (ستون‌های status و episodes و رابطه anime_genres در این اسکیما نیستند)
export const getAllAnime = async (): Promise<AnimeCard[]> => {
  if (!hasSupabaseConfig) {
    throw new Error(
      'تنظیمات Supabase یافت نشد. در روت پروژه فایل .env بسازید و VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY را از پروژه Supabase قرار دهید.'
    )
  }

  const selectWithGenres = `
      id,
      title,
      ${IMAGE_COLUMN},
      featured_image,
      synopsis,
      format,
      average_score,
      episodes_count,
      studio,
      season,
      year,
      start_date,
      end_date,
      anime_genres(genres(slug,name_en,name_fa)),
      created_at
    `

  const selectWithoutGenres = `
      id,
      title,
      ${IMAGE_COLUMN},
      featured_image,
      synopsis,
      format,
      average_score,
      episodes_count,
      studio,
      season,
      year,
      start_date,
      end_date,
      created_at
    `

  let data: any[] | null = null

  const withGenresRes = await supabase
    .from('anime')
    .select(selectWithGenres)
    .order('created_at', { ascending: false })

  if (withGenresRes.error) {
    const withoutGenresRes = await supabase
      .from('anime')
      .select(selectWithoutGenres)
      .order('created_at', { ascending: false })

    if (withoutGenresRes.error) {
      console.error('Error fetching all anime:', withoutGenresRes.error)
      throw withoutGenresRes.error
    }

    data = withoutGenresRes.data
  } else {
    data = withGenresRes.data
  }

  const list = (data || []).map((row: any) => toAnimeCard(row))
  if (import.meta.env.DEV && list.length === 0) {
    console.warn(
      '[getAllAnime] لیست خالی برگشت. اگر در Supabase داده دارید، احتمالاً RLS جلوی خواندن را گرفته. در SQL Editor اجرا کنید:\n' +
        'CREATE POLICY "Allow public read" ON anime FOR SELECT USING (true);'
    )
  }
  return list
}

// نوع هر قسمت برای نمایش در تب «قسمت‌ها»
export type EpisodeItem = {
  id: string | number
  season_number?: number
  number: number
  title: string
  download_link?: string
}

// دریافت لیست قسمت‌های یک انیمه از جدول episodes (هر قسمت یک لینک دانلود دارد)
export const getEpisodesByAnimeId = async (animeId: string | number): Promise<EpisodeItem[]> => {
  if (!hasSupabaseConfig) return []
  const { data, error } = await supabase
    .from('episodes')
    .select('id, season_number, episode_number, title, download_link')
    .eq('anime_id', animeId)
    .order('season_number', { ascending: true })
    .order('episode_number', { ascending: true })
  if (error) {
    console.warn('getEpisodesByAnimeId:', error.message)
    return []
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    season_number: typeof row.season_number === 'number' ? row.season_number : undefined,
    number: row.episode_number ?? 0,
    title: row.title || `قسمت ${row.episode_number ?? 0}`,
    download_link: row.download_link ?? undefined,
  }))
}
