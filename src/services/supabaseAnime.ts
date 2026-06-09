import { supabase, hasSupabaseConfig } from '../lib/supabase'

/** پیام خطای Supabase/PostgREST را برای نمایش در UI استخراج می‌کند */
export const formatSupabaseError = (e: unknown): string => {
  if (e && typeof e === 'object' && 'message' in e) {
    const msg = String((e as { message: unknown }).message ?? '').trim()
    if (msg) return msg
  }
  if (e instanceof Error) return e.message
  return 'خطای ناشناخته'
}

const isMissingColumnError = (message: string, column: string): boolean => {
  const m = message.toLowerCase()
  const c = column.toLowerCase()
  return m.includes(`'${c}'`) || m.includes(`"${c}"`) || m.includes(` ${c} `) || m.includes(c)
}

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
  malScore?: number
  imdbScore?: number
  anilist_id?: number
  mal_id?: number
  imdb_id?: string
}

// نام ستون تصویر در جدول anime — از .env می‌خوانیم؛ پیش‌فرض: cover_image
const IMAGE_COLUMN = (import.meta.env.VITE_ANIME_IMAGE_COLUMN as string) || 'cover_image'

const ANIME_CARD_SELECT_WITH_GENRES = `
      id,
      title,
      ${IMAGE_COLUMN},
      featured_image,
      synopsis,
      format,
      airing_status,
      average_score,
      mal_score,
      imdb_score,
      anilist_id,
      mal_id,
      imdb_id,
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
  malScore: typeof row.mal_score === 'number' ? row.mal_score : undefined,
  imdbScore: typeof row.imdb_score === 'number' ? row.imdb_score : undefined,
  anilist_id:
    typeof row.anilist_id === 'number'
      ? row.anilist_id
      : row.anilist_id != null && row.anilist_id !== ''
        ? Number(row.anilist_id) || undefined
        : undefined,
  mal_id:
    typeof row.mal_id === 'number'
      ? row.mal_id
      : row.mal_id != null && row.mal_id !== ''
        ? Number(row.mal_id) || undefined
        : undefined,
  imdb_id:
    typeof row.imdb_id === 'string' && row.imdb_id.trim() ? row.imdb_id.trim() : undefined,
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

  const selectWithGenres = ANIME_CARD_SELECT_WITH_GENRES

  const selectWithGenresWithoutAiringStatusAndSpecial = `
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

  const selectWithoutGenresWithoutAiringStatusAndSpecial = `
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
      const withGenresWithoutAiringAndSpecialRes = await supabase
        .from('anime')
        .select(selectWithGenresWithoutAiringStatusAndSpecial)
        .order('created_at', { ascending: false })

      if (!withGenresWithoutAiringAndSpecialRes.error) {
        data = withGenresWithoutAiringAndSpecialRes.data
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

          if (!withoutGenresWithoutAiringRes.error) {
            data = withoutGenresWithoutAiringRes.data
          } else {
            const withoutGenresWithoutAiringAndSpecialRes = await supabase
              .from('anime')
              .select(selectWithoutGenresWithoutAiringStatusAndSpecial)
              .order('created_at', { ascending: false })

            if (withoutGenresWithoutAiringAndSpecialRes.error) {
              console.error(
                'Error fetching all anime:',
                withoutGenresWithoutAiringAndSpecialRes.error
              )
              throw withoutGenresWithoutAiringAndSpecialRes.error
            }

            data = withoutGenresWithoutAiringAndSpecialRes.data
          }
        } else {
          data = withoutGenresRes.data
        }
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

export type AnimeSearchParams = {
  query?: string
  year?: number | null
  season?: string | null
  genreSlug?: string | null
  limit?: number
  offset?: number
}

export type AnimeSearchResult = {
  items: AnimeCard[]
  total: number
  hasMore: boolean
}

const splitAnimeSearchTokens = (query: string): string[] =>
  String(query ?? '')
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/,/g, ' ').trim())
    .filter((t) => t.length > 0)

const escapeAnimeIlikePattern = (token: string): string =>
  token.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')

const buildAnimeSearchSelect = (withGenreInnerJoin: boolean): string => {
  const genreJoin = withGenreInnerJoin
    ? 'anime_genres!inner(genres!inner(slug,name_en,name_fa))'
    : 'anime_genres(genres(slug,name_en,name_fa))'

  return `
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
      ${genreJoin},
      created_at
    `
}

/** Paginated catalog search — filters run in Supabase, not in the browser. */
export const searchAnimeCards = async (params: AnimeSearchParams): Promise<AnimeSearchResult> => {
  if (!hasSupabaseConfig) {
    throw new Error(
      'تنظیمات Supabase یافت نشد. در روت پروژه فایل .env بسازید و VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY را از پروژه Supabase قرار دهید.'
    )
  }

  const limit = Number.isFinite(params.limit) && (params.limit ?? 0) > 0 ? params.limit! : 48
  const offset = Number.isFinite(params.offset) && (params.offset ?? 0) >= 0 ? params.offset! : 0
  const from = offset
  const to = offset + limit - 1

  const genreSlug = params.genreSlug ? String(params.genreSlug).trim().toLowerCase() : ''
  const season =
    params.season && String(params.season).trim()
      ? String(params.season).trim().toUpperCase()
      : ''
  const year =
    params.year !== null && params.year !== undefined && Number.isFinite(params.year)
      ? params.year
      : null

  let q = supabase
    .from('anime')
    .select(buildAnimeSearchSelect(Boolean(genreSlug)), { count: 'exact' })

  if (genreSlug) {
    q = q.eq('anime_genres.genres.slug', genreSlug)
  }
  if (year !== null) {
    q = q.eq('year', year)
  }
  if (season) {
    q = q.eq('season', season)
  }

  for (const token of splitAnimeSearchTokens(params.query ?? '')) {
    q = q.ilike('title', `%${escapeAnimeIlikePattern(token)}%`)
  }

  q = q.order('created_at', { ascending: false }).range(from, to)

  const { data, error, count } = await q

  if (error) {
    // Fallback when airing_status column is missing
    let fallback = supabase
      .from('anime')
      .select(buildAnimeSearchSelect(Boolean(genreSlug)).replace('airing_status,', ''), {
        count: 'exact',
      })

    if (genreSlug) fallback = fallback.eq('anime_genres.genres.slug', genreSlug)
    if (year !== null) fallback = fallback.eq('year', year)
    if (season) fallback = fallback.eq('season', season)
    for (const token of splitAnimeSearchTokens(params.query ?? '')) {
      fallback = fallback.ilike('title', `%${escapeAnimeIlikePattern(token)}%`)
    }
    fallback = fallback.order('created_at', { ascending: false }).range(from, to)

    const retry = await fallback
    if (retry.error) {
      console.error('searchAnimeCards:', retry.error)
      throw retry.error
    }

    const total = typeof retry.count === 'number' ? retry.count : (retry.data || []).length
    const items = (retry.data || []).map((row: any) => toAnimeCard(row))
    return { items, total, hasMore: offset + items.length < total }
  }

  const total = typeof count === 'number' ? count : (data || []).length
  const items = (data || []).map((row: any) => toAnimeCard(row))
  return { items, total, hasMore: offset + items.length < total }
}

/** Similar titles by shared genres (same catalog, excludes current anime). */
export const getSimilarAnimeCards = async (
  animeId: string | number,
  genreSlugs: string[],
  limit = 12
): Promise<AnimeCard[]> => {
  if (!hasSupabaseConfig) return []

  const slugs = [
    ...new Set(genreSlugs.map((s) => String(s).trim().toLowerCase()).filter(Boolean)),
  ]
  if (slugs.length === 0) return []

  const gRes = await supabase.from('genres').select('id, slug').in('slug', slugs)
  if (gRes.error || !gRes.data?.length) {
    if (import.meta.env.DEV && gRes.error) console.warn('getSimilarAnimeCards genres:', gRes.error.message)
    return []
  }

  const genreIds = (gRes.data as any[]).map((g) => g.id)

  const linksRes = await supabase
    .from('anime_genres')
    .select('anime_id')
    .in('genre_id', genreIds)
    .neq('anime_id', animeId)

  if (linksRes.error || !linksRes.data?.length) {
    if (import.meta.env.DEV && linksRes.error)
      console.warn('getSimilarAnimeCards links:', linksRes.error.message)
    return []
  }

  const counts = new Map<string, number>()
  for (const row of linksRes.data as any[]) {
    const aid = String(row.anime_id)
    counts.set(aid, (counts.get(aid) ?? 0) + 1)
  }

  const topIds = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)

  if (topIds.length === 0) return []

  const { data, error } = await supabase
    .from('anime')
    .select(ANIME_CARD_SELECT_WITH_GENRES)
    .in('id', topIds)

  if (error || !data) {
    if (import.meta.env.DEV && error) console.warn('getSimilarAnimeCards anime:', error.message)
    return []
  }

  const byId = new Map<string, AnimeCard>()
  for (const row of data as any[]) {
    byId.set(String(row.id), toAnimeCard(row))
  }

  return topIds.map((id) => byId.get(id)).filter((c): c is AnimeCard => Boolean(c))
}

// نوع هر قسمت برای نمایش در تب «قسمت‌ها»
export type EpisodeItem = {
  id: string | number
  number: number
  title: string
  download_link?: string
}

export type SubtitleItem = {
  id: string | number
  episode_number: number
  subtitle_link?: string
}

export type SubtitlePackItem = {
  id: string | number
  title?: string
  subtitle_link?: string
}

export type EpisodePackItem = {
  title?: string | null
  download_link?: string | null
}

const parseEpisodePackRow = (row: Record<string, unknown> | null | undefined): EpisodePackItem | null => {
  if (!row) return null
  const link =
    typeof row.episode_pack_link === 'string' && row.episode_pack_link.trim().length > 0
      ? row.episode_pack_link.trim()
      : null
  if (!link) return null
  return {
    title:
      typeof row.episode_pack_title === 'string' && row.episode_pack_title.trim().length > 0
        ? row.episode_pack_title.trim()
        : null,
    download_link: link,
  }
}

export const getEpisodePackByAnimeId = async (
  animeId: string | number
): Promise<EpisodePackItem | null> => {
  if (!hasSupabaseConfig) return null

  const { data, error } = await supabase
    .from('anime')
    .select('episode_pack_title, episode_pack_link')
    .eq('id', animeId)
    .maybeSingle()

  if (error) {
    const msg = String(error.message ?? '')
    const code = String(error.code ?? '')
    if (code === '42703' || code === 'PGRST204' || msg.toLowerCase().includes('does not exist')) {
      if (import.meta.env.DEV) {
        console.warn(
          '[getEpisodePackByAnimeId] ستون episode_pack در anime وجود ندارد. supabase-add-episode-pack.sql را اجرا کنید.'
        )
      }
      return null
    }
    console.warn('getEpisodePackByAnimeId:', error.message)
    return null
  }

  return parseEpisodePackRow(data as Record<string, unknown>)
}

export const updateEpisodePackAdmin = async (
  animeId: string | number,
  payload: { title: string | null; download_link: string | null }
): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')

  const { error } = await supabase
    .from('anime')
    .update({
      episode_pack_title: payload.title,
      episode_pack_link: payload.download_link,
    })
    .eq('id', animeId)

  if (error) {
    const msg = String(error.message ?? '')
    if (String(error.code ?? '') === '42703' || msg.toLowerCase().includes('episode_pack')) {
      throw new Error(
        'ستون‌های episode_pack_title و episode_pack_link در جدول anime پیدا نشد. فایل supabase-add-episode-pack.sql را در SQL Editor اجرا کنید.'
      )
    }
    throw error
  }
}

export const getAnimeIdsWithAnyEpisodes = async (
  animeIds: Array<string | number>
): Promise<Set<string>> => {
  const result = new Set<string>()
  if (!hasSupabaseConfig) return result

  const ids = Array.from(
    new Set(
      (animeIds || [])
        .map((x) => (typeof x === 'number' || typeof x === 'string' ? String(x) : ''))
        .map((x) => x.trim())
        .filter(Boolean)
    )
  )
  if (ids.length === 0) return result

  const CHUNK_SIZE = 500
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE)
    const { data, error } = await supabase.from('episodes').select('anime_id').in('anime_id', chunk)
    if (error) {
      console.warn('getAnimeIdsWithAnyEpisodes:', error.message)
      continue
    }
    for (const row of data || []) {
      const id = row?.anime_id
      if (typeof id === 'string' || typeof id === 'number') result.add(String(id))
    }
  }

  return result
}

export type TranslatorItem = {
  id: string | number
  name: string
  slug: string
  avatar_url?: string | null
  cover_url?: string | null
  bio?: string | null
  experience?: string | null
  is_active?: boolean
}

export type TranslatorAnimeLink = {
  id: string | number
  anime_id: string | number
  translator_id: string | number
  role?: string | null
  translator: TranslatorItem
}

export const getTranslatorBySlug = async (slug: string): Promise<TranslatorItem | null> => {
  if (!hasSupabaseConfig) return null

  const safeSlug = String(slug || '').trim()
  if (!safeSlug) return null

  const selectFields = 'id, name, slug, avatar_url, cover_url, bio, experience, is_active'
  let data: any = null
  let error: any = null

  ;({ data, error } = await supabase
    .from('translators')
    .select(selectFields)
    .eq('slug', safeSlug)
    .maybeSingle())

  if (error) {
    const msg = String(error?.message ?? '')
    if (String(error?.code ?? '') === '42703' || msg.toLowerCase().includes('column')) {
      ({ data, error } = await supabase
        .from('translators')
        .select('id, name, slug, avatar_url, bio')
        .eq('slug', safeSlug)
        .maybeSingle())
    }
  }

  if (error) {
    console.warn('getTranslatorBySlug:', error.message)
    return null
  }

  if (!data) return null

  return {
    id: data.id,
    name: String(data.name ?? '').trim() || '---',
    slug: String(data.slug ?? '').trim(),
    avatar_url: typeof data.avatar_url === 'string' ? data.avatar_url : (data.avatar_url ?? null),
    cover_url: typeof data.cover_url === 'string' ? data.cover_url : (data.cover_url ?? null),
    bio: typeof data.bio === 'string' ? data.bio : (data.bio ?? null),
    experience: typeof data.experience === 'string' ? data.experience : (data.experience ?? null),
    is_active:
      typeof data.is_active === 'boolean' ? data.is_active : data.is_active == null ? true : Boolean(data.is_active),
  }
}

export const updateTranslatorExperienceBySlug = async (
  slug: string,
  experience: string | null
): Promise<{ experience: string | null }> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')

  const safeSlug = String(slug || '').trim()
  if (!safeSlug) throw new Error('Translator slug missing')

  const { data, error } = await supabase
    .from('translators')
    .update({ experience })
    .eq('slug', safeSlug)
    .select('experience')
    .maybeSingle()

  if (error) {
    const msg = String(error?.message ?? '')
    if (String(error?.code ?? '') === '42703' || msg.toLowerCase().includes('column')) {
      throw new Error(
        'ستون experience در جدول translators پیدا نشد. لطفاً یک ستون متنی به نام experience اضافه کنید و سپس دوباره تلاش کنید.'
      )
    }
    throw error
  }

  return {
    experience: typeof data?.experience === 'string' ? data.experience : (data?.experience ?? null),
  }
}

export const getTranslatorLinksByAnimeId = async (
  animeId: string | number
): Promise<TranslatorAnimeLink[]> => {
  if (!hasSupabaseConfig) return []

  const { data, error } = await supabase
    .from('translator_anime')
    .select('id, anime_id, translator_id, role, translators(id,name,slug,avatar_url,bio)')
    .eq('anime_id', animeId)
    .order('id', { ascending: true })

  if (error) {
    console.warn('getTranslatorLinksByAnimeId:', error.message)
    return []
  }

  const mapped = (data || []).map((row: any): TranslatorAnimeLink | null => {
    const t = row?.translators
    if (!t) return null
    const translator: TranslatorItem = {
      id: t.id,
      name: String(t.name ?? '').trim() || '---',
      slug: String(t.slug ?? '').trim(),
      avatar_url: typeof t.avatar_url === 'string' ? t.avatar_url : (t.avatar_url ?? null),
      bio: typeof t.bio === 'string' ? t.bio : (t.bio ?? null),
    }

    return {
      id: row.id,
      anime_id: row.anime_id,
      translator_id: row.translator_id,
      role: typeof row.role === 'string' ? row.role : (row.role ?? null),
      translator,
    }
  })

  return mapped.filter((x): x is TranslatorAnimeLink =>
    Boolean(x && x.translator && typeof x.translator.slug === 'string')
  )
}

export const getAnimeCardsByTranslatorSlug = async (slug: string): Promise<AnimeCard[]> => {
  if (!hasSupabaseConfig) return []

  const safeSlug = String(slug || '').trim()
  if (!safeSlug) return []

  const select = `
    anime(
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
    ),
    translators!inner(slug)
  `

  const { data, error } = await supabase
    .from('translator_anime')
    .select(select)
    .eq('translators.slug', safeSlug)

  if (error) {
    console.warn('getAnimeCardsByTranslatorSlug:', error.message)
    return []
  }

  const rows = (data || [])
    .map((row: any) => row?.anime)
    .filter((a: any) => a && (typeof a.id === 'number' || typeof a.id === 'string'))

  return rows.map((a: any) => toAnimeCard(a))
}

export type TranslatorAdminItem = {
  id?: string | number
  name: string
  slug: string
  avatar_url?: string | null
  cover_url?: string | null
  bio?: string | null
  experience?: string | null
  is_active?: boolean
}

export const getAllTranslatorsAdmin = async (): Promise<TranslatorAdminItem[]> => {
  if (!hasSupabaseConfig) return []
  let data: any = null
  let error: any = null

  ;({ data, error } = await supabase
    .from('translators')
    .select('id, name, slug, avatar_url, cover_url, bio, experience, is_active')
    .order('name', { ascending: true }))

  if (error) {
    const msg = String(error?.message ?? '')
    if (String(error?.code ?? '') === '42703' || msg.toLowerCase().includes('column')) {
      ({ data, error } = await supabase
        .from('translators')
        .select('id, name, slug, avatar_url, cover_url, bio, experience')
        .order('name', { ascending: true }))
    }
  }

  if (error) {
    console.warn('getAllTranslatorsAdmin:', error.message)
    return []
  }

  return (data || []).map((row: any) => ({
    id: typeof row.id === 'string' || typeof row.id === 'number' ? row.id : undefined,
    name: String(row.name ?? '').trim(),
    slug: String(row.slug ?? '').trim(),
    avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : (row.avatar_url ?? null),
    cover_url: typeof row.cover_url === 'string' ? row.cover_url : (row.cover_url ?? null),
    bio: typeof row.bio === 'string' ? row.bio : (row.bio ?? null),
    experience: typeof row.experience === 'string' ? row.experience : (row.experience ?? null),
    is_active:
      typeof row.is_active === 'boolean' ? row.is_active : row.is_active == null ? true : Boolean(row.is_active),
  }))
}

export const upsertTranslatorAdmin = async (payload: {
  id?: string | number
  name: string
  slug: string
  avatar_url: string | null
  cover_url?: string | null
  bio: string | null
  experience?: string | null
  is_active?: boolean
}): Promise<TranslatorAdminItem> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')

  const row: any = {
    name: payload.name,
    slug: payload.slug,
    avatar_url: payload.avatar_url,
    bio: payload.bio,
  }
  if (payload.cover_url !== undefined) row.cover_url = payload.cover_url
  if (payload.experience !== undefined) row.experience = payload.experience
  if (payload.is_active !== undefined) row.is_active = Boolean(payload.is_active)
  if (payload.id !== undefined && payload.id !== null && String(payload.id).length > 0) {
    row.id = payload.id
  }

  let data: any = null
  let error: any = null

  ;({ data, error } = await supabase
    .from('translators')
    .upsert(row, { onConflict: row.id ? 'id' : 'slug' })
    .select('id, name, slug, avatar_url, cover_url, bio, experience, is_active')
    .single())

  if (error) {
    const msg = String(error?.message ?? '')
    if (String(error?.code ?? '') === '42703' || msg.toLowerCase().includes('column')) {
      const fallbackRow = { ...row }
      delete fallbackRow.is_active
      ;({ data, error } = await supabase
        .from('translators')
        .upsert(fallbackRow, { onConflict: row.id ? 'id' : 'slug' })
        .select('id, name, slug, avatar_url, cover_url, bio, experience')
        .single())
    }
  }

  if (error) throw error

  return {
    id: typeof data?.id === 'string' || typeof data?.id === 'number' ? data.id : undefined,
    name: String(data?.name ?? '').trim(),
    slug: String(data?.slug ?? '').trim(),
    avatar_url: typeof data?.avatar_url === 'string' ? data.avatar_url : (data?.avatar_url ?? null),
    cover_url: typeof data?.cover_url === 'string' ? data.cover_url : (data?.cover_url ?? null),
    bio: typeof data?.bio === 'string' ? data.bio : (data?.bio ?? null),
    experience: typeof data?.experience === 'string' ? data.experience : (data?.experience ?? null),
    is_active:
      typeof data?.is_active === 'boolean'
        ? data.is_active
        : payload.is_active !== undefined
          ? Boolean(payload.is_active)
          : true,
  }
}

export const deleteTranslatorAdmin = async (translatorId: string | number): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase.from('translators').delete().eq('id', translatorId)
  if (error) throw error
}

export type TranslatorAnimeAdminLink = {
  id: string | number
  anime_id: string | number
  translator_id: string | number
  role?: string | null
  translator: TranslatorAdminItem
}

const mapTranslatorAnimeAdminLinkRow = (row: any): TranslatorAnimeAdminLink | null => {
  const t = row?.translators
  if (!t) return null
  const translator: TranslatorAdminItem = {
    id: typeof t.id === 'string' || typeof t.id === 'number' ? t.id : undefined,
    name: String(t.name ?? '').trim(),
    slug: String(t.slug ?? '').trim(),
    avatar_url: typeof t.avatar_url === 'string' ? t.avatar_url : (t.avatar_url ?? null),
    bio: typeof t.bio === 'string' ? t.bio : (t.bio ?? null),
    is_active:
      typeof t.is_active === 'boolean' ? t.is_active : t.is_active == null ? true : Boolean(t.is_active),
  }

  return {
    id: row.id,
    anime_id: row.anime_id,
    translator_id: row.translator_id,
    role: typeof row.role === 'string' ? row.role : (row.role ?? null),
    translator,
  }
}

export const getTranslatorAnimeLinksAdminByAnimeId = async (
  animeId: string | number
): Promise<TranslatorAnimeAdminLink[]> => {
  if (!hasSupabaseConfig) return []

  let data: any = null
  let error: any = null

  ;({ data, error } = await supabase
    .from('translator_anime')
    .select('id, anime_id, translator_id, role, translators(id,name,slug,avatar_url,bio,is_active)')
    .eq('anime_id', animeId)
    .order('id', { ascending: true }))

  if (error) {
    const msg = String(error?.message ?? '')
    if (String(error?.code ?? '') === '42703' || msg.toLowerCase().includes('column')) {
      ;({ data, error } = await supabase
        .from('translator_anime')
        .select('id, anime_id, translator_id, role, translators(id,name,slug,avatar_url,bio)')
        .eq('anime_id', animeId)
        .order('id', { ascending: true }))
    }
  }

  if (error) {
    console.warn('getTranslatorAnimeLinksAdminByAnimeId:', error.message)
    return []
  }

  const mapped = (data || []).map(mapTranslatorAnimeAdminLinkRow)
  return mapped.filter((x: TranslatorAnimeAdminLink | null): x is TranslatorAnimeAdminLink =>
    Boolean(x && x.translator)
  )
}

export type TranslatorAnimeLinkInsertRow = {
  id: string | number
  anime_id: string | number
  translator_id: string | number
  role: string | null
}

export const insertTranslatorAnimeLinkAdmin = async (payload: {
  anime_id: string | number
  translator_id: string | number
  role: string | null
}): Promise<TranslatorAnimeLinkInsertRow> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { data, error } = await supabase
    .from('translator_anime')
    .insert({
      anime_id: payload.anime_id,
      translator_id: payload.translator_id,
      role: payload.role,
    })
    .select('id, anime_id, translator_id, role')
    .single()

  if (error) throw error
  if (!data) throw new Error('ردیف جدید ذخیره نشد')

  return {
    id: data.id,
    anime_id: data.anime_id,
    translator_id: data.translator_id,
    role: typeof data.role === 'string' ? data.role : (data.role ?? null),
  }
}

export const updateTranslatorAnimeLinkAdmin = async (payload: {
  id: string | number
  translator_id: string | number
  role: string | null
}): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase
    .from('translator_anime')
    .update({
      translator_id: payload.translator_id,
      role: payload.role,
    })
    .eq('id', payload.id)
  if (error) throw error
}

export const deleteTranslatorAnimeLinkAdmin = async (linkId: string | number): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase.from('translator_anime').delete().eq('id', linkId)
  if (error) throw error
}

export const insertSubtitlePackAdmin = async (payload: {
  anime_id: string | number
  title: string | null
  subtitle_link: string | null
}): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase.from('subtitle_packs').insert({
    anime_id: payload.anime_id,
    title: payload.title,
    subtitle_link: payload.subtitle_link,
  })
  if (error) throw error
}

export const updateSubtitlePackAdmin = async (payload: {
  id: string | number
  title: string | null
  subtitle_link: string | null
}): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase
    .from('subtitle_packs')
    .update({
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
    .select('id, title, subtitle_link')
    .eq('anime_id', animeId)
    .order('id', { ascending: true })

  if (error) {
    console.warn('getSubtitlePacksByAnimeId:', error.message)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
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
    .select('id, episode_number, title, download_link')
    .eq('anime_id', animeId)
    .order('episode_number', { ascending: true })
  if (error) {
    console.warn('getEpisodesByAnimeId:', error.message)
    return []
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    number: row.episode_number ?? 0,
    title: row.title || `قسمت ${row.episode_number ?? 0}`,
    download_link: row.download_link ?? undefined,
  }))
}

export const getSubtitlesByAnimeId = async (animeId: string | number): Promise<SubtitleItem[]> => {
  if (!hasSupabaseConfig) return []

  const { data, error } = await supabase
    .from('subtitles')
    .select('id, episode_number, title, subtitle_link')
    .eq('anime_id', animeId)
    .order('episode_number', { ascending: true })

  if (error) {
    console.warn('getSubtitlesByAnimeId:', error.message)
    return []
  }

  return (data || []).map((row: any) => {
    return {
      id: row.id,
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

export const deleteGenre = async (payload: {
  id?: number | string
  slug?: string
}): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')

  if (payload.id === undefined && !payload.slug) throw new Error('Genre id/slug missing')

  let q = supabase.from('genres').delete()
  if (payload.id !== undefined) q = q.eq('id', payload.id)
  else q = q.eq('slug', String(payload.slug ?? ''))

  const { error } = await q
  if (error) throw error
}

export type AnimeAdminEditor = {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  username?: string | null
}

export type AnimeAdminRow = {
  id: number | string
  title?: string | null
  synopsis?: string | null
  format?: string | null
  season?: string | null
  year?: number | null
  anilist_id?: number | null
  mal_id?: number | null
  imdb_id?: string | null
  mal_score?: number | null
  imdb_score?: number | null
  featured_image?: string | null
  cover_image?: string | null
  is_featured?: boolean | null
  airing_status?: string | null
  average_score?: number | null
  episodes_count?: number | null
  studio?: string | null
  start_date?: string | null
  end_date?: string | null
  episode_pack_title?: string | null
  episode_pack_link?: string | null
  updated_at?: string | null
  last_edited_by?: number | null
  last_editor?: AnimeAdminEditor | null
}

export const getAnimeAdminById = async (animeId: string | number): Promise<AnimeAdminRow> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')

  const selectWithEpisodePack =
    `id, title, synopsis, format, season, year, anilist_id, mal_id, imdb_id, mal_score, imdb_score, featured_image, ${IMAGE_COLUMN}, is_featured, airing_status, average_score, episodes_count, studio, start_date, end_date, episode_pack_title, episode_pack_link` as any as string

  const selectWithAniList =
    `id, title, synopsis, format, season, year, anilist_id, mal_id, imdb_id, mal_score, imdb_score, featured_image, ${IMAGE_COLUMN}, is_featured, airing_status, average_score, episodes_count, studio, start_date, end_date` as any as string

  const selectWithoutAniList =
    `id, title, synopsis, format, season, year, featured_image, ${IMAGE_COLUMN}, is_featured, airing_status, average_score, episodes_count, studio, start_date, end_date` as any as string

  const selectWithExternalScores =
    `id, title, synopsis, format, season, year, anilist_id, mal_id, imdb_id, mal_score, imdb_score, featured_image, ${IMAGE_COLUMN}, is_featured, airing_status, average_score, episodes_count, studio, start_date, end_date` as any as string

  const selectMinimal =
    `id, title, synopsis, format, season, year, anilist_id, featured_image, ${IMAGE_COLUMN}, is_featured, airing_status, average_score, episodes_count, studio, start_date, end_date` as any as string

  let data: any = null

  const queries = [
    selectWithEpisodePack,
    selectWithExternalScores,
    selectWithAniList,
    selectMinimal,
    selectWithoutAniList,
  ]
  let lastError: any = null

  for (const select of queries) {
    const res = await (supabase.from('anime').select(select).eq('id', animeId).single() as any)
    if (!res.error) {
      data = res.data
      break
    }
    lastError = res.error
  }

  if (!data) throw lastError ?? new Error('Anime not found')

  const row: any = data

  const numOrNull = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  let updatedAt: string | null = null
  let lastEditedBy: number | null = null
  let lastEditor: AnimeAdminEditor | null = null

  try {
    const auditRes = await supabase
      .from('anime')
      .select(
        'updated_at, last_edited_by, last_editor:telegram_users!anime_last_edited_by_fkey(first_name, last_name, email, username)'
      )
      .eq('id', animeId)
      .maybeSingle()

    if (!auditRes.error && auditRes.data) {
      const audit = auditRes.data as Record<string, unknown>
      updatedAt = typeof audit.updated_at === 'string' ? audit.updated_at : null
      lastEditedBy = numOrNull(audit.last_edited_by)
      const editorRaw = audit.last_editor
      if (editorRaw && typeof editorRaw === 'object' && !Array.isArray(editorRaw)) {
        const e = editorRaw as Record<string, unknown>
        lastEditor = {
          first_name: e.first_name != null ? String(e.first_name) : null,
          last_name: e.last_name != null ? String(e.last_name) : null,
          email: e.email != null ? String(e.email) : null,
          username: e.username != null ? String(e.username) : null,
        }
      }
    }
  } catch {
    // audit columns not migrated yet
  }

  return {
    id: row.id,
    title: row.title ?? null,
    synopsis: row.synopsis ?? null,
    format: row.format ?? null,
    season: row.season ?? null,
    year: typeof row.year === 'number' ? row.year : (row.year ?? null),
    anilist_id: numOrNull(row.anilist_id),
    mal_id: numOrNull(row.mal_id),
    imdb_id: typeof row.imdb_id === 'string' && row.imdb_id.trim() ? row.imdb_id.trim() : null,
    mal_score: numOrNull(row.mal_score),
    imdb_score: numOrNull(row.imdb_score),
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
    episode_pack_title:
      typeof row.episode_pack_title === 'string' ? row.episode_pack_title : (row.episode_pack_title ?? null),
    episode_pack_link:
      typeof row.episode_pack_link === 'string' ? row.episode_pack_link : (row.episode_pack_link ?? null),
    updated_at: updatedAt,
    last_edited_by: lastEditedBy,
    last_editor: lastEditor,
  }
}

export const upsertAnimeAdmin = async (payload: {
  id?: number | string
  title: string
  synopsis: string | null
  format: string | null
  season: string | null
  year: number | null
  anilist_id?: number | null
  mal_id?: number | null
  imdb_id?: string | null
  mal_score?: number | null
  imdb_score?: number | null
  genre_slugs?: string[]
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

  const genreSlugs = payload.genre_slugs

  const row: Record<string, unknown> = {
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
  if (payload.anilist_id !== undefined) row.anilist_id = payload.anilist_id
  if (payload.mal_id !== undefined) row.mal_id = payload.mal_id
  if (payload.imdb_id !== undefined) row.imdb_id = payload.imdb_id
  if (payload.mal_score !== undefined) row.mal_score = payload.mal_score
  if (payload.imdb_score !== undefined) row.imdb_score = payload.imdb_score

  row[IMAGE_COLUMN] = payload.cover_image
  if (payload.id !== undefined && payload.id !== null) row.id = payload.id

  const externalOnlyKeys = ['mal_id', 'imdb_id', 'mal_score', 'imdb_score'] as const

  const runUpsert = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from('anime')
      .upsert(body, { onConflict: 'id' })
      .select('id')
      .single()
    if (error) throw error
    return data.id as string | number
  }

  let animeId: string | number

  try {
    animeId = await runUpsert(row)
  } catch (firstError: unknown) {
    const msg = formatSupabaseError(firstError)
    const missingExternal = externalOnlyKeys.some((key) => isMissingColumnError(msg, key))

    if (missingExternal) {
      const fallback: Record<string, unknown> = { ...row }
      for (const key of externalOnlyKeys) delete fallback[key]

      try {
        animeId = await runUpsert(fallback)
      } catch {
        throw firstError
      }

      throw new Error(
        `${msg}\n\nستون‌های MAL/IMDb هنوز در Supabase ساخته نشده‌اند. فایل supabase-add-external-ids-scores.sql را در SQL Editor اجرا کنید.`
      )
    }

    throw firstError
  }

  if (genreSlugs !== undefined) {
    await replaceAnimeGenres(animeId, genreSlugs)
  }

  return { id: animeId }
}

export type AnimeExternalMeta = {
  averageScore?: number
  malScore?: number
  imdbScore?: number
  shioriScore?: number
  anilist_id?: number
  mal_id?: number
  imdb_id?: string
}

const parseExternalMetaRow = (row: Record<string, unknown>): AnimeExternalMeta => {
  const num = (v: unknown): number | undefined => {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (v != null && v !== '') {
      const n = Number(v)
      if (Number.isFinite(n)) return n
    }
    return undefined
  }

  return {
    averageScore: num(row.average_score),
    malScore: num(row.mal_score),
    imdbScore: num(row.imdb_score),
    shioriScore: num(row.shiori_score),
    anilist_id: num(row.anilist_id),
    mal_id: num(row.mal_id),
    imdb_id:
      typeof row.imdb_id === 'string' && row.imdb_id.trim() ? row.imdb_id.trim() : undefined,
  }
}

/** فیلدهای امتیاز/شناسه — مستقیم از DB برای صفحه جزئیات */
export const getAnimeExternalMetaById = async (
  animeId: string | number
): Promise<AnimeExternalMeta> => {
  if (!hasSupabaseConfig) return {}

  const selects = [
    'average_score, mal_score, imdb_score, shiori_score, mal_id, imdb_id, anilist_id',
    'average_score, mal_score, imdb_score, mal_id, imdb_id, anilist_id',
    'average_score, imdb_score, imdb_id, mal_id',
    'average_score',
  ]

  for (const select of selects) {
    const { data, error } = await supabase
      .from('anime')
      .select(select)
      .eq('id', animeId)
      .maybeSingle()

    if (!error && data) {
      return parseExternalMetaRow(data as unknown as Record<string, unknown>)
    }
  }

  return {}
}

/** کش امتیازهای زنده در DB (فقط ستون‌های خالی؛ نیاز به RPC cache_anime_external_scores) */
export const cacheExternalScoresToDb = async (
  animeId: string | number,
  scores: {
    anilistScore?: number | null
    malScore?: number | null
    imdbScore?: number | null
  },
  existing: {
    averageScore?: number | null
    malScore?: number | null
    imdbScore?: number | null
  }
): Promise<void> => {
  if (!hasSupabaseConfig) return

  const average_score =
    existing.averageScore == null &&
    typeof scores.anilistScore === 'number' &&
    Number.isFinite(scores.anilistScore) &&
    scores.anilistScore > 0
      ? scores.anilistScore
      : null

  const mal_score =
    existing.malScore == null &&
    typeof scores.malScore === 'number' &&
    Number.isFinite(scores.malScore)
      ? scores.malScore
      : null

  const imdb_score =
    existing.imdbScore == null &&
    typeof scores.imdbScore === 'number' &&
    Number.isFinite(scores.imdbScore)
      ? scores.imdbScore
      : null

  if (average_score === null && mal_score === null && imdb_score === null) return

  const { error } = await supabase.rpc('cache_anime_external_scores', {
    p_anime_id: animeId,
    p_average_score: average_score,
    p_mal_score: mal_score,
    p_imdb_score: imdb_score,
  })

  if (error && import.meta.env.DEV) {
    console.warn('cacheExternalScoresToDb:', error.message)
  }
}

export const getLocalAnimeIdByAniListId = async (
  anilistId: number
): Promise<string | number | null> => {
  if (!hasSupabaseConfig) return null

  const { data, error } = await (supabase
    .from('anime')
    .select('id')
    .eq('anilist_id', anilistId)
    .maybeSingle() as any)

  if (error) {
    if (import.meta.env.DEV) console.warn('getLocalAnimeIdByAniListId:', error.message)
    return null
  }

  const id = data?.id
  return typeof id === 'string' || typeof id === 'number' ? id : null
}

export type EpisodeAdminRow = {
  id: number | string
  anime_id: number | string
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
    .select('id, anime_id, episode_number, title, download_link')
    .eq('anime_id', animeId)
    .order('episode_number', { ascending: true })

  if (error) {
    console.warn('getEpisodesAdminByAnimeId:', error.message)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    anime_id: row.anime_id,
    episode_number:
      typeof row.episode_number === 'number' ? row.episode_number : (row.episode_number ?? null),
    title: row.title ?? null,
    download_link: row.download_link ?? null,
  }))
}

export const insertEpisodeAdmin = async (payload: {
  anime_id: string | number
  episode_number: number
  title: string | null
  download_link: string | null
}): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase.from('episodes').insert({
    anime_id: payload.anime_id,
    episode_number: payload.episode_number,
    title: payload.title,
    download_link: payload.download_link,
  })
  if (error) throw error
}

export const updateEpisodeAdmin = async (payload: {
  id: string | number
  episode_number: number
  title: string | null
  download_link: string | null
}): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase
    .from('episodes')
    .update({
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
  episode_number?: number | null
  subtitle_link?: string | null
}

export const getSubtitlesAdminByAnimeId = async (
  animeId: string | number
): Promise<SubtitleAdminRow[]> => {
  if (!hasSupabaseConfig) return []
  const { data, error } = await supabase
    .from('subtitles')
    .select('id, anime_id, episode_number, subtitle_link')
    .eq('anime_id', animeId)
    .order('episode_number', { ascending: true })

  if (error) {
    console.warn('getSubtitlesAdminByAnimeId:', error.message)
    return []
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    anime_id: row.anime_id,
    episode_number:
      typeof row.episode_number === 'number' ? row.episode_number : (row.episode_number ?? null),
    subtitle_link: row.subtitle_link ?? null,
  }))
}

export const insertSubtitleAdmin = async (payload: {
  anime_id: string | number
  episode_number: number
  subtitle_link: string | null
}): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase.from('subtitles').insert({
    anime_id: payload.anime_id,
    episode_number: payload.episode_number,
    subtitle_link: payload.subtitle_link,
  })
  if (error) throw error
}

export const updateSubtitleAdmin = async (payload: {
  id: string | number
  episode_number: number
  subtitle_link: string | null
}): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase
    .from('subtitles')
    .update({
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

  const insById = await supabase.from('anime_genres').insert(rowsById)
  if (insById.error) throw insById.error
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

export const deleteStudioAdmin = async (studioId: string | number): Promise<void> => {
  if (!hasSupabaseConfig) throw new Error('Supabase config missing')
  const { error } = await supabase.from('studios').delete().eq('id', studioId)
  if (error) throw error
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

export type AnimeStudioPublicLink = {
  slug: string
  name: string
}

export const getAnimeStudiosPublic = async (
  animeId: string | number
): Promise<AnimeStudioPublicLink[]> => {
  if (!hasSupabaseConfig) return []
  const res = await supabase
    .from('anime_studios')
    .select('studios(slug,name)')
    .eq('anime_id', animeId)

  if (res.error) {
    console.warn('getAnimeStudiosPublic:', res.error.message)
    return []
  }

  return (res.data || [])
    .map((r: any) => r?.studios)
    .filter((s: any) => s && typeof s === 'object')
    .map((s: any) => ({
      slug: String(s.slug ?? '').trim(),
      name: String(s.name ?? '').trim(),
    }))
    .filter((s: any) => typeof s.slug === 'string' && s.slug.length > 0)
}

export type StudioPublicItem = {
  slug: string
  name: string
}

export const getStudioBySlug = async (slug: string): Promise<StudioPublicItem | null> => {
  if (!hasSupabaseConfig) return null
  const safeSlug = String(slug ?? '')
    .trim()
    .toLowerCase()
  if (!safeSlug) return null

  const { data, error } = await supabase
    .from('studios')
    .select('slug,name')
    .eq('slug', safeSlug)
    .maybeSingle()

  if (error) {
    console.warn('getStudioBySlug:', error.message)
    return null
  }
  if (!data) return null
  return {
    slug: String((data as any).slug ?? '').trim(),
    name: String((data as any).name ?? '').trim(),
  }
}

export const getStudioByName = async (name: string): Promise<StudioPublicItem | null> => {
  if (!hasSupabaseConfig) return null
  const safeName = String(name ?? '').trim()
  if (!safeName) return null

  const { data, error } = await supabase
    .from('studios')
    .select('slug,name')
    .eq('name', safeName)
    .maybeSingle()

  if (error) {
    console.warn('getStudioByName:', error.message)
    return null
  }
  if (!data) return null
  return {
    slug: String((data as any).slug ?? '').trim(),
    name: String((data as any).name ?? '').trim(),
  }
}

export const getAnimeCardsByStudioSlug = async (studioSlug: string): Promise<AnimeCard[]> => {
  if (!hasSupabaseConfig) return []
  const safeSlug = String(studioSlug ?? '')
    .trim()
    .toLowerCase()
  if (!safeSlug) return []

  const { data, error } = await supabase
    .from('anime_studios')
    .select(`anime(${ANIME_CARD_SELECT_WITH_GENRES}), studios!inner(slug)`)
    .eq('studios.slug', safeSlug)

  if (error) {
    console.warn('getAnimeCardsByStudioSlug:', error.message)
    return []
  }

  return (data || [])
    .map((row: any) => row?.anime)
    .filter((row: any) => row && (typeof row.id === 'number' || typeof row.id === 'string'))
    .map(toAnimeCard)
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
