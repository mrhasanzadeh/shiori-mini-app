import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GenreItem } from '../services/supabaseAnime'

export interface AnimeListItem {
  id: number | string
  title: string
  image: string
  description: string
  status: string
  genres: GenreItem[]
  episodes: number
  isNew: boolean
  episode: string
}

export type FavoriteProgress = {
  episodesWatched: number
  userRating: number | null
}

interface AnimeState {
  animeList: AnimeListItem[]
  favoriteAnime: (number | string)[]
  favoriteProgress: Record<string, FavoriteProgress>
  addToFavorites: (animeId: number | string) => void
  removeFromFavorites: (animeId: number | string) => void
  setFavoriteProgress: (animeId: number | string, progress: FavoriteProgress) => void
  hydrateFavoritesFromRemote: (
    entries: Array<{ animeId: number | string; progress: FavoriteProgress }>
  ) => void
  setAnimeList: (animeList: AnimeListItem[]) => void
}

const defaultProgress = (): FavoriteProgress => ({
  episodesWatched: 0,
  userRating: null,
})

export const useAnimeStore = create<AnimeState>()(
  persist(
    (set) => ({
      animeList: [],
      favoriteAnime: [],
      favoriteProgress: {},
      addToFavorites: (animeId) =>
        set((state) => {
          const key = String(animeId)
          const already = state.favoriteAnime.some((id) => String(id) === key)
          return {
            favoriteAnime: already ? state.favoriteAnime : [...state.favoriteAnime, animeId],
            favoriteProgress: already
              ? state.favoriteProgress
              : { ...state.favoriteProgress, [key]: defaultProgress() },
          }
        }),
      removeFromFavorites: (animeId) =>
        set((state) => {
          const key = String(animeId)
          const nextProgress = { ...state.favoriteProgress }
          delete nextProgress[key]
          return {
            favoriteAnime: state.favoriteAnime.filter((id) => String(id) !== key),
            favoriteProgress: nextProgress,
          }
        }),
      setFavoriteProgress: (animeId, progress) =>
        set((state) => ({
          favoriteProgress: {
            ...state.favoriteProgress,
            [String(animeId)]: progress,
          },
        })),
      hydrateFavoritesFromRemote: (entries) =>
        set(() => ({
          favoriteAnime: entries.map((e) => e.animeId),
          favoriteProgress: Object.fromEntries(
            entries.map((e) => [String(e.animeId), e.progress])
          ),
        })),
      setAnimeList: (animeList) => set({ animeList }),
    }),
    {
      name: 'anime-storage',
      version: 2,
      migrate: (persisted: unknown) => {
        const state = persisted as Partial<AnimeState> | undefined
        return {
          animeList: state?.animeList ?? [],
          favoriteAnime: state?.favoriteAnime ?? [],
          favoriteProgress: state?.favoriteProgress ?? {},
        }
      },
    }
  )
)
