import {
  animeCardMatchesRouteParam,
  isAnimeUuid,
  normalizeAnimeSlug,
  type AnimeRouteRef,
} from '@/lib/animePaths'
import * as catalog from '@/services/catalogSource'

let cachedCards: AnimeRouteRef[] | null = null
let cachedCardsPromise: Promise<AnimeRouteRef[]> | null = null

const loadCatalogCards = async (): Promise<AnimeRouteRef[]> => {
  if (cachedCards) return cachedCards
  if (!cachedCardsPromise) {
    cachedCardsPromise = catalog
      .getAllAnime()
      .then((rows) => {
        cachedCards = rows
        return rows
      })
      .catch((error) => {
        cachedCardsPromise = null
        throw error
      })
  }
  return cachedCardsPromise
}

const findCardByRouteParam = (
  cards: AnimeRouteRef[],
  routeParam: string,
): AnimeRouteRef | undefined => cards.find((card) => animeCardMatchesRouteParam(card, routeParam))

/**
 * Resolve public route param (uuid or slug) to catalog record id.
 * Avoids calling GET /anime-catalog/:slug on APIs that only accept uuid.
 */
export const resolveCatalogAnimeRecordId = async (
  routeParam: string | number,
  prefetchedCards?: AnimeRouteRef[],
): Promise<string | number> => {
  const raw = String(routeParam ?? '').trim()
  if (!raw) throw new Error('شناسه انیمه نامعتبر است')
  if (isAnimeUuid(raw)) return raw

  const fromPrefetched = prefetchedCards
    ? findCardByRouteParam(prefetchedCards, raw)
    : undefined
  if (fromPrefetched) return fromPrefetched.id

  const cards = prefetchedCards ?? (await loadCatalogCards())
  const match = findCardByRouteParam(cards, raw)
  if (match) return match.id

  const normalized = normalizeAnimeSlug(raw)
  if (normalized !== raw) {
    const alt = cards.find((card) => String(card.slug ?? '').trim() === normalized)
    if (alt) return alt.id
  }

  const search = await catalog.searchAnimeCards({ query: raw, limit: 50 })
  const fromSearch = findCardByRouteParam(search.items ?? [], raw)
  if (fromSearch) return fromSearch.id

  if (normalized !== raw) {
    const altSearch = await catalog.searchAnimeCards({ query: normalized, limit: 50 })
    const fromAltSearch = findCardByRouteParam(altSearch.items ?? [], raw)
    if (fromAltSearch) return fromAltSearch.id
  }

  throw new Error(`انیمه با اسلاگ «${raw}» پیدا نشد`)
}

export const invalidateCatalogAnimeResolverCache = () => {
  cachedCards = null
  cachedCardsPromise = null
}
