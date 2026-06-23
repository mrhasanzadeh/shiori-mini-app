export type GenreItem = {
  slug: string
  name_en?: string
  name_fa?: string
}

export type AnimeCard = {
  id: number | string
  slug?: string | null
  title: string
  title_romaji?: string | null
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

export type EpisodeItem = {
  id: string | number
  number: number
  title: string
  download_link?: string
}

export type SubtitlePackItem = {
  id: string | number
  title?: string
  subtitle_link?: string
}

export type GenreAdminItem = {
  id?: number | string
  slug: string
  name_en?: string | null
  name_fa?: string | null
}

export type StudioPublicItem = {
  slug: string
  name: string
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

export type AnimeSeriesMemberPublic = {
  id: string | number
  slug?: string | null
  title: string
  image?: string
  sort_order: number
  label_fa: string | null
}

export type AnimeSeriesPublic = {
  series_id: string
  title: string
  members: AnimeSeriesMemberPublic[]
}
