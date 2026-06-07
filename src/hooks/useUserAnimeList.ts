import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTelegramApp } from './useTelegramApp'
import { useAnimeStore, type FavoriteProgress } from '../store/animeStore'
import {
  computeUserListStats,
  getUserAnimeList,
  removeUserAnimeListEntry,
  upsertUserAnimeListEntry,
} from '../services/supabaseUserList'
import { queryKeys } from './queries/keys'

const toProgress = (row: {
  episodes_watched: number
  user_rating: number | null
}): FavoriteProgress => ({
  episodesWatched: row.episodes_watched,
  userRating: row.user_rating,
})

export const useUserAnimeList = () => {
  const { user, isReady } = useTelegramApp()
  const telegramUserId = user?.id
  const queryClient = useQueryClient()
  const syncedRef = useRef(false)

  const favoriteAnime = useAnimeStore((s) => s.favoriteAnime)
  const favoriteProgress = useAnimeStore((s) => s.favoriteProgress)
  const addToFavorites = useAnimeStore((s) => s.addToFavorites)
  const removeFromFavorites = useAnimeStore((s) => s.removeFromFavorites)
  const setFavoriteProgress = useAnimeStore((s) => s.setFavoriteProgress)
  const hydrateFavoritesFromRemote = useAnimeStore((s) => s.hydrateFavoritesFromRemote)

  const { data: remoteRows = [], isLoading: remoteLoading } = useQuery({
    queryKey: queryKeys.userAnimeList(telegramUserId ?? 0),
    queryFn: () => getUserAnimeList(telegramUserId!),
    enabled: isReady && typeof telegramUserId === 'number',
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!isReady || typeof telegramUserId !== 'number') return
    if (remoteLoading) return
    if (syncedRef.current) return

    syncedRef.current = true

    const localIds = favoriteAnime.map(String)
    const localProgressSnapshot = { ...favoriteProgress }
    const remoteIdSet = new Set(remoteRows.map((r) => String(r.anime_id)))

    hydrateFavoritesFromRemote(
      remoteRows.map((row) => ({
        animeId: row.anime_id,
        progress: toProgress(row),
      }))
    )

    const localOnly = localIds.filter((id) => !remoteIdSet.has(id))
    if (localOnly.length === 0) return

    void (async () => {
      for (const id of localOnly) {
        const progress = localProgressSnapshot[id] ?? { episodesWatched: 0, userRating: null }
        try {
          await upsertUserAnimeListEntry(telegramUserId, id, {
            episodes_watched: progress.episodesWatched,
            user_rating: progress.userRating,
          })
        } catch (e) {
          if (import.meta.env.DEV) console.warn('sync local favorite:', e)
        }
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.userAnimeList(telegramUserId),
      })
    })()
  }, [
    isReady,
    telegramUserId,
    remoteLoading,
    remoteRows,
    favoriteAnime,
    favoriteProgress,
    hydrateFavoritesFromRemote,
    queryClient,
  ])

  useEffect(() => {
    syncedRef.current = false
  }, [telegramUserId])

  const stats = useMemo(() => {
    const rows = favoriteAnime.map((animeId) => {
      const key = String(animeId)
      const progress = favoriteProgress[key] ?? { episodesWatched: 0, userRating: null }
      return {
        anime_id: animeId,
        episodes_watched: progress.episodesWatched,
        user_rating: progress.userRating,
      }
    })
    return computeUserListStats(rows)
  }, [favoriteAnime, favoriteProgress])

  const getProgress = useCallback(
    (animeId: number | string): FavoriteProgress =>
      favoriteProgress[String(animeId)] ?? { episodesWatched: 0, userRating: null },
    [favoriteProgress]
  )

  const saveMutation = useMutation({
    mutationFn: async ({
      animeId,
      progress,
    }: {
      animeId: number | string
      progress: FavoriteProgress
    }) => {
      if (typeof telegramUserId === 'number') {
        await upsertUserAnimeListEntry(telegramUserId, animeId, {
          episodes_watched: progress.episodesWatched,
          user_rating: progress.userRating,
        })
      }
      setFavoriteProgress(animeId, progress)
    },
    onSuccess: (_data, variables) => {
      if (typeof telegramUserId === 'number') {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.userAnimeList(telegramUserId),
        })
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.animeDetail(variables.animeId),
      })
    },
  })

  const addFavoriteMutation = useMutation({
    mutationFn: async (animeId: number | string) => {
      addToFavorites(animeId)
      if (typeof telegramUserId === 'number') {
        await upsertUserAnimeListEntry(telegramUserId, animeId, {
          episodes_watched: 0,
          user_rating: null,
        })
      }
    },
    onSuccess: (_data, animeId) => {
      if (typeof telegramUserId === 'number') {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.userAnimeList(telegramUserId),
        })
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.animeFavoriteCounts })
      void queryClient.invalidateQueries({ queryKey: queryKeys.animeFavoriteCount(animeId) })
    },
  })

  const removeFavoriteMutation = useMutation({
    mutationFn: async (animeId: number | string) => {
      removeFromFavorites(animeId)
      if (typeof telegramUserId === 'number') {
        await removeUserAnimeListEntry(telegramUserId, animeId)
      }
    },
    onSuccess: (_data, animeId) => {
      if (typeof telegramUserId === 'number') {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.userAnimeList(telegramUserId),
        })
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.animeFavoriteCounts })
      void queryClient.invalidateQueries({ queryKey: queryKeys.animeFavoriteCount(animeId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.animeDetail(animeId) })
    },
  })

  const toggleFavorite = useCallback(
    (animeId: number | string) => {
      const isFav = favoriteAnime.some((id) => String(id) === String(animeId))
      if (isFav) removeFavoriteMutation.mutate(animeId)
      else addFavoriteMutation.mutate(animeId)
    },
    [favoriteAnime, addFavoriteMutation, removeFavoriteMutation]
  )

  const isFavorite = useCallback(
    (animeId: number | string) => favoriteAnime.some((id) => String(id) === String(animeId)),
    [favoriteAnime]
  )

  const saveProgress = useCallback(
    (animeId: number | string, progress: FavoriteProgress) =>
      saveMutation.mutateAsync({ animeId, progress }),
    [saveMutation]
  )

  return {
    favoriteAnime,
    stats,
    getProgress,
    saveProgress,
    toggleFavorite,
    isFavorite,
    isSaving: saveMutation.isPending,
    hasTelegramUser: typeof telegramUserId === 'number',
  }
}
