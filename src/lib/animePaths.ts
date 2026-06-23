export type AnimeRouteRef = {
  id: string | number
  slug?: string | null
}

/** Public URL segment: slug when set, otherwise id. */
export const animePublicSegment = (anime: AnimeRouteRef): string => {
  const slug = String(anime.slug ?? '').trim()
  return slug || String(anime.id)
}

export const animeDetailPath = (anime: AnimeRouteRef): string =>
  `/anime/${encodeURIComponent(animePublicSegment(anime))}`
