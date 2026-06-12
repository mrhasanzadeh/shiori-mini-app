export type GenreItem = {
  slug: string
  name_en?: string
  name_fa?: string
}

export type CatalogAnimeCard = {
  id: string | number
  title: string
  title_romaji: string | null
  image: string
  synopsis: string
  format: string | null
  episodes_count: number
  year: number | null
  is_featured: boolean
  genres: GenreItem[]
}

export type CatalogAnimeDetail = CatalogAnimeCard & {
  airing_status: string | null
  season: string | null
  studio: string | null
  average_score: number | null
  series: CatalogSeries | null
}

export type CatalogSeriesMember = {
  id: string | number
  title: string
  image: string
  sort_order: number
  label_fa: string | null
}

export type CatalogSeries = {
  series_id: string
  title: string
  members: CatalogSeriesMember[]
}
