export const normalizeAnimeSlug = (value: string): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const isAnimeUuid = (value: string | null | undefined): boolean =>
  UUID_RE.test(String(value ?? '').trim())

export type AnimeRouteRef = {
  id: string | number
  slug?: string | null
  title?: string
}

export const animeCardMatchesRouteParam = (
  anime: AnimeRouteRef,
  routeParam: string,
): boolean => {
  const raw = String(routeParam ?? '').trim()
  if (!raw) return false
  if (String(anime.id) === raw) return true

  const slug = String(anime.slug ?? '').trim()
  if (slug && (slug === raw || normalizeAnimeSlug(slug) === normalizeAnimeSlug(raw))) {
    return true
  }

  const derived = normalizeAnimeSlug(String(anime.title ?? ''))
  return derived.length > 0 && derived === normalizeAnimeSlug(raw)
}

/** Public URL segment: slug when set, otherwise id. */
export const animePublicSegment = (anime: AnimeRouteRef): string => {
  const slug = String(anime.slug ?? '').trim()
  return slug || String(anime.id)
}

export const animeDetailPath = (anime: AnimeRouteRef): string =>
  `/anime/${encodeURIComponent(animePublicSegment(anime))}`
