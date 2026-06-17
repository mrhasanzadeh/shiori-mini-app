import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query'
import {
  buildAnimeDetailPlaceholder,
  fetchAllAnimeCards,
  fetchAnimeById,
  fetchAnimeList,
  fetchAnimeSearch,
  fetchSchedule,
  fetchSimilarAnime,
  type AnimeSearchFilters,
  type UiAnimeCard,
} from '../../utils/api'
import { getTranslatorLinksByAnimeId } from '../../services/catalogSource'
import { fetchExternalScores } from '../../services/externalScores'
import { getAnimeFavoriteCount, getAnimeFavoriteCounts } from '../../services/userDataSource'
import { queryClient } from '../../lib/queryClient'
import { queryKeys } from './keys'

export type AnimeSearchBaseFilters = Omit<AnimeSearchFilters, 'limit' | 'offset'>

export const buildAnimeSearchQueryKey = (filters: AnimeSearchBaseFilters) =>
  queryKeys.animeSearch({
    query: filters.query ?? '',
    year: filters.year ?? null,
    season: filters.season ?? null,
    genreSlug: filters.genreSlug ?? null,
  })

export const useAnimeCardsQuery = () =>
  useQuery({
    queryKey: queryKeys.animeCards,
    queryFn: fetchAllAnimeCards,
  })

export const useAnimeFavoriteCountsQuery = () =>
  useQuery({
    queryKey: queryKeys.animeFavoriteCounts,
    queryFn: getAnimeFavoriteCounts,
    staleTime: 60_000,
  })

export const useAnimeFavoriteCountQuery = (animeId: string | number | undefined) =>
  useQuery({
    queryKey: queryKeys.animeFavoriteCount(animeId ?? ''),
    queryFn: () => getAnimeFavoriteCount(animeId!),
    enabled: Boolean(animeId),
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  })

const findAnimeCardPlaceholder = (id: string | number): UiAnimeCard | undefined => {
  const cards = queryClient.getQueryData<UiAnimeCard[]>(queryKeys.animeCards)
  const fromCards = cards?.find((c) => String(c.id) === String(id))
  if (fromCards) return fromCards

  const searchQueries = queryClient.getQueriesData<{ items: UiAnimeCard[] }>({
    queryKey: ['anime', 'search'],
  })
  for (const [, data] of searchQueries) {
    const hit = data?.items?.find((c) => String(c.id) === String(id))
    if (hit) return hit
  }

  return undefined
}

export const useAnimeDetailQuery = (id: string | number | undefined) =>
  useQuery({
    queryKey: queryKeys.animeDetail(id ?? ''),
    queryFn: () => fetchAnimeById(id!),
    enabled: Boolean(id),
    placeholderData: (previousData) => {
      if (previousData && String(previousData.id) === String(id)) return previousData
      if (!id) return undefined
      const card = findAnimeCardPlaceholder(id)
      return card ? buildAnimeDetailPlaceholder(card) : undefined
    },
  })

export const useAnimeListQuery = () =>
  useQuery({
    queryKey: queryKeys.animeList,
    queryFn: () => fetchAnimeList(),
  })

export const useScheduleQuery = () =>
  useQuery({
    queryKey: queryKeys.schedule,
    queryFn: fetchSchedule,
  })

export const useAnimeSearchQuery = (filters: AnimeSearchFilters, enabled = true) =>
  useQuery({
    queryKey: buildAnimeSearchQueryKey(filters),
    queryFn: () => fetchAnimeSearch(filters),
    enabled,
  })

const DEFAULT_SEARCH_PAGE_SIZE = 48

export const useInfiniteAnimeSearchQuery = (
  filters: AnimeSearchBaseFilters,
  pageSize = DEFAULT_SEARCH_PAGE_SIZE
) =>
  useInfiniteQuery({
    queryKey: [...buildAnimeSearchQueryKey(filters), 'infinite', pageSize] as const,
    queryFn: ({ pageParam }) =>
      fetchAnimeSearch({
        ...filters,
        limit: pageSize,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined
      return allPages.reduce((sum, page) => sum + page.items.length, 0)
    },
  })

export const useFavoriteAnimeDetailsQueries = (ids: (string | number)[]) =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.animeDetail(id),
      queryFn: () => fetchAnimeById(id),
      enabled: ids.length > 0,
    })),
  })

export const useSimilarAnimeQuery = (
  animeId: string | number | undefined,
  genreSlugs: string[],
  enabled: boolean
) =>
  useQuery({
    queryKey: queryKeys.similarAnime(animeId ?? '', genreSlugs),
    queryFn: () => fetchSimilarAnime(animeId!, genreSlugs, 12),
    enabled: enabled && Boolean(animeId) && genreSlugs.length > 0,
  })

export const useTranslatorLinksQuery = (
  animeId: string | number | undefined,
  enabled = true
) =>
  useQuery({
    queryKey: queryKeys.translatorLinks(animeId ?? ''),
    queryFn: () => getTranslatorLinksByAnimeId(animeId!),
    enabled: enabled && Boolean(animeId),
  })

export const useExternalScoresQuery = (
  ids: {
    anilist_id?: number | null
    mal_id?: number | null
    imdb_id?: string | null
  },
  enabled = true
) =>
  useQuery({
    queryKey: queryKeys.externalScores(ids),
    queryFn: () => fetchExternalScores(ids),
    enabled:
      enabled &&
      (Boolean(ids.anilist_id && ids.anilist_id > 0) ||
        Boolean(ids.mal_id && ids.mal_id > 0) ||
        Boolean(ids.imdb_id && String(ids.imdb_id).trim())),
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  })

/** فیلتر section روی لیست cache‌شده (بدون درخواست جدید) */
export { filterAnimeCardsBySection } from '../../utils/api'

export type { UiAnimeCard }
