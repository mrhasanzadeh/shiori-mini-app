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
  airing_status?: string
  genres: GenreItem[]
  episodes_count?: number
  studio?: string
  season?: string
  year?: number
  startDate?: string
  endDate?: string
  isNew?: boolean
  isFeatured?: boolean
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
  status: row.status ?? row.airing_status ?? 'RELEASING',
  airing_status: row.airing_status ?? row.status ?? undefined,
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
  isFeatured: typeof row.is_featured === 'boolean' ? row.is_featured : undefined,
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
      airing_status,
      average_score,
      episodes_count,
      studio,
      season,
      year,
      start_date,
      end_date,
      is_featured,
      anime_genres(genres(slug,name_en,name_fa)),
      created_at
    `

  const selectWithGenresWithoutAiringStatus = `
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
      is_featured,
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
      airing_status,
      average_score,
      episodes_count,
      studio,
      season,
      year,
      start_date,
      end_date,
      is_featured,
      created_at
    `

  const selectWithoutGenresWithoutAiringStatus = `
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
      is_featured,
      created_at
    `

  let data: any[] | null = null

  const withGenresRes = await supabase
    .from('anime')
    .select(selectWithGenres)
    .order('created_at', { ascending: false })

  if (withGenresRes.error) {
    const withGenresWithoutAiringRes = await supabase
      .from('anime')
      .select(selectWithGenresWithoutAiringStatus)
      .order('created_at', { ascending: false })

    if (!withGenresWithoutAiringRes.error) {
      data = withGenresWithoutAiringRes.data
    } else {
      const withoutGenresRes = await supabase
        .from('anime')
        .select(selectWithoutGenres)
        .order('created_at', { ascending: false })

      if (withoutGenresRes.error) {
        const withoutGenresWithoutAiringRes = await supabase
          .from('anime')
          .select(selectWithoutGenresWithoutAiringStatus)
          .order('created_at', { ascending: false })

        if (withoutGenresWithoutAiringRes.error) {
          console.error('Error fetching all anime:', withoutGenresWithoutAiringRes.error)
          throw withoutGenresWithoutAiringRes.error
        }

        data = withoutGenresWithoutAiringRes.data
      } else {
        data = withoutGenresRes.data
      }
    }
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

export type SubtitleItem = {
  id: string | number
  season_number?: number
  episode_number: number
  subtitle_link?: string
}

export type SubtitlePackItem = {
  id: string | number
  season_number?: number
  title?: string
  subtitle_link?: string
}

export const insertSubtitlePackAdmin = async (payload: {
  anime_id: string | number
  season_number: number
  title: string | null
  subtitle_link: string | null
}): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase.from('subtitle_packs').insert({
    anime_id: payload.anime_id,
    season_number: payload.season_number,
    title: payload.title,
    subtitle_link: payload.subtitle_link,
  })
  if (error) throw error
}

export const updateSubtitlePackAdmin = async (payload: {
  id: string | number
  season_number: number
  title: string | null
  subtitle_link: string | null
}): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase
    .from('subtitle_packs')
    .update({
      season_number: payload.season_number,
      title: payload.title,
      subtitle_link: payload.subtitle_link,
    })
    .eq('id', payload.id)
  if (error) throw error
}

export const deleteSubtitlePackAdmin = async (packId: string | number): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase.from('subtitle_packs').delete().eq('id', packId)
  if (error) throw error
}

export const getSubtitlePacksByAnimeId = async (
  animeId: string | number
): Promise<SubtitlePackItem[]> => {
  if (!hasSupabaseConfig) return []

  const { data, error } = await supabase
    .from('subtitle_packs')
    .select('id, season_number, title, subtitle_link')
    .eq('anime_id', animeId)
    .order('season_number', { ascending: true })

  if (error) {
    console.warn('getSubtitlePacksByAnimeId:', error.message)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    season_number: typeof row.season_number === 'number' ? row.season_number : undefined,
    title: typeof row.title === 'string' ? row.title : undefined,
    subtitle_link:
      typeof row.subtitle_link === 'string' && row.subtitle_link.trim().length > 0
        ? row.subtitle_link
        : undefined,
  }))
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

export const getSubtitlesByAnimeId = async (animeId: string | number): Promise<SubtitleItem[]> => {
  if (!hasSupabaseConfig) return []

  const { data, error } = await supabase
    .from('subtitles')
    .select('id, season_number, episode_number, title, subtitle_link')
    .eq('anime_id', animeId)
    .order('season_number', { ascending: true })
    .order('episode_number', { ascending: true })

  if (error) {
    console.warn('getSubtitlesByAnimeId:', error.message)
    return []
  }

  return (data || []).map((row: any) => {
    return {
      id: row.id,
      season_number: typeof row.season_number === 'number' ? row.season_number : undefined,
      episode_number: row.episode_number ?? row.episode ?? 0,
      subtitle_link:
        typeof row.subtitle_link === 'string' && row.subtitle_link.trim().length > 0
          ? row.subtitle_link
          : undefined,
    } as SubtitleItem
  })
}

export type GenreAdminItem = {
  id?: number | string
  slug: string
  name_en?: string | null
  name_fa?: string | null
}

export const getAllGenres = async (): Promise<GenreAdminItem[]> => {
  if (!hasSupabaseConfig) return []
  const { data, error } = await supabase
    .from('genres')
    .select('id, slug, name_en, name_fa')
    .order('slug', { ascending: true })

  if (error) {
    console.warn('getAllGenres:', error.message)
    return []
  }

  return (data || []).map((row: any) => ({
    id: typeof row.id === 'number' || typeof row.id === 'string' ? row.id : undefined,
    slug: String(row.slug ?? '').trim(),
    name_en: typeof row.name_en === 'string' ? row.name_en : (row.name_en ?? null),
    name_fa: typeof row.name_fa === 'string' ? row.name_fa : (row.name_fa ?? null),
  }))
}

export const upsertGenre = async (payload: {
  id?: number
  slug: string
  name_en: string | null
  name_fa: string | null
}): Promise<GenreAdminItem> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')

  const row: any = {
    slug: payload.slug,
    name_en: payload.name_en,
    name_fa: payload.name_fa,
  }

  if (typeof payload.id === 'number') row.id = payload.id

  const { data, error } = await supabase
    .from('genres')
    .upsert(row, { onConflict: typeof payload.id === 'number' ? 'id' : 'slug' })
    .select('id, slug, name_en, name_fa')
    .single()

  if (error) throw error

  return {
    id: typeof data?.id === 'number' || typeof data?.id === 'string' ? data.id : undefined,
    slug: String(data?.slug ?? ''),
    name_en: data?.name_en ?? null,
    name_fa: data?.name_fa ?? null,
  }
}

export type AnimeAdminRow = {
  id: number | string
  title?: string | null
  synopsis?: string | null
  format?: string | null
  season?: string | null
  year?: number | null
  featured_image?: string | null
  cover_image?: string | null
  is_featured?: boolean | null
  airing_status?: string | null
  average_score?: number | null
  episodes_count?: number | null
  studio?: string | null
  start_date?: string | null
  end_date?: string | null
}

export const getAnimeAdminById = async (animeId: string | number): Promise<AnimeAdminRow> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')

  const select =
    `id, title, synopsis, format, season, year, featured_image, ${IMAGE_COLUMN}, is_featured, airing_status, average_score, episodes_count, studio, start_date, end_date` as any as string

  const { data, error } = await (supabase
    .from('anime')
    .select(select)
    .eq('id', animeId)
    .single() as any)

  if (error) throw error

  const row: any = data

  return {
    id: row.id,
    title: row.title ?? null,
    synopsis: row.synopsis ?? null,
    format: row.format ?? null,
    season: row.season ?? null,
    year: typeof row.year === 'number' ? row.year : (row.year ?? null),
    featured_image: row.featured_image ?? null,
    cover_image: row[IMAGE_COLUMN] ?? null,
    is_featured: typeof row.is_featured === 'boolean' ? row.is_featured : (row.is_featured ?? null),
    airing_status: row.airing_status ?? null,
    average_score:
      typeof row.average_score === 'number' ? row.average_score : (row.average_score ?? null),
    episodes_count:
      typeof row.episodes_count === 'number' ? row.episodes_count : (row.episodes_count ?? null),
    studio: row.studio ?? null,
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
  }
}

export const upsertAnimeAdmin = async (payload: {
  id?: number | string
  title: string
  synopsis: string | null
  format: string | null
  season: string | null
  year: number | null
  featured_image: string | null
  cover_image: string | null
  is_featured: boolean
  airing_status?: string | null
  average_score?: number | null
  episodes_count?: number | null
  studio?: string | null
  start_date?: string | null
  end_date?: string | null
}): Promise<{ id: number | string }> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')

  const row: any = {
    title: payload.title,
    synopsis: payload.synopsis,
    format: payload.format,
    season: payload.season,
    year: payload.year,
    featured_image: payload.featured_image,
    is_featured: payload.is_featured,
  }

  if (payload.airing_status !== undefined) row.airing_status = payload.airing_status
  if (payload.average_score !== undefined) row.average_score = payload.average_score
  if (payload.episodes_count !== undefined) row.episodes_count = payload.episodes_count
  if (payload.studio !== undefined) row.studio = payload.studio
  if (payload.start_date !== undefined) row.start_date = payload.start_date
  if (payload.end_date !== undefined) row.end_date = payload.end_date

  row[IMAGE_COLUMN] = payload.cover_image
  if (payload.id !== undefined && payload.id !== null) row.id = payload.id

  const { data, error } = await supabase.from('anime').upsert(row).select('id').single()
  if (error) throw error
  return { id: data.id }
}

export type EpisodeAdminRow = {
  id: number | string
  anime_id: number | string
  season_number?: number | null
  episode_number?: number | null
  title?: string | null
  download_link?: string | null
}

export const getEpisodesAdminByAnimeId = async (
  animeId: string | number
): Promise<EpisodeAdminRow[]> => {
  if (!hasSupabaseConfig) return []
  const { data, error } = await supabase
    .from('episodes')
    .select('id, anime_id, season_number, episode_number, title, download_link')
    .eq('anime_id', animeId)
    .order('season_number', { ascending: true })
    .order('episode_number', { ascending: true })

  if (error) {
    console.warn('getEpisodesAdminByAnimeId:', error.message)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    anime_id: row.anime_id,
    season_number:
      typeof row.season_number === 'number' ? row.season_number : (row.season_number ?? null),
    episode_number:
      typeof row.episode_number === 'number' ? row.episode_number : (row.episode_number ?? null),
    title: row.title ?? null,
    download_link: row.download_link ?? null,
  }))
}

export const insertEpisodeAdmin = async (payload: {
  anime_id: string | number
  season_number: number
  episode_number: number
  title: string | null
  download_link: string | null
}): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase.from('episodes').insert({
    anime_id: payload.anime_id,
    season_number: payload.season_number,
    episode_number: payload.episode_number,
    title: payload.title,
    download_link: payload.download_link,
  })
  if (error) throw error
}

export const updateEpisodeAdmin = async (payload: {
  id: string | number
  season_number: number
  episode_number: number
  title: string | null
  download_link: string | null
}): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase
    .from('episodes')
    .update({
      season_number: payload.season_number,
      episode_number: payload.episode_number,
      title: payload.title,
      download_link: payload.download_link,
    })
    .eq('id', payload.id)
  if (error) throw error
}

export const deleteEpisodeAdmin = async (episodeId: string | number): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase.from('episodes').delete().eq('id', episodeId)
  if (error) throw error
}

export type SubtitleAdminRow = {
  id: number | string
  anime_id: number | string
  season_number?: number | null
  episode_number?: number | null
  subtitle_link?: string | null
}

export const getSubtitlesAdminByAnimeId = async (
  animeId: string | number
): Promise<SubtitleAdminRow[]> => {
  if (!hasSupabaseConfig) return []
  const { data, error } = await supabase
    .from('subtitles')
    .select('id, anime_id, season_number, episode_number, subtitle_link')
    .eq('anime_id', animeId)
    .order('season_number', { ascending: true })
    .order('episode_number', { ascending: true })

  if (error) {
    console.warn('getSubtitlesAdminByAnimeId:', error.message)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    anime_id: row.anime_id,
    season_number:
      typeof row.season_number === 'number' ? row.season_number : (row.season_number ?? null),
    episode_number:
      typeof row.episode_number === 'number' ? row.episode_number : (row.episode_number ?? null),
    subtitle_link: row.subtitle_link ?? null,
  }))
}

export const insertSubtitleAdmin = async (payload: {
  anime_id: string | number
  season_number: number
  episode_number: number
  subtitle_link: string | null
}): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase.from('subtitles').insert({
    anime_id: payload.anime_id,
    season_number: payload.season_number,
    episode_number: payload.episode_number,
    subtitle_link: payload.subtitle_link,
  })
  if (error) throw error
}

export const updateSubtitleAdmin = async (payload: {
  id: string | number
  season_number: number
  episode_number: number
  subtitle_link: string | null
}): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase
    .from('subtitles')
    .update({
      season_number: payload.season_number,
      episode_number: payload.episode_number,
      subtitle_link: payload.subtitle_link,
    })
    .eq('id', payload.id)
  if (error) throw error
}

export const deleteSubtitleAdmin = async (subtitleId: string | number): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase.from('subtitles').delete().eq('id', subtitleId)
  if (error) throw error
}

export const getAnimeGenreSlugs = async (animeId: string | number): Promise<string[]> => {
  if (!hasSupabaseConfig) return []

  const res1 = await supabase.from('anime_genres').select('genres(slug)').eq('anime_id', animeId)

  if (!res1.error) {
    return (res1.data || [])
      .map((r: any) => r?.genres?.slug)
      .filter((s: any) => typeof s === 'string')
  }

  console.warn('getAnimeGenreSlugs:', res1.error.message)
  return []
}

export const replaceAnimeGenres = async (
  animeId: string | number,
  slugs: string[]
): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')

  const cleanSlugs = Array.from(
    new Set((slugs || []).map((s) => String(s).trim().toLowerCase()).filter((s) => s.length > 0))
  )

  const del1 = await supabase.from('anime_genres').delete().eq('anime_id', animeId)
  if (del1.error) {
    console.warn('replaceAnimeGenres.delete:', del1.error.message)
  }

  if (cleanSlugs.length === 0) return

  const gRes = await supabase.from('genres').select('id, slug').in('slug', cleanSlugs)
  if (gRes.error) throw gRes.error
  const genres = (gRes.data || []) as any[]
  const bySlug = new Map<string, any>()
  for (const g of genres) {
    if (typeof g?.slug === 'string') bySlug.set(String(g.slug).trim().toLowerCase(), g)
  }

  const rowsById = cleanSlugs
    .map((slug) => ({ slug, genre: bySlug.get(slug) }))
    .filter((x) => typeof x.genre?.id === 'number' || typeof x.genre?.id === 'string')
    .map((x) => ({ anime_id: animeId, genre_id: x.genre.id }))

  if (rowsById.length !== cleanSlugs.length) {
    const found = new Set(
      cleanSlugs
        .map((slug) => ({ slug, genre: bySlug.get(slug) }))
        .filter((x) => typeof x.genre?.id === 'number' || typeof x.genre?.id === 'string')
        .map((x) => x.slug)
    )
    const missing = cleanSlugs.filter((s) => !found.has(s))
    throw new Error(
      `ژانر(ها) پیدا نشدند یا id ندارند: ${missing.join(', ')}. ` +
        'احتمالاً RLS روی جدول genres اجازه SELECT نمی‌دهد یا این slugها در جدول genres وجود ندارند.'
    )
  }

  const ins1 = await supabase.from('anime_genres').insert(rowsById)
  if (ins1.error) throw ins1.error
}

export type StudioAdminItem = {
  id?: number | string
  slug: string
  name: string
}

export const getAllStudiosAdmin = async (): Promise<StudioAdminItem[]> => {
  if (!hasSupabaseConfig) return []
  const { data, error } = await supabase
    .from('studios')
    .select('id, slug, name')
    .order('name', { ascending: true })
  if (error) {
    console.warn('getAllStudiosAdmin:', error.message)
    return []
  }
  return (data || []).map((row: any) => ({
    id: typeof row.id === 'number' || typeof row.id === 'string' ? row.id : undefined,
    slug: String(row.slug ?? '').trim(),
    name: String(row.name ?? '').trim(),
  }))
}

export const upsertStudioAdmin = async (payload: {
  id?: number | string
  slug: string
  name: string
}): Promise<StudioAdminItem> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')

  const row: any = {
    slug: payload.slug,
    name: payload.name,
  }

  if (payload.id !== undefined && payload.id !== null && String(payload.id).length > 0) {
    row.id = payload.id
  }

  const { data, error } = await supabase
    .from('studios')
    .upsert(row, { onConflict: row.id ? 'id' : 'slug' })
    .select('id, slug, name')
    .single()

  if (error) throw error

  return {
    id: typeof data?.id === 'number' || typeof data?.id === 'string' ? data.id : undefined,
    slug: String(data?.slug ?? '').trim(),
    name: String(data?.name ?? '').trim(),
  }
}

export const getAnimeStudioSlugsAdmin = async (animeId: string | number): Promise<string[]> => {
  if (!hasSupabaseConfig) return []
  const res = await supabase.from('anime_studios').select('studios(slug)').eq('anime_id', animeId)
  if (res.error) {
    console.warn('getAnimeStudioSlugsAdmin:', res.error.message)
    return []
  }
  return (res.data || [])
    .map((r: any) => r?.studios?.slug)
    .filter((s: any) => typeof s === 'string')
}

export const getAnimeStudioNames = async (animeId: string | number): Promise<string[]> => {
  if (!hasSupabaseConfig) return []
  const res = await supabase.from('anime_studios').select('studios(name)').eq('anime_id', animeId)
  if (res.error) {
    console.warn('getAnimeStudioNames:', res.error.message)
    return []
  }
  return (res.data || [])
    .map((r: any) => r?.studios?.name)
    .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
    .map((s: any) => String(s))
}

export const replaceAnimeStudiosAdmin = async (
  animeId: string | number,
  studioSlugs: string[]
): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')

  const cleanSlugs = Array.from(
    new Set(
      (studioSlugs || []).map((s) => String(s).trim().toLowerCase()).filter((s) => s.length > 0)
    )
  )

  const del = await supabase.from('anime_studios').delete().eq('anime_id', animeId)
  if (del.error) console.warn('replaceAnimeStudiosAdmin.delete:', del.error.message)
  if (cleanSlugs.length === 0) return

  const sRes = await supabase.from('studios').select('id, slug').in('slug', cleanSlugs)
  if (sRes.error) throw sRes.error
  const studios = (sRes.data || []) as any[]
  const bySlug = new Map<string, any>()
  for (const s of studios) {
    if (typeof s?.slug === 'string') bySlug.set(String(s.slug).trim().toLowerCase(), s)
  }

  const rows = cleanSlugs
    .map((slug) => ({ slug, studio: bySlug.get(slug) }))
    .filter((x) => typeof x.studio?.id === 'number' || typeof x.studio?.id === 'string')
    .map((x) => ({ anime_id: animeId, studio_id: x.studio.id }))

  if (rows.length !== cleanSlugs.length) {
    const found = new Set(
      cleanSlugs
        .map((slug) => ({ slug, studio: bySlug.get(slug) }))
        .filter((x) => typeof x.studio?.id === 'number' || typeof x.studio?.id === 'string')
        .map((x) => x.slug)
    )
    const missing = cleanSlugs.filter((s) => !found.has(s))
    throw new Error(`استودیو(ها) پیدا نشدند یا id ندارند: ${missing.join(', ')}`)
  }

  const ins = await supabase.from('anime_studios').insert(rows)
  if (ins.error) throw ins.error
}
