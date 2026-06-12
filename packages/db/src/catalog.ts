import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  CatalogAnimeCard,
  CatalogAnimeDetail,
  CatalogSeries,
  CatalogSeriesMember,
  GenreItem,
} from './types'

export type ShioriDbConfig = {
  supabaseUrl: string
  supabaseAnonKey: string
  imageColumn?: string
}

const parseId = (value: unknown): string | number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) return value.trim()
  return null
}

const mapGenres = (row: Record<string, unknown>): GenreItem[] => {
  const joins = row.anime_genres
  if (!Array.isArray(joins)) return []

  return joins.flatMap((join) => {
    const g = (join as { genres?: Record<string, unknown> })?.genres
    if (!g || typeof g.slug !== 'string') return []
    return [
      {
        slug: g.slug,
        name_en: typeof g.name_en === 'string' ? g.name_en : undefined,
        name_fa: typeof g.name_fa === 'string' ? g.name_fa : undefined,
      },
    ]
  })
}

export const createShioriDb = (config: ShioriDbConfig) => {
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey)
  const imageColumn = config.imageColumn?.trim() || 'cover_image'

  const getImageUrl = (row: Record<string, unknown>): string => {
    const fromColumn = row[imageColumn]
    if (typeof fromColumn === 'string' && fromColumn.trim()) return fromColumn.trim()
    for (const key of [imageColumn, 'featured_image', 'cover_image', 'poster', 'image']) {
      const v = row[key]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
    return ''
  }

  const cardSelect = `
    id,
    title,
    title_romaji,
    cover_image,
    featured_image,
    synopsis,
    format,
    airing_status,
    average_score,
    episodes_count,
    studio,
    season,
    year,
    is_featured,
    anime_genres(genres(slug,name_en,name_fa))
  `

  const cardSelectNoGenres = `
    id,
    title,
    title_romaji,
    cover_image,
    featured_image,
    synopsis,
    format,
    airing_status,
    average_score,
    episodes_count,
    studio,
    season,
    year,
    is_featured
  `

  const mapCard = (row: Record<string, unknown>): CatalogAnimeCard | null => {
    const id = parseId(row.id)
    const title = typeof row.title === 'string' ? row.title.trim() : ''
    if (id == null || !title) return null

    return {
      id,
      title,
      title_romaji:
        typeof row.title_romaji === 'string' && row.title_romaji.trim()
          ? row.title_romaji.trim()
          : null,
      image: getImageUrl(row),
      synopsis: typeof row.synopsis === 'string' ? row.synopsis.trim() : '',
      format: typeof row.format === 'string' ? row.format : null,
      episodes_count:
        typeof row.episodes_count === 'number' && Number.isFinite(row.episodes_count)
          ? row.episodes_count
          : 0,
      year: typeof row.year === 'number' && Number.isFinite(row.year) ? row.year : null,
      is_featured: Boolean(row.is_featured),
      genres: mapGenres(row),
    }
  }

  const fetchCatalogRows = async (): Promise<Record<string, unknown>[]> => {
    const withGenres = await supabase.from('anime').select(cardSelect).order('created_at', {
      ascending: false,
    })
    if (!withGenres.error && withGenres.data) {
      return withGenres.data as unknown as Record<string, unknown>[]
    }

    const fallback = await supabase
      .from('anime')
      .select(cardSelectNoGenres)
      .order('created_at', { ascending: false })
    if (fallback.error) throw new Error(fallback.error.message)
    return (fallback.data ?? []) as unknown as Record<string, unknown>[]
  }

  const fetchSeries = async (animeId: string | number): Promise<CatalogSeries | null> => {
    const membershipRes = await supabase
      .from('anime_series_members')
      .select('series_id')
      .eq('anime_id', animeId)
      .maybeSingle()

    if (membershipRes.error || !membershipRes.data?.series_id) return null

    const seriesId = String(membershipRes.data.series_id)
    const [seriesRes, membersRes] = await Promise.all([
      supabase.from('anime_series').select('id, title').eq('id', seriesId).maybeSingle(),
      supabase
        .from('anime_series_members')
        .select('anime_id, sort_order, label_fa')
        .eq('series_id', seriesId)
        .order('sort_order', { ascending: true }),
    ])

    if (membersRes.error || !membersRes.data?.length) return null

    const animeIds = membersRes.data
      .map((row) => parseId(row.anime_id))
      .filter((id): id is string | number => id != null)

    if (animeIds.length <= 1) return null

    const metaRes = await supabase
      .from('anime')
      .select('id, title, cover_image, featured_image')
      .in('id', animeIds)

    const metaById = new Map<string, { title: string; image: string }>()
    for (const row of (metaRes.data ?? []) as unknown as Record<string, unknown>[]) {
      const id = parseId(row.id)
      const title = typeof row.title === 'string' ? row.title.trim() : ''
      if (id != null && title) metaById.set(String(id), { title, image: getImageUrl(row) })
    }

    const members: CatalogSeriesMember[] = membersRes.data.flatMap((row) => {
      const id = parseId(row.anime_id)
      if (id == null) return []
      const meta = metaById.get(String(id))
      if (!meta) return []
      return [
        {
          id,
          title: meta.title,
          image: meta.image,
          sort_order:
            typeof row.sort_order === 'number' && Number.isFinite(row.sort_order)
              ? row.sort_order
              : 1,
          label_fa:
            typeof row.label_fa === 'string' && row.label_fa.trim() ? row.label_fa.trim() : null,
        },
      ]
    })

    if (members.length <= 1) return null

    return {
      series_id: seriesId,
      title: typeof seriesRes.data?.title === 'string' ? seriesRes.data.title.trim() : '',
      members,
    }
  }

  return {
    supabase: supabase as SupabaseClient,

    async fetchCatalog(): Promise<CatalogAnimeCard[]> {
      const rows = await fetchCatalogRows()
      return rows.map(mapCard).filter((row): row is CatalogAnimeCard => row != null)
    },

    async fetchAnimeById(id: string | number): Promise<CatalogAnimeDetail | null> {
      const withGenres = await supabase.from('anime').select(cardSelect).eq('id', id).maybeSingle()
      let row = withGenres.data as unknown as Record<string, unknown> | null
      if (withGenres.error || !row) {
        const fallback = await supabase
          .from('anime')
          .select(cardSelectNoGenres)
          .eq('id', id)
          .maybeSingle()
        if (fallback.error || !fallback.data) return null
        row = fallback.data as unknown as Record<string, unknown>
      }

      const card = mapCard(row)
      if (!card) return null

      let series: CatalogSeries | null = null
      try {
        series = await fetchSeries(id)
      } catch {
        series = null
      }

      return {
        ...card,
        airing_status:
          typeof row.airing_status === 'string' ? row.airing_status : null,
        season: typeof row.season === 'string' ? row.season : null,
        studio: typeof row.studio === 'string' ? row.studio : null,
        average_score:
          typeof row.average_score === 'number' && Number.isFinite(row.average_score)
            ? row.average_score
            : null,
        series,
      }
    },

    async fetchAllAnimeIds(): Promise<Array<string | number>> {
      const { data, error } = await supabase.from('anime').select('id').order('created_at', {
        ascending: false,
      })
      if (error) throw new Error(error.message)
      return (data ?? [])
        .map((row) => parseId((row as { id?: unknown }).id))
        .filter((id): id is string | number => id != null)
    },
  }
}

export type ShioriDb = ReturnType<typeof createShioriDb>
